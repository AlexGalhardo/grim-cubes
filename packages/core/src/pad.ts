/** Remappable gamepad buttons (A-07-02), as indexes of the standard mapping (0 = A / cross, 9 = Start). */
export const PAD_ACTIONS = ["dash", "pause", "reroll", "speed"] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];
export type PadMap = Record<PadAction, number>;

export function createPadMap(): PadMap {
	// A dashes, Start pauses, X rerolls (level-up and shop) and Select/Back cycles the game speed.
	return { dash: 0, pause: 9, reroll: 2, speed: 8 };
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
		reroll: [map.reroll],
		speed: [map.speed],
	};
}

/** How a controller labels its buttons: Xbox letters, PlayStation symbols, or a neutral set (Nintendo, 8BitDo, others). */
export type PadStyle = "xbox" | "playstation" | "generic";

const LABELS: Readonly<Record<PadStyle, readonly string[]>> = {
	xbox: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3"],
	playstation: [
		"\u2715",
		"\u25CB",
		"\u25A1",
		"\u25B3",
		"L1",
		"R1",
		"L2",
		"R2",
		"Share",
		"Options",
		"L3",
		"R3",
	],
	generic: ["A", "B", "X", "Y", "L1", "R1", "L2", "R2", "Select", "Start", "L3", "R3"],
};

/**
 * Picks the label set from `Gamepad.id`. Chrome ends it with "Vendor: 054c Product: 09cc" and Firefox starts it with
 * "054c-09cc-", so the USB vendor id (Sony 054c, Microsoft 045e) is checked first, then the product name.
 */
export function padStyleFromId(id: string | null | undefined): PadStyle {
	const text = (id ?? "").toLowerCase();
	if (/vendor: 054c|^054c-|dualshock|dualsense|playstation|\bps[345]\b|sony/.test(text))
		return "playstation";
	if (/vendor: 045e|^045e-|xbox|xinput|microsoft/.test(text)) return "xbox";
	return "generic";
}

/** "A" or "\u2715" for button 0 ... "Start" or "Options" for 9; buttons beyond the standard 12 read as "#16". */
export function padButtonName(button: number, style: PadStyle = "xbox"): string {
	return LABELS[style][button] ?? `#${button}`;
}
