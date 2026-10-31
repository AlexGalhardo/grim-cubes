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

export interface PadNav {
	poll(pad: PadLike | null | undefined, nowMs: number): NavAction | null;
}

/**
 * Turns pad state into menu actions: A confirms, B cancels, the D-pad or left stick moves focus. Buttons fire on
 * the press edge; a held direction repeats. Call `poll` once per frame; it allocates nothing.
 */
export function createPadNav(): PadNav {
	let heldA = false;
	let heldB = false;
	let dir: NavAction | null = null;
	let nextRepeat = 0;

	return {
		poll(pad, nowMs): NavAction | null {
			if (!pad) {
				heldA = false;
				heldB = false;
				dir = null;
				return null;
			}
			const down = pad.buttons[BUTTON_A]?.pressed === true;
			const back = pad.buttons[BUTTON_B]?.pressed === true;
			const edgeA = down && !heldA;
			const edgeB = back && !heldB;
			heldA = down;
			heldB = back;
			if (edgeA) return "confirm";
			if (edgeB) return "cancel";

			const x = pad.axes[0] ?? 0;
			const y = pad.axes[1] ?? 0;
			const pressed = (i: number): boolean => pad.buttons[i]?.pressed === true;
			const next = pressed(BUTTON_DOWN) || pressed(BUTTON_RIGHT) || y > STICK || x > STICK;
			const prev = pressed(BUTTON_UP) || pressed(BUTTON_LEFT) || y < -STICK || x < -STICK;
			const now: NavAction | null = next && !prev ? "next" : prev && !next ? "prev" : null;
			if (now === null) {
				dir = null;
				return null;
			}
			if (now !== dir) {
				dir = now;
				nextRepeat = nowMs + FIRST_REPEAT_MS;
				return now;
			}
			if (nowMs >= nextRepeat) {
				nextRepeat = nowMs + REPEAT_MS;
				return now;
			}
			return null;
		},
	};
}
