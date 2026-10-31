import { Position, PrevPosition } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
import type { WorldConfig } from "./chunkSystem";
import { queryBodies } from "./queries";

/** Absolute world position of the render origin (f64). Position/PrevPosition are relative to it. */
export interface Origin {
	x: number;
	z: number;
}

export type OriginShiftConfig = Pick<WorldConfig, "chunkSize" | "originShiftThreshold">;

export function createOrigin(): Origin {
	return { x: 0, z: 0 };
}

/**
 * Keeps f32 coordinates small: when the hero is farther than `originShiftThreshold` from the origin on an axis,
 * the origin moves by the hero offset rounded to a whole chunk and every body is shifted by the opposite delta.
 * Subtracting a multiple of 16 from an f32 of smaller result magnitude is exact, so relative distances survive.
 * Must run inside `simulate`, after movement and before the render reads the world.
 */
export function applyOriginShift(
	world: GameWorld,
	origin: Origin,
	hero: number,
	events: EventBuffer,
	config: OriginShiftConfig,
): boolean {
	const hx = Position.x[hero] ?? 0;
	const hz = Position.z[hero] ?? 0;
	const limit = config.originShiftThreshold;
	const dx = Math.abs(hx) > limit ? Math.round(hx / config.chunkSize) * config.chunkSize : 0;
	const dz = Math.abs(hz) > limit ? Math.round(hz / config.chunkSize) * config.chunkSize : 0;
	if (dx === 0 && dz === 0) return false;

	origin.x += dx;
	origin.z += dz;
	const bodies = queryBodies(world);
	for (let i = 0; i < bodies.length; i++) {
		const eid = bodies[i] ?? 0;
		Position.x[eid] = (Position.x[eid] ?? 0) - dx;
		Position.z[eid] = (Position.z[eid] ?? 0) - dz;
		PrevPosition.x[eid] = (PrevPosition.x[eid] ?? 0) - dx;
		PrevPosition.z[eid] = (PrevPosition.z[eid] ?? 0) - dz;
	}
	events.push(EventType.OriginShifted, dx, dz, 0, hero);
	return true;
}
