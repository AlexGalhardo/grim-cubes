import type { InputState } from "@gc/core";
import { Speed, Velocity } from "../ecs/components";
import type { GameWorld } from "../ecs/world";

/**
 * SDD 02 section 2.3 step 1: turns the unified `InputState` into the hero's velocity (u/s).
 * `speedMultiplier` carries temporary penalties such as the heavy machine gun while firing.
 */
export function inputSystem(
	_world: GameWorld,
	hero: number,
	input: Readonly<InputState>,
	speedMultiplier = 1,
): void {
	const speed = (Speed.value[hero] ?? 0) * speedMultiplier;
	Velocity.x[hero] = input.moveX * speed;
	Velocity.z[hero] = input.moveZ * speed;
}
