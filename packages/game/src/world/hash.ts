import { Behavior, EnemyType, Fragment, Health, Position, Velocity } from "../ecs/components";
import type { GameWorld } from "../ecs/world";
import { queryBodies } from "./queries";

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const view = new DataView(new ArrayBuffer(4));

function mix(h: number, bits: number): number {
	let out = h;
	for (let shift = 0; shift < 32; shift += 8) out = Math.imul(out ^ ((bits >>> shift) & 0xff), FNV_PRIME);
	return out >>> 0;
}

function mixFloat(h: number, value: number): number {
	view.setFloat32(0, value, true);
	return mix(h, view.getUint32(0, true));
}

/**
 * FNV-1a over the simulation state of every body (SDD 11 section 2, determinism test): id, position, velocity,
 * HP, enemy type, behavior timer and fragment value, in entity-id order. Render-only fields are left out.
 * Not for the hot path: it allocates a sorted copy of the entity list.
 */
export function hashWorld(world: GameWorld): number {
	const ids = Array.from(queryBodies(world)).sort((a, b) => a - b);
	let h = FNV_OFFSET;
	for (const e of ids) {
		h = mix(h, e);
		h = mixFloat(h, Position.x[e] ?? 0);
		h = mixFloat(h, Position.z[e] ?? 0);
		h = mixFloat(h, Velocity.x[e] ?? 0);
		h = mixFloat(h, Velocity.z[e] ?? 0);
		h = mixFloat(h, Health.hp[e] ?? 0);
		h = mix(h, EnemyType.id[e] ?? 0);
		h = mix(h, Behavior.timer[e] ?? 0);
		h = mix(h, Fragment.value[e] ?? 0);
	}
	return h;
}
