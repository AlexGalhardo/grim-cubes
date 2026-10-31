/** The slice of the Gamepad API that menu navigation reads. */
export interface PadLike {
	axes: readonly number[];
	buttons: readonly { pressed: boolean }[];
}

export type NavAction = "confirm" | "cancel" | "next" | "prev";

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_UP = 12;
const BUTTON_DOWN = 13;
const BUTTON_LEFT = 14;
const BUTTON_RIGHT = 15;
const STICK = 0.6;
/** A held direction repeats after this long, then every `REPEAT_MS`. */
const FIRST_REPEAT_MS = 400;
const REPEAT_MS = 150;

const isDown = (pad: PadLike, i: number): boolean => pad.buttons[i]?.pressed === true;

export interface PadNav {
	poll(pad: PadLike | null | undefined, nowMs: number): NavAction | null;
}

/**
 * Turns pad state into menu actions: A confirms, B cancels, the D-pad or left stick moves focus. Buttons fire on
 * the press edge; a held direction repeats. Whatever is already held on the first `poll` (A is the dash, so it is often
 * down when a screen opens) is only recorded and fires nothing until it is released. Call `poll` once per frame; it
 * allocates nothing.
 */
export function createPadNav(): PadNav {
	let primed = false;
	let heldA = false;
	let heldB = false;
	let dir: NavAction | null = null;
	let nextRepeat = 0;

	return {
		poll(pad, nowMs): NavAction | null {
			if (!pad) {
				primed = false;
				heldA = false;
				heldB = false;
				dir = null;
				return null;
			}
			const down = isDown(pad, BUTTON_A);
			const back = isDown(pad, BUTTON_B);
			// First poll: record what is held, fire nothing.
			const edgeA = primed && down && !heldA;
			const edgeB = primed && back && !heldB;
			heldA = down;
			heldB = back;
			if (edgeA) return "confirm";
			if (edgeB) return "cancel";

			const x = pad.axes[0] ?? 0;
			const y = pad.axes[1] ?? 0;
			const next = isDown(pad, BUTTON_DOWN) || isDown(pad, BUTTON_RIGHT) || y > STICK || x > STICK;
			const prev = isDown(pad, BUTTON_UP) || isDown(pad, BUTTON_LEFT) || y < -STICK || x < -STICK;
			const now: NavAction | null = next && !prev ? "next" : prev && !next ? "prev" : null;
			if (now === null) {
				dir = null;
				primed = true;
				return null;
			}
			if (now !== dir) {
				dir = now;
				const fresh = primed;
				primed = true;
				// Held when the screen opened: wait for a release (or another direction) before moving.
				nextRepeat = fresh ? nowMs + FIRST_REPEAT_MS : Number.POSITIVE_INFINITY;
				return fresh ? now : null;
			}
			if (nowMs >= nextRepeat) {
				nextRepeat = nowMs + REPEAT_MS;
				return now;
			}
			return null;
		},
	};
}

/**
 * Press edges of one extra button (the remapped reroll). Like `createPadNav`, a button already down on the first poll
 * is only recorded: it fires nothing until released.
 */
export function createButtonEdge(): { poll(pad: PadLike | null | undefined, button: number): boolean } {
	let primed = false;
	let held = false;
	return {
		poll(pad, button): boolean {
			if (!pad) {
				primed = false;
				held = false;
				return false;
			}
			const down = isDown(pad, button);
			const edge = primed && down && !held;
			held = down;
			primed = true;
			return edge;
		},
	};
}
