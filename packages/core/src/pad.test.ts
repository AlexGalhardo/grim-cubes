import { expect, test } from "vitest";
import { checkPadButton, createPadMap, padBindingsFor, padButtonName, validPadMap } from "./pad";

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
