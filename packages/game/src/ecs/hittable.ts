import { hasComponent } from "bitecs";
import { Breakable, Egg, EnemyFaction } from "./components";
import type { GameWorld } from "./world";

/** What the hero's weapons, projectiles and effects can damage: enemies, breakable props and Nest Queen eggs. */
export function isHittable(world: GameWorld, e: number): boolean {
	return (
		hasComponent(world, e, EnemyFaction) ||
		hasComponent(world, e, Breakable) ||
		hasComponent(world, e, Egg)
	);
}
