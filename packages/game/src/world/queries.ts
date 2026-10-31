import {
	Consumable,
	Egg,
	Elite,
	EnemyFaction,
	EnemyShot,
	Fragment,
	PlayerFaction,
	Position,
	PrevPosition,
	Projectile,
} from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";

const heroList = createQueryCache([PlayerFaction, Position]);
const bodyList = createQueryCache([Position, PrevPosition]);
const projectileList = createQueryCache([Projectile, Position, PrevPosition]);
const fragmentList = createQueryCache([Fragment, Position, PrevPosition]);
const enemyShotList = createQueryCache([EnemyShot, Position, PrevPosition]);
const consumableList = createQueryCache([Consumable, Position, PrevPosition]);
const eliteList = createQueryCache([Elite, Position, PrevPosition]);
const eggList = createQueryCache([Egg, Position]);
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

/** Every projectile slot of the pool, live or not; renderers skip those with `Projectile.life === 0`. */
export function queryProjectiles(world: GameWorld): readonly number[] {
	return projectileList(world);
}

/** Every fragment pile on the ground (a pile leaves the world when picked up). */
export function queryFragments(world: GameWorld): readonly number[] {
	return fragmentList(world);
}

/** Every enemy-shot pool slot, live or not; renderers skip those with `EnemyShot.life === 0`. */
export function queryEnemyShots(world: GameWorld): readonly number[] {
	return enemyShotList(world);
}

/** Every consumable on the ground (blood vials and bone magnets); they leave the world when picked up. */
export function queryConsumables(world: GameWorld): readonly number[] {
	return consumableList(world);
}

/** Every entity carrying an elite modifier (`Elite.modifier > 0` for the live ones). */
export function queryElites(world: GameWorld): readonly number[] {
	return eliteList(world);
}

/** Boss eggs that have not hatched or broken yet. */
export function queryEggs(world: GameWorld): readonly number[] {
	return eggList(world);
}
