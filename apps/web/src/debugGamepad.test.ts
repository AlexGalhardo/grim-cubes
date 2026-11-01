import { expect, test } from "vitest";
import { createDebugGamepad } from "./debugGamepad";

const realPad = { id: "Real" } as Gamepad;

test("the virtual pad replaces the real ones only while connected", () => {
	const nav: { getGamepads: () => (Gamepad | null)[] } = { getGamepads: () => [realPad] };
	const pad = createDebugGamepad(nav);
	expect(nav.getGamepads()).toEqual([realPad]);
	pad.connect();
	const [virtual] = nav.getGamepads() as [Gamepad];
	expect(virtual.id).toContain("STANDARD GAMEPAD");
	expect(virtual.buttons).toHaveLength(17);
	pad.disconnect();
	expect(nav.getGamepads()).toEqual([realPad]);
});

test("buttons and axes are controllable and reset", async () => {
	const nav = { getGamepads: () => [] as (Gamepad | null)[] };
	const pad = createDebugGamepad(nav);
	pad.connect();
	pad.press(9);
	pad.setAxis(0, 0.8);
	const [virtual] = nav.getGamepads() as [Gamepad];
	expect(virtual.buttons[9]?.pressed).toBe(true);
	expect(virtual.axes[0]).toBe(0.8);
	expect(pad.state()).toMatchObject({ connected: true, buttons: [9] });
	pad.setAxis(1, 5);
	expect(virtual.axes[1]).toBe(1);
	await pad.tap(0, 1);
	expect(virtual.buttons[0]?.pressed).toBe(false);
	pad.reset();
	expect(pad.state()).toEqual({ connected: true, buttons: [], axes: [0, 0, 0, 0] });
	expect(() => pad.press(99)).toThrow(RangeError);
	expect(() => pad.setAxis(9, 0)).toThrow(RangeError);
});

test("without a real Gamepad API the page still gets an empty list", () => {
	const nav: { getGamepads?: () => (Gamepad | null)[] } = {};
	createDebugGamepad(nav);
	expect((nav.getGamepads as () => unknown[])()).toEqual([]);
});
