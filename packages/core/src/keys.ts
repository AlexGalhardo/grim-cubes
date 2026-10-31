/** Remappable keyboard controls (A-07-02). Keys are `KeyboardEvent.code` values, so the layout does not matter. */
export const KEY_ACTIONS = ["up", "down", "left", "right", "dash", "pause", "reroll", "speed"] as const;
export type KeyAction = (typeof KEY_ACTIONS)[number];
export type KeyMap = Record<KeyAction, string>;

export function createKeyMap(): KeyMap {
	return {
		up: "KeyW",
		down: "KeyS",
		left: "KeyA",
		right: "KeyD",
		dash: "Space",
		pause: "Escape",
		reroll: "KeyR",
		speed: "Tab",
	};
}

/** Keys that always work for an action besides the remappable one; no other action may take them. */
export const FIXED_KEYS: Readonly<Partial<Record<KeyAction, readonly string[]>>> = {
	up: ["ArrowUp"],
	down: ["ArrowDown"],
	left: ["ArrowLeft"],
	right: ["ArrowRight"],
	dash: ["ShiftLeft", "ShiftRight"],
	pause: ["KeyP"],
};

/** Keys the screens use themselves: Enter confirms, 1-9 pick cards and shop slots, F11 toggles fullscreen. */
const RESERVED = new Set<string>([
	"Enter",
	"NumpadEnter",
	"F11",
	...Array.from({ length: 9 }, (_, i) => `Digit${i + 1}`),
	...Array.from({ length: 9 }, (_, i) => `Numpad${i + 1}`),
]);

export type KeyCheck =
	| { ok: true }
	| { ok: false; reason: "invalid" | "reserved" }
	| { ok: false; reason: "conflict"; with: KeyAction };

const CODE = /^[A-Za-z][A-Za-z0-9]{0,23}$/;

/**
 * Whether `code` may become the key of `action`. Tab belongs to the speed toggle and Escape to pause (dialogs use
 * both); anything a screen uses itself is reserved; and a key another action already holds, fixed or not, conflicts.
 */
export function checkKey(keys: Readonly<KeyMap>, action: KeyAction, code: string): KeyCheck {
	if (!CODE.test(code)) return { ok: false, reason: "invalid" };
	if (RESERVED.has(code)) return { ok: false, reason: "reserved" };
	if (code === "Tab" && action !== "speed") return { ok: false, reason: "reserved" };
	if (code === "Escape" && action !== "pause") return { ok: false, reason: "reserved" };
	for (const other of KEY_ACTIONS) {
		if (other === action) continue;
		if (keys[other] === code || (FIXED_KEYS[other] ?? []).includes(code)) {
			return { ok: false, reason: "conflict", with: other };
		}
	}
	return { ok: true };
}

/** True when every key is a valid code and no two actions share one (fixed keys included). */
export function validKeyMap(keys: Readonly<KeyMap>): boolean {
	return KEY_ACTIONS.every((action) => checkKey(keys, action, keys[action]).ok);
}

type MoveAction = "up" | "down" | "left" | "right" | "dash" | "pause";

/** The bindings the keyboard source polls: each remappable key plus the action's fixed keys. */
export function keyBindingsFor(keys: Readonly<KeyMap>): Record<MoveAction, string[]> {
	const list = (action: MoveAction): string[] => [keys[action], ...(FIXED_KEYS[action] ?? [])];
	return {
		up: list("up"),
		down: list("down"),
		left: list("left"),
		right: list("right"),
		dash: list("dash"),
		pause: list("pause"),
	};
}
