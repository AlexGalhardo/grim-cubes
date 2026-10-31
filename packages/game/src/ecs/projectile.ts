import { addComponent } from "bitecs";
import { Position, PrevPosition, Projectile, Velocity } from "./components";
import { type GameWorld, spawn } from "./world";

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
}

export function spawnProjectile(world: GameWorld, spec: ProjectileSpec): number {
	const e = spawn(world);
	addComponent(world, e, Position);
	addComponent(world, e, PrevPosition);
	addComponent(world, e, Velocity);
	addComponent(world, e, Projectile);
	Position.x[e] = PrevPosition.x[e] = spec.x;
	Position.z[e] = PrevPosition.z[e] = spec.z;
	Velocity.x[e] = spec.vx;
	Velocity.z[e] = spec.vz;
	Projectile.damage[e] = spec.damage;
	Projectile.critChance[e] = spec.critChance;
	Projectile.knockback[e] = spec.knockback;
	Projectile.pierce[e] = spec.pierce;
	Projectile.life[e] = spec.lifeSteps;
	return e;
}
