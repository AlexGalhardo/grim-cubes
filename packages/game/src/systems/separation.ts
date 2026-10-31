import { createSpatialHash, type SpatialHash } from "@gc/core";
import { hasComponent, query } from "bitecs";
import { Boss, EnemyFaction, Position, Radius, Velocity } from "../ecs/components";
import type { GameWorld } from "../ecs/world";

export interface SeparationConfig {
	/** Weight of the push (SDD 04 section 5). */
	weight: number;
	/** Largest enemy radius, used to bound the neighbour search. */
	maxRadius: number;
}

export interface SeparationSystem {
	/** The enemy hash rebuilt this step; targeting and projectiles reuse it. */
	readonly hash: SpatialHash;
	run(world: GameWorld): void;
}

const ENEMY_TERMS = [EnemyFaction, Position, Radius, Velocity];
const MAX_NEIGHBOURS = 64;

/**
 * Soft collision: for each overlapping pair, pushes along the line between centres with strength
 * `1 - d / (r1 + r2)`, scaled by the mover's current speed so idle enemies stay put. Bosses are not pushed.
 * Runs after behaviorSystem has set Velocity.
 */
export function createSeparationSystem(config: SeparationConfig, capacity = 1024): SeparationSystem {
	const hash = createSpatialHash({ cellSize: 2, capacity });
	const near = new Uint16Array(MAX_NEIGHBOURS);

	return {
		hash,
		run(world: GameWorld): void {
			const enemies = query(world, ENEMY_TERMS);
			hash.clear();
			for (let i = 0; i < enemies.length; i++) {
				const e = enemies[i] ?? 0;
				hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
			}

			for (let i = 0; i < enemies.length; i++) {
				const e = enemies[i] ?? 0;
				if (hasComponent(world, e, Boss)) continue;
				const x = Position.x[e] ?? 0;
				const z = Position.z[e] ?? 0;
				const r = Radius.r[e] ?? 0;
				const vx = Velocity.x[e] ?? 0;
				const vz = Velocity.z[e] ?? 0;
				const speed = Math.hypot(vx, vz);
				if (speed === 0) continue;

				const n = hash.queryCircle(x, z, r + config.maxRadius, near);
				let px = 0;
				let pz = 0;
				for (let k = 0; k < n; k++) {
					const o = near[k] ?? 0;
					if (o === e) continue;
					const reach = r + (Radius.r[o] ?? 0);
					let dx = x - (Position.x[o] ?? 0);
					let dz = z - (Position.z[o] ?? 0);
					const d = Math.hypot(dx, dz);
					if (d >= reach) continue;
					if (d < 1e-4) {
						// Exactly stacked: split along an axis chosen by id so the pair separates deterministically.
						dx = e > o ? 1 : -1;
						dz = 0;
					} else {
						dx /= d;
						dz /= d;
					}
					const strength = 1 - d / reach;
					px += dx * strength;
					pz += dz * strength;
				}
				Velocity.x[e] = vx + px * config.weight * speed;
				Velocity.z[e] = vz + pz * config.weight * speed;
			}
		},
	};
}
