import type { SpatialHash } from "@gc/core";
import { addComponent, removeEntity } from "bitecs";
import type { ConsumablesData } from "../data/types";
import { Breakable, Consumable, Health, Position, PrevPosition, Radius } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { createQueryCache, type GameWorld, spawn } from "../ecs/world";
import { PROP_KIND } from "../world/chunkGen";
import type { ChunkData, ChunkSystem } from "../world/chunkSystem";
import type { Origin } from "../world/originShift";

export interface BreakableDeps {
	world: GameWorld;
	chunks: ChunkSystem;
	chunkSize: number;
	origin: Origin;
	/** Radius and hit points by prop type id (the order of `ChunkData.propType`). */
	types: readonly { radius: number; hp: number }[];
	config: ConsumablesData;
	/** The `loot` stream. */
	rng: { float(a: number, b: number): number };
	events: EventBuffer;
	/** Bone magnet: every fragment on the floor flies to the hero for this long. */
	pullFragments(seconds: number): void;
}

export interface BreakableSystem {
	/** Run each step: gives newly loaded chunks their breakable entities. */
	populate(): void;
	/** Wire to `createChunkSystem` hooks: the chunk's entities go with it. */
	release(chunk: ChunkData): void;
	/** Puts the live breakables in the enemy spatial hash so weapons and projectiles can hit them. */
	insertInto(hash: SpatialHash): void;
	/** Breaks what ran out of HP: `PropBroken`, memory in the chunk, a consumable maybe. */
	run(): void;
	/** Picks consumables up when the hero walks over them. */
	collect(hero: number): void;
}

const live = createQueryCache([Breakable, Position, Health, Radius]);
const drops = createQueryCache([Consumable, Position]);

export const CONSUMABLE_KIND = { bloodVial: 1, boneMagnet: 2 } as const;

/** Breakable props as entities (A-02-04): destructible by weapons, drop the GDD 15.4 consumables. */
export function createBreakableSystem(deps: BreakableDeps): BreakableSystem {
	const { world, chunks, chunkSize, origin, types, config, rng, events } = deps;
	const byChunk = new Map<ChunkData, number[]>();
	const totalWeight = config.kinds.reduce((sum, k) => sum + k.weight, 0);

	function dropAt(x: number, z: number): void {
		if (totalWeight <= 0 || rng.float(0, 1) >= config.dropChance.breakable) return;
		let roll = rng.float(0, totalWeight);
		let kind = 0;
		for (const [i, k] of config.kinds.entries()) {
			roll -= k.weight;
			if (roll < 0) {
				kind = i;
				break;
			}
		}
		const id =
			config.kinds[kind]?.id === "bone_magnet" ? CONSUMABLE_KIND.boneMagnet : CONSUMABLE_KIND.bloodVial;
		const e = spawn(world);
		addComponent(world, e, Consumable);
		addComponent(world, e, Position);
		addComponent(world, e, PrevPosition);
		Position.x[e] = PrevPosition.x[e] = x;
		Position.z[e] = PrevPosition.z[e] = z;
		Consumable.kind[e] = id;
		events.push(EventType.ConsumableDropped, x, z, id, e);
	}

	function populateChunk(chunk: ChunkData): void {
		chunk.populated = true;
		const list: number[] = [];
		for (let p = 0; p < chunk.propCount; p++) {
			if (chunk.propKind[p] !== PROP_KIND.breakable || (chunk.broken >> p) & 1) continue;
			const type = types[chunk.propType[p] ?? 0];
			if (!type || type.hp <= 0) continue;
			const e = spawn(world);
			addComponent(world, e, Breakable);
			addComponent(world, e, Position);
			addComponent(world, e, PrevPosition);
			addComponent(world, e, Health);
			addComponent(world, e, Radius);
			const x = chunk.cx * chunkSize + (chunk.propX[p] ?? 0) - origin.x;
			const z = chunk.cz * chunkSize + (chunk.propZ[p] ?? 0) - origin.z;
			Position.x[e] = PrevPosition.x[e] = x;
			Position.z[e] = PrevPosition.z[e] = z;
			Health.hp[e] = Health.max[e] = type.hp;
			Radius.r[e] = type.radius;
			Breakable.cx[e] = chunk.cx;
			Breakable.cz[e] = chunk.cz;
			Breakable.index[e] = p;
			Breakable.type[e] = chunk.propType[p] ?? 0;
			list.push(e);
		}
		byChunk.set(chunk, list);
	}

	return {
		populate(): void {
			for (const chunk of chunks.slots) {
				if (chunk && !chunk.populated) populateChunk(chunk);
			}
		},
		release(chunk: ChunkData): void {
			const list = byChunk.get(chunk);
			if (!list) return;
			for (const e of list) removeEntity(world, e);
			byChunk.delete(chunk);
		},
		insertInto(hash: SpatialHash): void {
			const list = live(world);
			for (let i = 0; i < list.length; i++) {
				const e = list[i] ?? 0;
				hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
			}
		},
		run(): void {
			const list = live(world);
			for (let i = list.length - 1; i >= 0; i--) {
				const e = list[i] ?? 0;
				if ((Health.hp[e] ?? 0) > 0) continue;
				const x = Position.x[e] ?? 0;
				const z = Position.z[e] ?? 0;
				const index = Breakable.index[e] ?? 0;
				const chunk = chunks.get(Breakable.cx[e] ?? 0, Breakable.cz[e] ?? 0);
				if (chunk) {
					chunk.broken |= 1 << index;
					const owned = byChunk.get(chunk);
					const at = owned?.indexOf(e) ?? -1;
					if (owned && at >= 0) owned.splice(at, 1);
				}
				events.push(EventType.PropBroken, x, z, index, Breakable.type[e] ?? 0);
				removeEntity(world, e);
				dropAt(x, z);
			}
		},
		collect(hero: number): void {
			const list = drops(world);
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const reach = config.pickupRadius + (Radius.r[hero] ?? 0);
			for (let i = list.length - 1; i >= 0; i--) {
				const e = list[i] ?? 0;
				if (Math.hypot((Position.x[e] ?? 0) - hx, (Position.z[e] ?? 0) - hz) > reach) continue;
				const kind = Consumable.kind[e] ?? 0;
				if (kind === CONSUMABLE_KIND.bloodVial) {
					const heal = config.kinds.find((k) => k.id === "blood_vial")?.healFraction ?? 0;
					Health.hp[hero] = Math.min(
						(Health.hp[hero] ?? 0) + (Health.max[hero] ?? 0) * heal,
						Health.max[hero] ?? 0,
					);
				} else {
					deps.pullFragments(config.kinds.find((k) => k.id === "bone_magnet")?.pullSeconds ?? 0);
				}
				events.push(EventType.ConsumablePicked, kind, 0, 0, hero);
				removeEntity(world, e);
			}
		},
	};
}
