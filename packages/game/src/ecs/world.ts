import {
	addComponent,
	addEntity,
	commitRemovals,
	createEntityIndex,
	createWorld,
	type Query,
	type QueryTerm,
	registerQuery,
	removeEntity,
	type World,
} from "bitecs";
import { MAX_ENTITIES, Position, PrevPosition, resetComponents } from "./components";

export type GameWorld = World;

export function createGameWorld(): GameWorld {
	return createWorld(createEntityIndex());
}

/** Entities are recycled by bitecs; the component arrays are fixed at MAX_ENTITIES and zeroed on reuse. */
export function spawn(world: GameWorld): number {
	const eid = addEntity(world);
	if (eid >= MAX_ENTITIES) {
		removeEntity(world, eid);
		throw new RangeError(`entity limit reached (${MAX_ENTITIES})`);
	}
	resetComponents(eid);
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

/**
 * Per-step system queries: bitecs `query()` allocates on every call, a registered query does not.
 * The returned function applies pending removals and yields the live dense array (do not mutate).
 */
export function createQueryCache(terms: QueryTerm[]): (world: GameWorld) => readonly number[] {
	let owner: GameWorld | null = null;
	let registered: Query | null = null;
	return (world) => {
		if (registered === null || owner !== world) {
			owner = world;
			registered = registerQuery(world, terms);
		}
		commitRemovals(world);
		return registered.dense as readonly number[];
	};
}
