import type { InputState } from "@gc/core";
import { Speed, Velocity } from "../ecs/components";
import type { GameWorld } from "../ecs/world";

/** SDD 02 section 2.3 step 1: turns the unified `InputState` into the hero's velocity (u/s). */
export function inputSystem(_world: GameWorld, hero: number, input: Readonly<InputState>): void {
	const speed = Speed.value[hero] ?? 0;
	Velocity.x[hero] = input.moveX * speed;
	Velocity.z[hero] = input.moveZ * speed;
}
