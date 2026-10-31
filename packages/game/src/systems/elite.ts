import { addComponent, hasComponent } from "bitecs";
import type { ElitesData } from "../data/types";
import { dropChest } from "../ecs/chest";
import { Armor, Elite, Health, Position, Radius, Speed } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import { createEliteRoller, type EliteRng, eliteStats } from "../rules/elite";
import type { DamageQueue } from "./damage";
import type { SpawnSystem, SpawnWeight } from "./spawn";

export interface EliteSystemDeps {
	config: ElitesData;
	spawn: SpawnSystem;
	events: EventBuffer;
	queue: DamageQueue;
	/** The `elite` RNG stream. */
	rng: EliteRng & { float(a: number, b: number): number; int(n: number): number };
	/** Common enemy types of the current biome, as for the spawner. */
	pool: (round: number) => readonly SpawnWeight[];
	/** Spawn ring in u (`rounds.json` `spawn.ringMin` / `ringMax`). */
	ring: { min: number; max: number };
	hero: number;
}

export interface EliteSystem {
	/** Wire to the run system's `onRoundStart`: rolls the elite for this round and arms its entry timer. */
	onRoundStart(round: number, boss: boolean): void;
	/** Counts down the entry delay; spawns the elite when it elapses. Call once per combat step. */
	run(world: GameWorld): void;
	/** Spawns an elite right now at (x, z) with modifier index `modifier` (random when omitted). Returns the entity. */
	spawnNow(world: GameWorld, x: number, z: number, modifier?: number): number;
	/** Wire to the death system's `onDeath`: chest drop and death explosion for elites. */
	handleDeath(world: GameWorld, enemy: number, x: number, z: number): void;
	/** Wire to the damage system's `onHeroHit`: vampiric elites heal on what they deal. */
	handleHeroHit(source: number, taken: number): void;
	/** True while an elite is armed for this round and has not entered yet. */
	readonly pending: boolean;
}

/** Warning event lead time before the elite enters (GDD 11 audio cue). */
const INCOMING_LEAD_STEPS = 120;

export function createEliteSystem(deps: EliteSystemDeps): EliteSystem {
	const { config, spawn, events, queue, rng, pool, ring, hero } = deps;
	const roller = createEliteRoller(rng, config);
	const delaySteps = Math.round(config.entryDelaySeconds / STEP);
	let round = 0;
	let timer = -1;
	let announced = false;

	function pickType(): number {
		const entries = pool(round);
		const total = entries.reduce((sum, e) => sum + e.weight, 0);
		let roll = rng.float(0, total);
		for (const entry of entries) {
			roll -= entry.weight;
			if (roll < 0) return entry.type;
		}
		return entries[entries.length - 1]?.type ?? 0;
	}

	function spawnNow(world: GameWorld, x: number, z: number, modifier?: number): number {
		const index = modifier ?? rng.int(config.modifiers.length);
		const def = config.modifiers[index];
		if (!def) throw new RangeError(`unknown elite modifier ${index}`);
		const stats = eliteStats(def, round);
		const e = spawn.spawnEnemy(world, pickType(), x, z);
		addComponent(world, e, Elite);
		Elite.modifier[e] = index + 1;
		Health.hp[e] = Health.max[e] = (Health.max[e] ?? 0) * stats.hpMult;
		Radius.r[e] = (Radius.r[e] ?? 0) * config.scale;
		Speed.value[e] = (Speed.value[e] ?? 0) * stats.speedMult;
		Armor.value[e] = (Armor.value[e] ?? 0) + stats.armorAdd;
		events.push(EventType.EliteSpawned, x, z, index + 1, e);
		return e;
	}

	return {
		get pending(): boolean {
			return timer >= 0;
		},
		onRoundStart(n: number, boss: boolean): void {
			round = n;
			announced = false;
			timer = roller.next(n, boss) ? delaySteps : -1;
		},
		run(world: GameWorld): void {
			if (timer < 0) return;
			if (!announced && timer <= INCOMING_LEAD_STEPS) {
				announced = true;
				events.push(EventType.EliteIncoming, 0, 0, 0, 0);
			}
			if (--timer > 0) return;
			timer = -1;
			const angle = rng.float(0, Math.PI * 2);
			const dist = rng.float(ring.min, ring.max);
			spawnNow(
				world,
				(Position.x[hero] ?? 0) + Math.cos(angle) * dist,
				(Position.z[hero] ?? 0) + Math.sin(angle) * dist,
			);
		},
		spawnNow,
		handleDeath(world: GameWorld, e: number, x: number, z: number): void {
			if (!hasComponent(world, e, Elite)) return;
			const def = config.modifiers[(Elite.modifier[e] ?? 0) - 1];
			const boom = def ? eliteStats(def, round).explosion : null;
			if (boom) {
				const dist = Math.hypot((Position.x[hero] ?? 0) - x, (Position.z[hero] ?? 0) - z);
				if (dist <= boom.radius + (Radius.r[hero] ?? 0)) queue.push(hero, boom.damage, e, 0, 0, 0);
				events.push(EventType.Exploded, x, z, boom.radius, e);
			}
			dropChest(
				world,
				x,
				z,
				config.reward.chest.tier,
				config.reward.chest.offered,
				config.reward.chest.picks,
			);
			events.push(EventType.ChestDropped, x, z, 0, 0);
		},
		handleHeroHit(source: number, taken: number): void {
			if (source <= 0 || (Elite.modifier[source] ?? 0) === 0) return;
			const def = config.modifiers[(Elite.modifier[source] ?? 0) - 1];
			const steal = def?.lifestealOfDamage ?? 0;
			if (steal > 0)
				Health.hp[source] = Math.min(
					(Health.hp[source] ?? 0) + taken * steal,
					Health.max[source] ?? 0,
				);
		},
	};
}
