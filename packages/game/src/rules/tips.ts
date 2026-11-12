/** The three contextual tips of round 1 (A-07-01): how to move, that fragments are worth picking up, the shop. */
export type TipId = "move" | "fragments" | "shop";

export interface TipsInput {
	round: number;
	/** `RunState` name: only "RoundIntro", "Round" and "Shop" show tips. */
	state: string;
	heroX: number;
	heroZ: number;
	/** Fragment piles on the floor. */
	piles: number;
	gold: number;
	/** Monotonic milliseconds. */
	nowMs: number;
	/** False once the player has played enough runs not to need them. */
	enabled: boolean;
}

export interface Tips {
	/** The tip to show right now, or null. Call at the HUD publish rate. */
	update(input: TipsInput): TipId | null;
}

/** Distance in u after which the player evidently knows how to move. */
export const MOVE_DONE_DISTANCE = 3;
/** A tip goes away by itself after this long on screen, in case the player never does what it asks. */
export const TIP_TIMEOUT_MS = 10_000;

type Phase = "move" | "fragments" | "shop" | "done";

export function createTips(): Tips {
	let phase: Phase = "move";
	let lastRound = 0;
	let anchorX = 0;
	let anchorZ = 0;
	let anchored = false;
	let shownAt = -1;
	let goldAtStart = 0;

	const reset = (input: TipsInput): void => {
		phase = "move";
		anchored = false;
		shownAt = -1;
		goldAtStart = input.gold;
	};
	const advance = (next: Phase): void => {
		phase = next;
		shownAt = -1;
	};

	return {
		update(input): TipId | null {
			if (input.round === 1 && lastRound !== 1) reset(input);
			lastRound = input.round;
			if (!input.enabled || input.round !== 1 || phase === "done") return null;

			// The shop can open before the player did what an earlier tip asked: skip straight to the shop tip.
			if (input.state === "Shop" && phase !== "shop") advance("shop");
			const playing = input.state === "Round" || input.state === "RoundIntro";
			if (phase === "move") {
				if (!playing) return null;
				if (!anchored) {
					anchored = true;
					anchorX = input.heroX;
					anchorZ = input.heroZ;
				}
				if (shownAt < 0) shownAt = input.nowMs;
				const moved = Math.hypot(input.heroX - anchorX, input.heroZ - anchorZ);
				if (moved >= MOVE_DONE_DISTANCE || input.nowMs - shownAt > TIP_TIMEOUT_MS)
					advance("fragments");
				else return "move";
			}
			if (phase === "fragments") {
				if (input.state === "Shop") advance("shop");
				else if (input.state === "Round" && input.piles > 0) {
					if (shownAt < 0) shownAt = input.nowMs;
					if (input.gold > goldAtStart || input.nowMs - shownAt > TIP_TIMEOUT_MS) advance("shop");
					else return "fragments";
				}
			}
			if (phase === "shop") {
				if (input.state === "Shop") return "shop";
				if (input.state === "RoundIntro" || input.round > 1) advance("done");
			}
			return null;
		},
	};
}
