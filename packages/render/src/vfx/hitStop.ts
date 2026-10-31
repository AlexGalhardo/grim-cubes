export interface HitStopDeps {
	pause(): void;
	resume(): void;
	now(): number;
}

export interface HitStop {
	/** Freezes the simulation for `ms`; overlapping requests extend to the latest end, never stack. */
	request(ms: number): void;
	/** Call once per rendered frame: resumes the simulation when the freeze is over. */
	update(): void;
	readonly active: boolean;
}

/** Hit-stop (GDD §23: 30 ms on a critical hit, 80 ms when a boss dies). Rendering carries on during the freeze. */
export function createHitStop(deps: HitStopDeps): HitStop {
	let until = 0;
	let active = false;
	return {
		get active(): boolean {
			return active;
		},
		request(ms): void {
			if (ms <= 0) return;
			until = Math.max(until, deps.now() + ms);
			if (!active) {
				active = true;
				deps.pause();
			}
		},
		update(): void {
			if (active && deps.now() >= until) {
				active = false;
				deps.resume();
			}
		},
	};
}
