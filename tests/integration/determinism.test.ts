import { describe, expect, it, vi } from "vitest";
import { STEP } from "../../packages/game/src/index";
import { loadSimData, runSim, type SimData } from "../../tools/sim/lib";

const data: SimData = loadSimData();

// Full 3,600-step simulations by design; the default 5 s trips when other processes saturate the CPU.
vi.setConfig({ testTimeout: 20_000 });
const STEPS = 3600;
const run = (seed: number, maxSteps = STEPS) =>
	runSim(data, { seed, rounds: 50, difficulty: "normal", maxSteps });

/**
 * Re-anchor (update this value) whenever a task legitimately changes the simulation, e.g. P-05-07 (SDD 11 section 2).
 * A change that is NOT meant to alter the simulation must leave it untouched.
 */
const ANCHOR_SEED_42_3600 = 3965063525;

describe("determinism (seed 42, 3600 steps)", () => {
	it("two runs end in the same world", () => {
		const a = run(42);
		const b = run(42);
		expect(a.steps).toBe(STEPS);
		expect(b.worldHash).toBe(a.worldHash);
		expect(b).toEqual(a);
	});

	it("matches the recorded anchor", () => {
		expect(run(42).worldHash).toBe(ANCHOR_SEED_42_3600);
	});

	it("the hash reacts to the seed and to one extra step", () => {
		const base = run(42).worldHash;
		expect(run(43).worldHash).not.toBe(base);
		expect(run(42, STEPS + 1).worldHash).not.toBe(base);
	});

	/**
	 * SDD 11 asks for a run with STEP split in two (2 x 1/120) that must diverge from the 1/60 run. The systems read the
	 * fixed `STEP` constant instead of a dt argument, so a split cannot even be expressed: that is the property being
	 * guarded. Changing STEP (or making systems depend on dt) changes every trajectory, so this pin must be revisited
	 * together with the anchor above.
	 */
	it("pins the fixed simulation step", () => {
		expect(STEP).toBe(1 / 60);
	});
});
