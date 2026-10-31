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
