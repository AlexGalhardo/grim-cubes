import { expect, test } from "vitest";
import { clampUnit, createInputState, createVirtualStick } from "./input";

test("virtual stick maps drag to -1..1 and clamps at the radius", () => {
	const stick = createVirtualStick(48);
	stick.down(1, 100, 100);
	stick.move(1, 148, 100);
	expect(stick.x).toBeCloseTo(1);
	expect(stick.z).toBeCloseTo(0);
	stick.move(1, 100, 4);
	expect(stick.z).toBeCloseTo(1);
	stick.move(1, 400, 100);
	expect(Math.hypot(stick.x, stick.z)).toBeCloseTo(1);
	stick.up(1);
	expect([stick.x, stick.z, stick.active]).toEqual([0, 0, false]);
});

test("virtual stick ignores a second pointer while one is active", () => {
	const stick = createVirtualStick(48);
	stick.down(1, 0, 0);
	stick.down(2, 500, 500);
	stick.move(2, 548, 500);
	expect(stick.x).toBe(0);
	stick.up(2);
	expect(stick.active).toBe(true);
});

test("clampUnit normalises diagonals only", () => {
	const s = createInputState();
	s.moveX = 1;
	s.moveZ = 1;
	clampUnit(s);
	expect(Math.hypot(s.moveX, s.moveZ)).toBeCloseTo(1);
	s.moveX = 0.3;
	s.moveZ = 0;
	clampUnit(s);
	expect(s.moveX).toBe(0.3);
});
