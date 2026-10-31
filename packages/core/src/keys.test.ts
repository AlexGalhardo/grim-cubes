import { expect, test } from "vitest";
import { checkKey, createKeyMap, FIXED_KEYS, keyBindingsFor, validKeyMap } from "./keys";

test("the default map is valid and the bindings add the fixed keys", () => {
	const keys = createKeyMap();
	expect(validKeyMap(keys)).toBe(true);
	const bindings = keyBindingsFor(keys);
	expect(bindings.up).toEqual(["KeyW", "ArrowUp"]);
	expect(bindings.dash).toEqual(["Space", ...(FIXED_KEYS.dash ?? [])]);
	expect(bindings.pause).toEqual(["Escape", "KeyP"]);
});

test("a free key is accepted and a remap shows up in the bindings", () => {
	const keys = createKeyMap();
	expect(checkKey(keys, "dash", "KeyE")).toEqual({ ok: true });
	keys.dash = "KeyE";
	expect(keyBindingsFor(keys).dash[0]).toBe("KeyE");
});

test("a key held by another action conflicts, fixed keys included", () => {
	const keys = createKeyMap();
	expect(checkKey(keys, "dash", "KeyW")).toEqual({ ok: false, reason: "conflict", with: "up" });
	expect(checkKey(keys, "reroll", "KeyP")).toEqual({ ok: false, reason: "conflict", with: "pause" });
	expect(checkKey(keys, "reroll", "ShiftLeft")).toEqual({ ok: false, reason: "conflict", with: "dash" });
	expect(checkKey(keys, "left", "ArrowRight")).toEqual({ ok: false, reason: "conflict", with: "right" });
	// An action's own key, or its own fixed key, is not a conflict.
	expect(checkKey(keys, "up", "KeyW")).toEqual({ ok: true });
	expect(checkKey(keys, "up", "ArrowUp")).toEqual({ ok: true });
});

test("keys the screens use are reserved, Tab is for speed and Escape for pause", () => {
	const keys = createKeyMap();
	for (const code of ["Enter", "Digit3", "Numpad9", "F11"]) {
		expect(checkKey(keys, "dash", code)).toEqual({ ok: false, reason: "reserved" });
	}
	expect(checkKey(keys, "dash", "Tab")).toEqual({ ok: false, reason: "reserved" });
	expect(checkKey(keys, "dash", "Escape")).toEqual({ ok: false, reason: "reserved" });
	expect(checkKey(keys, "speed", "Tab")).toEqual({ ok: true });
	expect(checkKey(keys, "pause", "Escape")).toEqual({ ok: true });
	expect(checkKey(keys, "dash", "")).toEqual({ ok: false, reason: "invalid" });
	expect(checkKey(keys, "dash", "../x")).toEqual({ ok: false, reason: "invalid" });
});

test("a map with a shared or invalid key is not valid", () => {
	expect(validKeyMap({ ...createKeyMap(), dash: "KeyW" })).toBe(false);
	expect(validKeyMap({ ...createKeyMap(), reroll: "Enter" })).toBe(false);
	expect(validKeyMap({ ...createKeyMap(), speed: "KeyZ", dash: "KeyX" })).toBe(true);
});
