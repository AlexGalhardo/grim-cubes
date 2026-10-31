import { EnemyFaction, PlayerFaction, Position, PrevPosition } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";

const heroList = createQueryCache([PlayerFaction, Position]);
const bodyList = createQueryCache([Position, PrevPosition]);
const enemyList = createQueryCache([EnemyFaction, Position, PrevPosition]);

/** First entity tagged PlayerFaction, or -1. */
export function findHero(world: GameWorld): number {
	return heroList(world)[0] ?? -1;
}

/** Every entity with Position and PrevPosition. The array is owned by bitecs: read it, never keep it. */
export function queryBodies(world: GameWorld): readonly number[] {
	return bodyList(world);
}

/** Live enemies with a body. Same ownership rules as `queryBodies`. */
export function queryEnemies(world: GameWorld): readonly number[] {
	return enemyList(world);
}
