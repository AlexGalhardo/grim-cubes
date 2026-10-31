import { Facing, Position, PrevPosition, Velocity } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";

const movers = createQueryCache([Position, PrevPosition, Velocity]);

/**
 * SDD 02 section 2.3 step 6: `PrevPosition = Position; Position += Velocity * STEP`.
 * Prop collision, knockback and origin shift are layered on by their own tasks.
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
		Position.x[e] = x + vx * STEP;
		Position.z[e] = z + vz * STEP;
		if (vx !== 0 || vz !== 0) Facing.yaw[e] = Math.atan2(vx, vz);
	}
}
