import { Velocity } from "../ecs/components";
import { STEP } from "../loop";

export interface HeroStatus {
	/** Multiplier on the hero's move speed while a slow lasts (1 otherwise). Feed it to `inputSystem`. */
	readonly speedMultiplier: number;
	/** Slows the hero to `multiplier` of its speed for `seconds`; the strongest slow in force wins and the time refreshes. */
	slow(seconds: number, multiplier: number): void;
	/** Shoves the hero `distance` u along (dirX, dirZ) over `seconds`, on top of its own movement. */
	push(dirX: number, dirZ: number, distance: number, seconds: number): void;
	/** Run right after `dashSystem`: adds the push to the hero's velocity and ticks the timers. */
	run(hero: number): void;
}

/** Temporary effects enemies put on the hero (boss pools and screams). Allocates nothing after creation. */
export function createHeroStatus(): HeroStatus {
	let slowTicks = 0;
	let slowMult = 1;
	let pushTicks = 0;
	let pushVx = 0;
	let pushVz = 0;

	return {
		get speedMultiplier(): number {
			return slowTicks > 0 ? slowMult : 1;
		},
		slow(seconds, multiplier): void {
			const ticks = Math.max(1, Math.round(seconds / STEP));
			slowMult = slowTicks > 0 ? Math.min(slowMult, multiplier) : multiplier;
			slowTicks = Math.max(slowTicks, ticks);
		},
		push(dirX, dirZ, distance, seconds): void {
			pushTicks = Math.max(1, Math.round(seconds / STEP));
			const speed = distance / (pushTicks * STEP);
			pushVx = dirX * speed;
			pushVz = dirZ * speed;
		},
		run(hero): void {
			if (slowTicks > 0) slowTicks--;
			if (pushTicks > 0) {
				Velocity.x[hero] = (Velocity.x[hero] ?? 0) + pushVx;
				Velocity.z[hero] = (Velocity.z[hero] ?? 0) + pushVz;
				pushTicks--;
			}
		},
	};
}
