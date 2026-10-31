import { addComponent } from "bitecs";
import { EnemyShot, Position, PrevPosition, Radius, Velocity } from "./components";
import { type GameWorld, spawn } from "./world";

export const ENEMY_SHOT_POOL_SIZE = 128;

/** Fixed pool of projectiles fired at the hero (the Vigia). A slot is live while `EnemyShot.life > 0`. */
export interface EnemyShotPool {
	readonly capacity: number;
	readonly active: number;
	/** Returns the entity, or -1 when the pool is full (the shot is dropped). */
	acquire(
		x: number,
		z: number,
		vx: number,
		vz: number,
		damage: number,
		lifeSteps: number,
		radius: number,
	): number;
	release(eid: number): void;
}

export function createEnemyShotPool(world: GameWorld, capacity = ENEMY_SHOT_POOL_SIZE): EnemyShotPool {
	const free = new Uint16Array(capacity);
	let freeCount = 0;
	for (let i = 0; i < capacity; i++) {
		const e = spawn(world);
		for (const c of [Position, PrevPosition, Velocity, Radius, EnemyShot]) addComponent(world, e, c);
		free[freeCount++] = e;
	}
	return {
		capacity,
		get active(): number {
			return capacity - freeCount;
		},
		acquire(x, z, vx, vz, damage, lifeSteps, radius): number {
			if (freeCount === 0) return -1;
			const e = free[--freeCount] as number;
			Position.x[e] = PrevPosition.x[e] = x;
			Position.z[e] = PrevPosition.z[e] = z;
			Velocity.x[e] = vx;
			Velocity.z[e] = vz;
			Radius.r[e] = radius;
			EnemyShot.damage[e] = damage;
			EnemyShot.life[e] = Math.max(1, lifeSteps);
			return e;
		},
		release(e: number): void {
			if ((EnemyShot.life[e] ?? 0) === 0) return;
			EnemyShot.life[e] = 0;
			Velocity.x[e] = 0;
			Velocity.z[e] = 0;
			free[freeCount++] = e;
		},
	};
}
