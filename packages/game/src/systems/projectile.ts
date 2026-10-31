import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { EnemyFaction, Health, Position, Projectile, Radius, Velocity } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { HIT_HISTORY, ProjectileHits, type ProjectilePool } from "../ecs/projectile";
import { createQueryCache, type GameWorld } from "../ecs/world";
import type { DamageQueue } from "./damage";

export interface ProjectileSystemDeps {
	pool: ProjectilePool;
	queue: DamageQueue;
	/** The enemy hash rebuilt this step (separationSystem.hash). */
	enemies: SpatialHash;
	/** Largest enemy radius, to bound the hash query. */
	maxEnemyRadius: number;
	/** The hero entity, hurt by its own explosions. */
	hero: number;
	events: EventBuffer;
}

export interface ProjectileSystem {
	run(world: GameWorld): void;
}

const live = createQueryCache([Projectile, Position, Velocity, Radius]);
const MAX_NEAR = 128;

export function createProjectileSystem(deps: ProjectileSystemDeps): ProjectileSystem {
	const { pool, queue, enemies, maxEnemyRadius, hero, events } = deps;
	const near = new Uint16Array(MAX_NEAR);

	/** Area damage with linear falloff from 100% at the centre to 50% at the edge; the hero takes `selfFraction`. */
	function explode(world: GameWorld, p: number, x: number, z: number): void {
		const radius = Projectile.explosionRadius[p] ?? 0;
		const damage = Projectile.damage[p] ?? 0;
		const knockback = Projectile.knockback[p] ?? 0;
		events.push(EventType.Exploded, x, z, radius, p);
		const n = enemies.queryCircle(x, z, radius + maxEnemyRadius, near);
		for (let k = 0; k < n; k++) {
			const e = near[k] ?? 0;
			if ((Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
			const ex = (Position.x[e] ?? 0) - x;
			const ez = (Position.z[e] ?? 0) - z;
			const dist = Math.hypot(ex, ez);
			if (dist > radius + (Radius.r[e] ?? 0)) continue;
			const falloff = 1 - 0.5 * Math.min(dist / radius, 1);
			const rx = dist > 1e-6 ? ex / dist : 0;
			const rz = dist > 1e-6 ? ez / dist : 0;
			queue.push(e, damage * falloff, 0, Projectile.critChance[p] ?? 0, rx * knockback, rz * knockback);
		}
		const self = Projectile.selfFraction[p] ?? 0;
		const heroDist = Math.hypot((Position.x[hero] ?? 0) - x, (Position.z[hero] ?? 0) - z);
		if (self > 0 && heroDist <= radius + (Radius.r[hero] ?? 0)) {
			queue.push(hero, damage * self, 0, 0, 0, 0);
		}
	}

	const seen = (p: number, target: number): boolean => {
		const base = p * HIT_HISTORY;
		for (let i = 0; i < HIT_HISTORY; i++) if (ProjectileHits.ids[base + i] === target) return true;
		return false;
	};
	const remember = (p: number, target: number): void => {
		const at = ProjectileHits.cursor[p] ?? 0;
		ProjectileHits.ids[p * HIT_HISTORY + at] = target;
		ProjectileHits.cursor[p] = (at + 1) % HIT_HISTORY;
	};

	return {
		run(world: GameWorld): void {
			const list = live(world);
			for (let i = 0; i < list.length; i++) {
				const p = list[i] ?? 0;
				const life = Projectile.life[p] ?? 0;
				if (life === 0) continue;
				if (life === 1) {
					if ((Projectile.explosionRadius[p] ?? 0) > 0)
						explode(world, p, Position.x[p] ?? 0, Position.z[p] ?? 0);
					pool.release(p);
					continue;
				}
				Projectile.life[p] = life - 1;

				const px = Position.x[p] ?? 0;
				const pz = Position.z[p] ?? 0;
				const pr = Radius.r[p] ?? 0;
				const vx = Velocity.x[p] ?? 0;
				const vz = Velocity.z[p] ?? 0;
				const speed = Math.hypot(vx, vz) || 1;
				const knockback = Projectile.knockback[p] ?? 0;

				const n = enemies.queryCircle(px, pz, pr + maxEnemyRadius, near);
				let spent = false;
				for (let k = 0; k < n && !spent; k++) {
					const e = near[k] ?? 0;
					if ((Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
					if (
						Math.hypot((Position.x[e] ?? 0) - px, (Position.z[e] ?? 0) - pz) >
						pr + (Radius.r[e] ?? 0)
					)
						continue;
					if (seen(p, e)) continue;
					remember(p, e);
					if ((Projectile.explosionRadius[p] ?? 0) > 0) {
						explode(world, p, px, pz);
						pool.release(p);
						spent = true;
						continue;
					}
					queue.push(
						e,
						Projectile.damage[p] ?? 0,
						0,
						Projectile.critChance[p] ?? 0,
						(vx / speed) * knockback,
						(vz / speed) * knockback,
					);
					const pierce = Projectile.pierce[p] ?? 0;
					if (pierce === 0) {
						pool.release(p);
						spent = true;
					} else {
						Projectile.pierce[p] = pierce - 1;
					}
				}
			}
		},
	};
}
