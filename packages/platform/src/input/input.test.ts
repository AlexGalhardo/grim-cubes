import { createInputState, createVirtualStick } from "@gc/core";
import { expect, test } from "vitest";
import { applyDeadZone, readGamepad } from "./gamepad";
import { createInputSources } from "./index";
import { createKeyboardSource, DEFAULT_BINDINGS } from "./keyboard";

const key = (type: "keydown" | "keyup", code: string): Event => Object.assign(new Event(type), { code });

test("WASD and arrows map to movement, opposite keys cancel, diagonals are unit length", () => {
	const target = new EventTarget();
	const keyboard = createKeyboardSource(target);
	const s = createInputState();

	target.dispatchEvent(key("keydown", "KeyW"));
	keyboard.poll(s);
	expect([s.moveX, s.moveZ]).toEqual([0, 1]);

	target.dispatchEvent(key("keydown", "ArrowRight"));
	keyboard.poll(s);
	expect(Math.hypot(s.moveX, s.moveZ)).toBeCloseTo(1);
	expect(s.moveX).toBeGreaterThan(0);

	target.dispatchEvent(key("keydown", "KeyS"));
	keyboard.poll(s);
	expect(s.moveZ).toBe(0);

	target.dispatchEvent(key("keyup", "KeyW"));
	target.dispatchEvent(key("keyup", "KeyS"));
	target.dispatchEvent(key("keyup", "ArrowRight"));
	keyboard.poll(s);
	expect([s.moveX, s.moveZ]).toEqual([0, 0]);
});

test("remapped keys replace the defaults; blur releases everything", () => {
	const target = new EventTarget();
	const keyboard = createKeyboardSource(target);
	keyboard.setBindings({ ...DEFAULT_BINDINGS, up: ["KeyI"], dash: ["ShiftLeft"] });
	const s = createInputState();
	target.dispatchEvent(key("keydown", "KeyW"));
	keyboard.poll(s);
	expect(s.moveZ).toBe(0);
	target.dispatchEvent(key("keydown", "KeyI"));
	target.dispatchEvent(key("keydown", "ShiftLeft"));
	keyboard.poll(s);
	expect([s.moveZ, s.dash]).toEqual([1, true]);
	target.dispatchEvent(new Event("blur"));
	keyboard.poll(s);
	expect([s.moveZ, s.dash]).toEqual([0, false]);
});

test("gamepad dead zone is radial and rescaled; stick up is +z", () => {
	const out = { x: 0, y: 0 };
	applyDeadZone(0.15, 0.1, 0.2, out);
	expect(out).toEqual({ x: 0, y: 0 });
	applyDeadZone(0.6, 0, 0.2, out);
	expect(out.x).toBeCloseTo(0.5);
	applyDeadZone(1, 1, 0.2, out);
	expect(Math.hypot(out.x, out.y)).toBeCloseTo(1);

	const s = createInputState();
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	readGamepad({ axes: [0, -1], buttons }, s);
	expect([s.moveX, s.moveZ]).toEqual([0, 1]);
	buttons[14] = { pressed: true };
	buttons[0] = { pressed: true };
	readGamepad({ axes: [0, 0], buttons }, s);
	expect([s.moveX, s.moveZ, s.dash]).toEqual([-1, 0, true]);
});

test("merged sources: the strongest movement wins and buttons are OR-ed", () => {
	const target = new EventTarget();
	const stick = createVirtualStick(48);
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	buttons[9] = { pressed: true };
	const sources = createInputSources({
		target,
		stick,
		getGamepads: () => [null, { axes: [0.5, 0], buttons }],
	});
	const s = createInputState();
	sources.poll(s);
	expect(s.moveX).toBeGreaterThan(0.2);
	expect(s.moveX).toBeLessThan(0.5);
	expect(s.pause).toBe(true);

	stick.down(1, 0, 0);
	stick.move(1, 0, -48);
	sources.poll(s);
	expect([s.moveX, s.moveZ]).toEqual([0, 1]);
	sources.dispose();
});

test("dash is on Space, either Shift and gamepad buttons 0 and 5 (GDD 5)", () => {
	for (const code of DEFAULT_BINDINGS.dash) expect(["Space", "ShiftLeft", "ShiftRight"]).toContain(code);
	expect(DEFAULT_BINDINGS.dash).toHaveLength(3);
	const s = createInputState();
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	buttons[5] = { pressed: true };
	readGamepad({ axes: [0, 0], buttons }, s);
	expect(s.dash).toBe(true);
});

test("remapped gamepad buttons dash and pause, the shoulder button keeps dashing and the old buttons stop", () => {
	const s = createInputState();
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	const bindings = { dash: [2, 5], pause: [8] };
	buttons[2] = { pressed: true };
	readGamepad({ axes: [0, 0], buttons }, s, undefined, bindings);
	expect([s.dash, s.pause]).toEqual([true, false]);
	buttons[2] = { pressed: false };
	buttons[5] = { pressed: true };
	buttons[8] = { pressed: true };
	readGamepad({ axes: [0, 0], buttons }, s, undefined, bindings);
	expect([s.dash, s.pause]).toEqual([true, true]);
	buttons[5] = { pressed: false };
	buttons[8] = { pressed: false };
	buttons[0] = { pressed: true };
	buttons[9] = { pressed: true };
	readGamepad({ axes: [0, 0], buttons }, s, undefined, bindings);
	expect([s.dash, s.pause]).toEqual([false, false]);
});

test("the input sources apply a new gamepad remap at once", () => {
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	const sources = createInputSources({
		target: new EventTarget(),
		getGamepads: () => [{ axes: [0, 0], buttons }],
	});
	const s = createInputState();
	buttons[3] = { pressed: true };
	sources.poll(s);
	expect(s.dash).toBe(false);
	sources.setPadBindings({ dash: [3], pause: [9] });
	sources.poll(s);
	expect(s.dash).toBe(true);
});

test("the helpers read the pads of the last poll: a button, and any activity", () => {
	const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
	const axes = [0, 0];
	const sources = createInputSources({ target: new EventTarget(), getGamepads: () => [{ axes, buttons }] });
	const s = createInputState();
	sources.poll(s);
	expect(sources.padButton(8)).toBe(false);
	expect(sources.padActive()).toBe(false);
	buttons[8] = { pressed: true };
	sources.poll(s);
	expect(sources.padButton(8)).toBe(true);
	expect(sources.padButton(2)).toBe(false);
	expect(sources.padActive()).toBe(true);
	buttons[8] = { pressed: false };
	axes[0] = 0.9;
	sources.poll(s);
	expect(sources.padActive()).toBe(true);
	axes[0] = 0.1;
	sources.poll(s);
	expect(sources.padActive()).toBe(false);
});
