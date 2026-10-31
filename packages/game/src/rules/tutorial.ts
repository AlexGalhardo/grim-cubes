/** The optional 20 s tutorial (A-07-01): move, let the weapon kill one enemy, pick up a fragment. */
export type TutorialStep = "tutorialMove" | "tutorialKill" | "tutorialCollect";

export interface TutorialInput {
	round: number;
	/** `RunState` name: the tutorial only runs during a round. */
	state: string;
	heroX: number;
	heroZ: number;
	/** Enemies killed in the run so far. */
	kills: number;
	gold: number;
	/** Monotonic milliseconds. */
	nowMs: number;
	enabled: boolean;
}

export interface Tutorial {
	/** The step to show right now, or null (not started, finished or timed out). */
	update(input: TutorialInput): TutorialStep | null;
	/** True once the tutorial ended (finished or timed out): the regular tips take over. */
	readonly done: boolean;
}

export const TUTORIAL_MS = 20_000;
export const TUTORIAL_MOVE_DISTANCE = 3;

type Phase = TutorialStep | "done";

export function createTutorial(): Tutorial {
	let phase: Phase = "tutorialMove";
	let elapsedMs = 0;
	let lastNow = -1;
	let started = false;
	let anchorX = 0;
	let anchorZ = 0;
	let killsAtStart = 0;
	let goldAtStart = 0;

	return {
		get done(): boolean {
			return phase === "done";
		},
		update(input): TutorialStep | null {
			if (!input.enabled || input.round !== 1 || phase === "done") return null;
			if (input.state !== "Round") {
				// Time spent paused does not count against the 20 s.
				lastNow = -1;
				return started ? phase : null;
			}
			if (lastNow >= 0) elapsedMs += input.nowMs - lastNow;
			lastNow = input.nowMs;
			if (!started) {
				started = true;
				anchorX = input.heroX;
				anchorZ = input.heroZ;
				killsAtStart = input.kills;
				goldAtStart = input.gold;
			}
			if (elapsedMs >= TUTORIAL_MS) {
				phase = "done";
				return null;
			}
			if (phase === "tutorialMove") {
				if (Math.hypot(input.heroX - anchorX, input.heroZ - anchorZ) >= TUTORIAL_MOVE_DISTANCE)
					phase = "tutorialKill";
			}
			if (phase === "tutorialKill" && input.kills > killsAtStart) phase = "tutorialCollect";
			if (phase === "tutorialCollect" && input.gold > goldAtStart) phase = "done";
			return phase === "done" ? null : phase;
		},
	};
}
