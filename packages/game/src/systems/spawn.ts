import { addComponent, hasComponent, removeEntity } from "bitecs";
import {
	Armor,
	Behavior,
	Boss,
	ContactCooldown,
	ContactDamage,
	Elite,
	EnemyFaction,
	EnemyType,
	Health,
	KnockbackResist,
	Position,
	PrevHealth,
	PrevPosition,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { createQueryCache, type GameWorld, spawn } from "../ecs/world";
import { STEP } from "../loop";

/** `data/rounds.json` `spawn` block. */
export interface SpawnConfig {
	totalBase: number;
	totalPerRound: number;
	intervalStartSeconds: number;
	intervalPerRound: number;
	intervalMinSeconds: number;
	burstBase: number;
	burstRoundDivisor: number;
	maxSimultaneous: number;
	ringMin: number;
	ringMax: number;
	oppositeBias: number;
}

/** One entry of `data/enemies.json` with `behavior` already mapped to a numeric kind. */
export interface EnemyDef {
	radius: number;
	hpBase: number;
	hpPerRound: number;
	damageBase: number;
	damagePerRound: number;
	speed: number;
	armor: number;
	behavior: number;
	/** Fraction of knockback taken (default 1). */
	knockbackTakenMult?: number;
}

export interface SpawnWeight {
	/** Index into the `enemies` array. */
	type: number;
	weight: number;
}

export interface SpawnRoundOptions {
	pool: readonly SpawnWeight[];
	difficultyMult: number;
	/** Boss rounds spawn a fraction of the normal total (default 1). */
	totalScale?: number;
	/** Boss rounds space bursts further apart (default 1). */
	intervalScale?: number;
}

export interface SpawnSystemDeps {
	config: SpawnConfig;
	enemies: readonly EnemyDef[];
	rng: { float(a: number, b: number): number; chance(p: number): boolean };
	/** Rejects a candidate position (relative coordinates), e.g. inside a blocking prop. */
	isBlocked?: (x: number, z: number) => boolean;
	/** Called for every created enemy with its position (relative coordinates). */
	onSpawn?: (world: GameWorld, x: number, z: number) => void;
	/** Receives `Died` (b = 1, no drop) for enemies culled at the simultaneous cap. */
	events?: EventBuffer;
}

export interface SpawnSystem {
	startRound(round: number, options: SpawnRoundOptions): void;
	/** Creates one extra enemy at (x, z) outside the round budget (elites, summons). */
	spawnEnemy(world: GameWorld, typeIndex: number, x: number, z: number): number;
	run(world: GameWorld, hero: number): void;
	readonly remaining: number;
	readonly spawned: number;
}

const enemyList = createQueryCache([EnemyFaction]);
const ENEMY_COMPONENTS = [
	EnemyFaction,
	Position,
	PrevPosition,
	Velocity,
	Radius,
	Health,
	Speed,
	ContactDamage,
	EnemyType,
	Behavior,
	Armor,
] as const;
const MAX_PLACEMENT_TRIES = 16;

export const spawnTotal = (c: SpawnConfig, round: number): number => c.totalBase + c.totalPerRound * round;
export const spawnIntervalSeconds = (c: SpawnConfig, round: number): number =>
	Math.max(c.intervalMinSeconds, c.intervalStartSeconds - c.intervalPerRound * round);
export const spawnBurst = (c: SpawnConfig, round: number): number =>
	c.burstBase + Math.floor(round / c.burstRoundDivisor);

export function createSpawnSystem(deps: SpawnSystemDeps): SpawnSystem {
	const { config, enemies, rng, isBlocked, onSpawn, events } = deps;
	let round = 1;
	let remaining = 0;
	let spawned = 0;
	let difficulty = 1;
	let intervalSteps = 1;
	let burst = 1;
	let timer = 0;
	let pool: readonly SpawnWeight[] = [];
	let poolTotal = 0;

	function pickType(): number {
		let roll = rng.float(0, poolTotal);
		for (let i = 0; i < pool.length; i++) {
			const entry = pool[i];
			if (entry === undefined) continue;
			roll -= entry.weight;
			if (roll < 0) return entry.type;
		}
		return pool[pool.length - 1]?.type ?? 0;
	}

	function place(hx: number, hz: number, vx: number, vz: number, out: { x: number; z: number }): void {
		const moving = vx !== 0 || vz !== 0;
		for (let attempt = 0; attempt < MAX_PLACEMENT_TRIES; attempt++) {
			const angle =
				moving && rng.chance(config.oppositeBias)
					? Math.atan2(-vz, -vx) + rng.float(-Math.PI / 2, Math.PI / 2)
					: rng.float(0, Math.PI * 2);
			const dist = rng.float(config.ringMin, config.ringMax);
			out.x = hx + Math.cos(angle) * dist;
			out.z = hz + Math.sin(angle) * dist;
			if (!isBlocked?.(out.x, out.z)) return;
		}
	}

	const spot = { x: 0, z: 0 };

	/** GDD 6.4: at the cap, the next spawn removes the farthest common enemy, without drops. */
	function cullFarthest(world: GameWorld, hero: number): boolean {
		const live = enemyList(world);
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		let farthest = -1;
		let best = -1;
		for (let i = 0; i < live.length; i++) {
			const e = live[i] ?? 0;
			if (hasComponent(world, e, Boss) || hasComponent(world, e, Elite)) continue;
			const d = (Position.x[e] ?? 0) - hx;
			const dz = (Position.z[e] ?? 0) - hz;
			const dist = d * d + dz * dz;
			if (dist > best) {
				best = dist;
				farthest = e;
			}
		}
		if (farthest < 0) return false;
		events?.push(EventType.Died, 0, 1, 0, farthest);
		removeEntity(world, farthest);
		return true;
	}

	/** Builds an enemy entity at (x, z) without touching the round counters. */
	function build(world: GameWorld, typeIndex: number, x: number, z: number): number {
		const def = enemies[typeIndex];
		if (def === undefined) throw new RangeError(`unknown enemy type ${typeIndex}`);
		const e = spawn(world);
		for (let i = 0; i < ENEMY_COMPONENTS.length; i++)
			addComponent(world, e, ENEMY_COMPONENTS[i] as object);
		Position.x[e] = PrevPosition.x[e] = x;
		Position.z[e] = PrevPosition.z[e] = z;
		Velocity.x[e] = 0;
		Velocity.z[e] = 0;
		Radius.r[e] = def.radius;
		const hp = (def.hpBase + (round - 1) * def.hpPerRound) * difficulty;
		Health.hp[e] = Health.max[e] = hp;
		ContactDamage.value[e] = (def.damageBase + (round - 1) * def.damagePerRound) * difficulty;
		Speed.value[e] = def.speed;
		Armor.value[e] = def.armor;
		EnemyType.id[e] = typeIndex;
		Behavior.kind[e] = def.behavior;
		Behavior.state[e] = 0;
		Behavior.timer[e] = 0;
		ContactCooldown.ticks[e] = 0;
		KnockbackResist.value[e] = 1 - (def.knockbackTakenMult ?? 1);
		PrevHealth.hp[e] = Health.hp[e] ?? 0;
		return e;
	}

	function create(world: GameWorld, typeIndex: number, hero: number): void {
		place(
			Position.x[hero] ?? 0,
			Position.z[hero] ?? 0,
			Velocity.x[hero] ?? 0,
			Velocity.z[hero] ?? 0,
			spot,
		);
		build(world, typeIndex, spot.x, spot.z);
		spawned++;
		onSpawn?.(world, spot.x, spot.z);
	}

	return {
		startRound(n: number, options: SpawnRoundOptions): void {
			round = n;
			remaining = Math.round(spawnTotal(config, n) * (options.totalScale ?? 1));
			spawned = 0;
			difficulty = options.difficultyMult;
			intervalSteps = Math.max(
				1,
				Math.round((spawnIntervalSeconds(config, n) * (options.intervalScale ?? 1)) / STEP),
			);
			burst = spawnBurst(config, n);
			timer = intervalSteps;
			pool = options.pool;
			poolTotal = pool.reduce((sum, p) => sum + p.weight, 0);
		},
		spawnEnemy(world: GameWorld, typeIndex: number, x: number, z: number): number {
			return build(world, typeIndex, x, z);
		},
		run(world: GameWorld, hero: number): void {
			if (remaining === 0) return;
			if (timer > 0) timer--;
			if (timer > 0) return;
			let n = Math.min(burst, remaining);
			// Cull before creating, so a burst never culls its own fresh spawns (they are the farthest).
			const over = enemyList(world).length + n - config.maxSimultaneous;
			for (let i = 0; i < over; i++) {
				if (!cullFarthest(world, hero)) n--;
			}
			for (let i = 0; i < n; i++) create(world, pickType(), hero);
			remaining -= n;
			timer = intervalSteps;
		},
		get remaining(): number {
			return remaining;
		},
		get spawned(): number {
			return spawned;
		},
	};
}
