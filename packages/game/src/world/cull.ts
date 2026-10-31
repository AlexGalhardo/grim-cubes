import { removeEntity } from "bitecs";
import { Boss, Elite, EnemyFaction, Position } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";

const enemyBodies = createQueryCache([EnemyFaction, Position]);

/**
 * SDD 03 §6: an enemy farther than `distance` from the hero is removed without a drop or a death event (it was left
 * behind, not killed). Elites and bosses stay: the round needs them. Positions are relative to the origin, like the hero's.
 */
export function cullDistantEnemies(world: GameWorld, heroX: number, heroZ: number, distance: number): number {
	const list = enemyBodies(world);
	const limit = distance * distance;
	let removed = 0;
	// Backwards: removeEntity swaps the last dense slot into the removed one.
	for (let i = list.length - 1; i >= 0; i--) {
		const e = list[i] ?? 0;
		const dx = (Position.x[e] ?? 0) - heroX;
		const dz = (Position.z[e] ?? 0) - heroZ;
		if (dx * dx + dz * dz <= limit) continue;
		if ((Elite.modifier[e] ?? 0) > 0 || (Boss.id[e] ?? 0) > 0) continue;
		removeEntity(world, e);
		removed++;
	}
	return removed;
}
