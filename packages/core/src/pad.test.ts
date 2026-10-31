import { expect, test } from "vitest";
import {
	checkPadButton,
	createPadMap,
	padBindingsFor,
	padButtonName,
	padStyleFromId,
	validPadMap,
} from "./pad";

test("the default map is valid and the bindings add the fixed shoulder button to the dash", () => {
	const map = createPadMap();
	expect(validPadMap(map)).toBe(true);
	expect(padBindingsFor(map)).toEqual({ dash: [0, 5], pause: [9], reroll: [2], speed: [8] });
});

test("a free button is accepted, and a button of the other action conflicts, fixed ones included", () => {
	const map = createPadMap();
	expect(checkPadButton(map, "dash", 3)).toEqual({ ok: true });
	expect(checkPadButton(map, "dash", 2)).toEqual({ ok: false, reason: "conflict", with: "reroll" });
	expect(checkPadButton(map, "pause", 8)).toEqual({ ok: false, reason: "conflict", with: "speed" });
	expect(checkPadButton(map, "reroll", 9)).toEqual({ ok: false, reason: "conflict", with: "pause" });
	expect(checkPadButton(map, "speed", 5)).toEqual({ ok: false, reason: "conflict", with: "dash" });
	expect(checkPadButton(map, "dash", 9)).toEqual({ ok: false, reason: "conflict", with: "pause" });
	expect(checkPadButton(map, "pause", 0)).toEqual({ ok: false, reason: "conflict", with: "dash" });
	expect(checkPadButton(map, "pause", 5)).toEqual({ ok: false, reason: "conflict", with: "dash" });
	expect(checkPadButton(map, "dash", 0)).toEqual({ ok: true });
});

test("the D-pad and out-of-range buttons are refused", () => {
	const map = createPadMap();
	for (const button of [12, 13, 14, 15]) {
		expect(checkPadButton(map, "dash", button)).toEqual({ ok: false, reason: "reserved" });
	}
	expect(checkPadButton(map, "dash", -1)).toEqual({ ok: false, reason: "invalid" });
	expect(checkPadButton(map, "dash", 17)).toEqual({ ok: false, reason: "invalid" });
	expect(checkPadButton(map, "dash", 1.5)).toEqual({ ok: false, reason: "invalid" });
	expect(validPadMap({ dash: 9, pause: 9, reroll: 2, speed: 8 })).toBe(false);
	expect(validPadMap({ dash: 0, pause: 9, reroll: 2, speed: 2 })).toBe(false);
});

test("buttons have readable names", () => {
	expect(padButtonName(0)).toBe("A");
	expect(padButtonName(9)).toBe("Start");
	expect(padButtonName(2)).toBe("X");
	expect(padButtonName(8)).toBe("Back");
	expect(padButtonName(16)).toBe("#16");
});

// `Gamepad.id` strings as the browsers report them (Chrome: name + vendor and product; Firefox: vendor-product-name).
const IDS = {
	xbox: [
		"Xbox 360 Controller (XInput STANDARD GAMEPAD)",
		"Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
		"045e-02fd-Xbox Wireless Controller",
		"Microsoft Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
	],
	playstation: [
		"DualShock 4 Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)",
		"DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
		"054c-0ce6-Wireless Controller",
		"PS4 Controller",
		"Sony Interactive Entertainment Wireless Controller",
	],
	generic: [
		"Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)",
		"8BitDo Pro 2 (STANDARD GAMEPAD Vendor: 2dc8 Product: 6006)",
		"Logitech Dual Action (STANDARD GAMEPAD Vendor: 046d Product: c216)",
		"",
	],
} as const;

test("a controller is told apart by its Gamepad.id: Xbox, PlayStation, or generic", () => {
	for (const [style, ids] of Object.entries(IDS)) {
		for (const id of ids) expect(padStyleFromId(id), id).toBe(style);
	}
	expect(padStyleFromId(null)).toBe("generic");
	expect(padStyleFromId(undefined)).toBe("generic");
});

test("buttons are named with the letters of an Xbox pad, the symbols of a PlayStation pad or neutral names", () => {
	const names = (style: "xbox" | "playstation" | "generic") =>
		[0, 1, 2, 3, 4, 5, 8, 9].map((b) => padButtonName(b, style));
	expect(names("xbox")).toEqual(["A", "B", "X", "Y", "LB", "RB", "Back", "Start"]);
	expect(names("playstation")).toEqual([
		"\u2715",
		"\u25CB",
		"\u25A1",
		"\u25B3",
		"L1",
		"R1",
		"Share",
		"Options",
	]);
	expect(names("generic")).toEqual(["A", "B", "X", "Y", "L1", "R1", "Select", "Start"]);
	expect(padButtonName(16, "playstation")).toBe("#16");
	// Without a style the Xbox names stay, as before.
	expect(padButtonName(8)).toBe("Back");
});
