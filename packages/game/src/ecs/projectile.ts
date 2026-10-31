import { addComponent } from "bitecs";
import { MAX_ENTITIES, Position, PrevPosition, Projectile, Radius, Velocity } from "./components";
import { type EventBuffer, EventType } from "./events";
import { type GameWorld, spawn } from "./world";

export const PROJECTILE_POOL_SIZE = 512;
/** Last targets remembered per projectile (anti double hit). Entity id 0 is never valid, so 0 means empty. */
export const HIT_HISTORY = 8;
export const ProjectileHits = {
	ids: new Uint16Array(MAX_ENTITIES * HIT_HISTORY),
	cursor: new Uint8Array(MAX_ENTITIES),
};

export interface ProjectileSpec {
	x: number;
	z: number;
	vx: number;
	vz: number;
	damage: number;
	critChance: number;
	knockback: number;
	pierce: number;
	lifeSteps: number;
	radius: number;
	explosionRadius: number;
	selfFraction: number;
}

/**
 * Fixed set of projectile entities created once; shots activate and retire them, so firing never
 * creates entities. A slot is live while `Projectile.life > 0`; renderers must skip the rest.
 */
export interface ProjectilePool {
	readonly capacity: number;
	readonly active: number;
	/** Shots dropped because the pool was full, since creation. */
	readonly exhausted: number;
	/** Returns the entity, or -1 and a `PoolExhausted` event when the pool is full. */
	acquire(spec: ProjectileSpec): number;
	release(eid: number): void;
}

export function createProjectilePool(
	world: GameWorld,
	events: EventBuffer,
	capacity = PROJECTILE_POOL_SIZE,
): ProjectilePool {
	const free = new Uint16Array(capacity);
	let freeCount = 0;
	let exhausted = 0;
	for (let i = 0; i < capacity; i++) {
		const e = spawn(world);
		for (const c of [Position, PrevPosition, Velocity, Projectile, Radius]) addComponent(world, e, c);
		free[freeCount++] = e;
	}

	return {
		capacity,
		get active(): number {
			return capacity - freeCount;
		},
		get exhausted(): number {
			return exhausted;
		},
		acquire(spec: ProjectileSpec): number {
			if (freeCount === 0) {
				exhausted++;
				events.push(EventType.PoolExhausted, spec.x, spec.z, 0, 0);
				return -1;
			}
			const e = free[--freeCount] as number;
			Position.x[e] = PrevPosition.x[e] = spec.x;
			Position.z[e] = PrevPosition.z[e] = spec.z;
			Velocity.x[e] = spec.vx;
			Velocity.z[e] = spec.vz;
			Radius.r[e] = spec.radius;
			Projectile.damage[e] = spec.damage;
			Projectile.critChance[e] = spec.critChance;
			Projectile.knockback[e] = spec.knockback;
			Projectile.pierce[e] = spec.pierce;
			Projectile.explosionRadius[e] = spec.explosionRadius;
			Projectile.selfFraction[e] = spec.selfFraction;
			Projectile.life[e] = Math.max(1, spec.lifeSteps);
			ProjectileHits.ids.fill(0, e * HIT_HISTORY, (e + 1) * HIT_HISTORY);
			ProjectileHits.cursor[e] = 0;
			return e;
		},
		release(e: number): void {
			if ((Projectile.life[e] ?? 0) === 0) return;
			Projectile.life[e] = 0;
			Velocity.x[e] = 0;
			Velocity.z[e] = 0;
			free[freeCount++] = e;
		},
	};
}
