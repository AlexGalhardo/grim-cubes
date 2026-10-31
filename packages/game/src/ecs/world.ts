import { addComponent, addEntity, createEntityIndex, createWorld, removeEntity, type World } from "bitecs";
import { MAX_ENTITIES, Position, PrevPosition } from "./components";

export type GameWorld = World;

export function createGameWorld(): GameWorld {
	return createWorld(createEntityIndex());
}

/** Entities are recycled by bitecs; the component arrays are fixed at MAX_ENTITIES. */
export function spawn(world: GameWorld): number {
	const eid = addEntity(world);
	if (eid >= MAX_ENTITIES) {
		removeEntity(world, eid);
		throw new RangeError(`entity limit reached (${MAX_ENTITIES})`);
	}
	return eid;
}

export function spawnBody(world: GameWorld, x: number, z: number): number {
	const eid = spawn(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, PrevPosition);
	Position.x[eid] = PrevPosition.x[eid] = x;
	Position.z[eid] = PrevPosition.z[eid] = z;
	return eid;
}
