import { expect, test } from "vitest";
import { createLoop, MAX_STEPS, STEP } from "./loop";

function harness() {
	const calls = { simulate: 0, render: [] as number[], publish: 0 };
	const loop = createLoop({
		simulate: () => calls.simulate++,
		render: (alpha) => calls.render.push(alpha),
		publish: () => calls.publish++,
	});
	return { loop, calls };
}

test("dt = 1 s runs exactly MAX_STEPS steps and flags a slow frame", () => {
	const { loop, calls } = harness();
	loop.frame(0);
	loop.frame(1000);
	expect(calls.simulate).toBe(MAX_STEPS);
	expect(loop.slowFrame).toBe(1);
	expect(calls.render.at(-1)).toBe(0);
});

test("accumulates sub-step time into alpha", () => {
	const { loop, calls } = harness();
	loop.frame(0);
	loop.frame((STEP * 1000) / 2);
	expect(calls.simulate).toBe(0);
	expect(calls.render.at(-1)).toBeCloseTo(0.5);
	loop.frame(STEP * 1000);
	expect(calls.simulate).toBe(1);
	expect(loop.slowFrame).toBe(0);
});

test("pause keeps rendering without simulating, resume ignores the gap", () => {
	const { loop, calls } = harness();
	loop.frame(0);
	loop.pause();
	loop.frame(500);
	expect(calls.simulate).toBe(0);
	expect(calls.render).toHaveLength(2);
	loop.resume();
	loop.frame(60_000);
	expect(calls.simulate).toBe(0);
});

test("2x simulates twice the steps in the same real time and never passes the ceiling", () => {
	const { loop, calls } = harness();
	loop.frame(0);
	loop.frame(STEP * 1000 * 2);
	expect(calls.simulate).toBe(2);
	loop.setSpeed(2);
	const before = calls.simulate;
	loop.frame(STEP * 1000 * 2 + STEP * 1000 * 3);
	expect(calls.simulate - before).toBe(6);
	expect(loop.speed).toBe(2);
	const budget = calls.simulate;
	loop.frame(10_000);
	expect(calls.simulate - budget).toBe(MAX_STEPS * 2);
	expect(loop.slowFrame).toBe(1);
});

test("speed is clamped to 1..3 and each step is still exactly STEP", () => {
	const steps: number[] = [];
	const loop = createLoop({
		simulate: (s) => steps.push(s),
		render: () => undefined,
		publish: () => undefined,
	});
	loop.setSpeed(9);
	expect(loop.speed).toBe(3);
	loop.setSpeed(0);
	expect(loop.speed).toBe(1);
	loop.setSpeed(3);
	loop.frame(0);
	loop.frame(STEP * 1000);
	expect(steps).toEqual([STEP, STEP, STEP]);
});
