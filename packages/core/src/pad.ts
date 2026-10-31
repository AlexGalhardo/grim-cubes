/** Remappable gamepad buttons (A-07-02), as indexes of the standard mapping (0 = A / cross, 9 = Start). */
export const PAD_ACTIONS = ["dash", "pause"] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];
export type PadMap = Record<PadAction, number>;

export function createPadMap(): PadMap {
	return { dash: 0, pause: 9 };
}

/** Buttons that always work for an action besides the remappable one (RB also dashes). */
export const FIXED_PAD_BUTTONS: Readonly<Partial<Record<PadAction, readonly number[]>>> = { dash: [5] };

/** The D-pad moves the hero and the menu focus, so it cannot be bound. */
const RESERVED = new Set([12, 13, 14, 15]);

export const PAD_BUTTON_COUNT = 17;

export type PadCheck =
	| { ok: true }
	| { ok: false; reason: "invalid" | "reserved" }
	| { ok: false; reason: "conflict"; with: PadAction };

export function checkPadButton(map: Readonly<PadMap>, action: PadAction, button: number): PadCheck {
	if (!Number.isInteger(button) || button < 0 || button >= PAD_BUTTON_COUNT)
		return { ok: false, reason: "invalid" };
	if (RESERVED.has(button)) return { ok: false, reason: "reserved" };
	for (const other of PAD_ACTIONS) {
		if (other === action) continue;
		if (map[other] === button || (FIXED_PAD_BUTTONS[other] ?? []).includes(button)) {
			return { ok: false, reason: "conflict", with: other };
		}
	}
	return { ok: true };
}

export function validPadMap(map: Readonly<PadMap>): boolean {
	return PAD_ACTIONS.every((action) => checkPadButton(map, action, map[action]).ok);
}

/** The buttons the gamepad source reads for each action: the remappable one plus the fixed extras. */
export function padBindingsFor(map: Readonly<PadMap>): Record<PadAction, number[]> {
	return {
		dash: [map.dash, ...(FIXED_PAD_BUTTONS.dash ?? [])],
		pause: [map.pause, ...(FIXED_PAD_BUTTONS.pause ?? [])],
	};
}

const NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3"];

/** "A" for button 0 ... "Start" for 9; the rest read as "Botão 12". */
export function padButtonName(button: number): string {
	return NAMES[button] ?? `#${button}`;
}
