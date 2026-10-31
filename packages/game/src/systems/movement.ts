import { Facing, Knockback, Position, PrevPosition, Velocity } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";

const movers = createQueryCache([Position, PrevPosition, Velocity]);

/**
 * SDD 02 section 2.3 step 6: `PrevPosition = Position; Position += Velocity * STEP`.
 * A pending knockback (damageSystem writes the total displacement and its duration) is spread evenly over its
 * remaining steps and added on top of the entity's own movement. Prop collision and origin shift are layered on by
 * their own tasks.
 */
export function movementSystem(world: GameWorld): void {
	const list = movers(world);
	for (let i = 0; i < list.length; i++) {
		const e = list[i] ?? 0;
		const x = Position.x[e] ?? 0;
		const z = Position.z[e] ?? 0;
		PrevPosition.x[e] = x;
		PrevPosition.z[e] = z;
		const vx = Velocity.x[e] ?? 0;
		const vz = Velocity.z[e] ?? 0;
		let pushX = 0;
		let pushZ = 0;
		const left = Knockback.ticks[e] ?? 0;
		if (left > 0) {
			pushX = (Knockback.x[e] ?? 0) / left;
			pushZ = (Knockback.z[e] ?? 0) / left;
			Knockback.x[e] = (Knockback.x[e] ?? 0) - pushX;
			Knockback.z[e] = (Knockback.z[e] ?? 0) - pushZ;
			Knockback.ticks[e] = left - 1;
		}
		Position.x[e] = x + vx * STEP + pushX;
		Position.z[e] = z + vz * STEP + pushZ;
		if (vx !== 0 || vz !== 0) Facing.yaw[e] = Math.atan2(vx, vz);
	}
}
