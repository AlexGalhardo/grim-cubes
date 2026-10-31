export const STEP = 1 / 60;
export const MAX_STEPS = 5;
const MAX_DT = 0.25;

export interface LoopHooks {
	/** Advances the simulation by exactly `step` seconds. */
	simulate(step: number): void;
	/** `alpha` in [0, 1) is the fraction of a step left in the accumulator, for interpolation. */
	render(alpha: number): void;
	publish(now: number): void;
}

export interface Loop {
	/** Call once per animation frame with a monotonic timestamp in milliseconds. */
	frame(nowMs: number): void;
	pause(): void;
	resume(): void;
	/** Simulated seconds per real second (1, 2 or 3): the accumulator fills faster, `STEP` never changes. */
	setSpeed(speed: number): void;
	readonly speed: number;
	/** Frames where the step budget ran out and the backlog was dropped. */
	readonly slowFrame: number;
}

export function createLoop(hooks: LoopHooks): Loop {
	let acc = 0;
	let last: number | null = null;
	let paused = false;
	let slowFrame = 0;
	let speed = 1;

	return {
		frame(nowMs: number): void {
			const dt = last === null ? 0 : Math.min((nowMs - last) / 1000, MAX_DT);
			last = nowMs;
			if (!paused) {
				acc += dt * speed;
				// The ceiling grows with the speed so a 3x frame can still catch up, but never spirals.
				const ceiling = MAX_STEPS * speed;
				let steps = 0;
				while (acc >= STEP && steps < ceiling) {
					hooks.simulate(STEP);
					acc -= STEP;
					steps++;
				}
				if (acc >= STEP) {
					// Slow down instead of spiralling: drop what we cannot simulate.
					acc = 0;
					slowFrame++;
				}
			}
			hooks.render(acc / STEP);
			hooks.publish(nowMs);
		},
		pause(): void {
			paused = true;
			acc = 0;
		},
		resume(): void {
			paused = false;
			last = null;
		},
		setSpeed(next: number): void {
			speed = Math.max(1, Math.min(3, Math.round(next)));
		},
		get speed(): number {
			return speed;
		},
		get slowFrame(): number {
			return slowFrame;
		},
	};
}
