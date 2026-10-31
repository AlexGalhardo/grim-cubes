import { addComponent, query } from "bitecs";
import {
	Armor,
	Behavior,
	ContactDamage,
	EnemyFaction,
	EnemyType,
	Health,
	Position,
	PrevPosition,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import { type GameWorld, spawn } from "../ecs/world";
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
}

export interface SpawnWeight {
	/** Index into the `enemies` array. */
	type: number;
	weight: number;
}

export interface SpawnRoundOptions {
	pool: readonly SpawnWeight[];
	difficultyMult: number;
}

export interface SpawnSystemDeps {
	config: SpawnConfig;
	enemies: readonly EnemyDef[];
	rng: { float(a: number, b: number): number; chance(p: number): boolean };
	/** Rejects a candidate position (relative coordinates), e.g. inside a blocking prop. */
	isBlocked?: (x: number, z: number) => boolean;
}

export interface SpawnSystem {
	startRound(round: number, options: SpawnRoundOptions): void;
	run(world: GameWorld, hero: number): void;
	readonly remaining: number;
	readonly spawned: number;
}

const ENEMY_TERMS = [EnemyFaction];
const MAX_PLACEMENT_TRIES = 4;

export const spawnTotal = (c: SpawnConfig, round: number): number => c.totalBase + c.totalPerRound * round;
export const spawnIntervalSeconds = (c: SpawnConfig, round: number): number =>
	Math.max(c.intervalMinSeconds, c.intervalStartSeconds - c.intervalPerRound * round);
export const spawnBurst = (c: SpawnConfig, round: number): number =>
	c.burstBase + Math.floor(round / c.burstRoundDivisor);

export function createSpawnSystem(deps: SpawnSystemDeps): SpawnSystem {
	const { config, enemies, rng, isBlocked } = deps;
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

	function create(world: GameWorld, typeIndex: number, hero: number): void {
		const def = enemies[typeIndex];
		if (def === undefined) throw new RangeError(`unknown enemy type ${typeIndex}`);
		place(
			Position.x[hero] ?? 0,
			Position.z[hero] ?? 0,
			Velocity.x[hero] ?? 0,
			Velocity.z[hero] ?? 0,
			spot,
		);
		const e = spawn(world);
		for (const c of [
			EnemyFaction,
			Position,
			PrevPosition,
			Velocity,
			Radius,
			Health,
			Speed,
			ContactDamage,
		]) {
			addComponent(world, e, c);
		}
		addComponent(world, e, EnemyType);
		addComponent(world, e, Behavior);
		addComponent(world, e, Armor);
		Position.x[e] = PrevPosition.x[e] = spot.x;
		Position.z[e] = PrevPosition.z[e] = spot.z;
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
		spawned++;
	}

	return {
		startRound(n: number, options: SpawnRoundOptions): void {
			round = n;
			remaining = spawnTotal(config, n);
			spawned = 0;
			difficulty = options.difficultyMult;
			intervalSteps = Math.max(1, Math.round(spawnIntervalSeconds(config, n) / STEP));
			burst = spawnBurst(config, n);
			timer = intervalSteps;
			pool = options.pool;
			poolTotal = pool.reduce((sum, p) => sum + p.weight, 0);
		},
		run(world: GameWorld, hero: number): void {
			if (remaining === 0) return;
			if (timer > 0) timer--;
			if (timer > 0) return;
			const alive = query(world, ENEMY_TERMS).length;
			const n = Math.min(burst, remaining, config.maxSimultaneous - alive);
			if (n <= 0) return;
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
