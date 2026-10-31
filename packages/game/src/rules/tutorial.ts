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
}

export const TUTORIAL_MS = 20_000;
export const TUTORIAL_MOVE_DISTANCE = 3;

type Phase = TutorialStep | "done";

export function createTutorial(): Tutorial {
	let phase: Phase = "tutorialMove";
	let startedAt = -1;
	let anchorX = 0;
	let anchorZ = 0;
	let killsAtStart = 0;
	let goldAtStart = 0;

	return {
		update(input): TutorialStep | null {
			if (!input.enabled || input.round !== 1 || phase === "done") return null;
			if (input.state !== "Round") return startedAt < 0 ? null : phase;
			if (startedAt < 0) {
				startedAt = input.nowMs;
				anchorX = input.heroX;
				anchorZ = input.heroZ;
				killsAtStart = input.kills;
				goldAtStart = input.gold;
			}
			if (input.nowMs - startedAt >= TUTORIAL_MS) {
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
