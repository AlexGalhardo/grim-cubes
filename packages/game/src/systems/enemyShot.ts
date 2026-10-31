import { EnemyShot, Position, Radius } from "../ecs/components";
import type { EnemyShotPool } from "../ecs/enemyShot";
import { createQueryCache, type GameWorld } from "../ecs/world";
import type { DamageQueue } from "./damage";

const shots = createQueryCache([EnemyShot, Position]);

export interface EnemyShotSystem {
	run(world: GameWorld, hero: number): void;
}

/** Ages enemy projectiles and hurts the hero on contact; movementSystem moves them. */
export function createEnemyShotSystem(pool: EnemyShotPool, queue: DamageQueue): EnemyShotSystem {
	return {
		run(world: GameWorld, hero: number): void {
			const list = shots(world);
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const reach = Radius.r[hero] ?? 0;
			for (let i = 0; i < list.length; i++) {
				const s = list[i] ?? 0;
				const life = EnemyShot.life[s] ?? 0;
				if (life === 0) continue;
				if (
					Math.hypot((Position.x[s] ?? 0) - hx, (Position.z[s] ?? 0) - hz) <=
					reach + (Radius.r[s] ?? 0)
				) {
					queue.push(hero, EnemyShot.damage[s] ?? 0, 0, 0, 0, 0);
					pool.release(s);
				} else if (life === 1) {
					pool.release(s);
				} else {
					EnemyShot.life[s] = life - 1;
				}
			}
		},
	};
}
