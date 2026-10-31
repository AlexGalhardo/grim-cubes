import { describe, expect, it, vi } from "vitest";
import { loadSimData, runSim } from "./lib";

const data = loadSimData();

// Full 3,600-step simulations by design; the default 5 s trips when other processes saturate the CPU.
vi.setConfig({ testTimeout: 20_000 });

describe("sim harness", () => {
	it("is deterministic for a fixed seed", () => {
		const a = runSim(data, { seed: 42, rounds: 3, difficulty: "normal" });
		const b = runSim(data, { seed: 42, rounds: 3, difficulty: "normal" });
		expect(b).toEqual(a);
	});

	it("reaches the requested round and reports per-round numbers", () => {
		const report = runSim(data, { seed: 7, rounds: 3, difficulty: "normal" });
		expect(report.outcome).toBe("completed");
		expect(report.roundReached).toBe(3);
		expect(report.perRound.map((r) => r.round)).toEqual([1, 2, 3]);
		expect(report.kills).toBeGreaterThan(0);
		expect(report.eventsDropped).toBe(0);
	});

	it("stops at the first boss round (no boss system yet)", () => {
		const report = runSim(data, { seed: 1, rounds: 10, difficulty: "normal" });
		expect(["boss-round", "died"]).toContain(report.outcome);
	});

	// Guard against an O(n^2) pass sneaking into a system: CPU time (not wall time, which other processes on the
	// machine inflate) of a run that steps a full horde for thousands of steps. ~1.8 s on node when written (0.25 s on bun); 10 s budget.
	it("simulates a full horde within a loose CPU budget", () => {
		const before = process.cpuUsage();
		runSim(data, { seed: 3, rounds: 10, difficulty: "normal" });
		const used = process.cpuUsage(before);
		expect((used.user + used.system) / 1000).toBeLessThan(10_000);
	});

	it("rejects unknown difficulty and weapon", () => {
		expect(() => runSim(data, { seed: 1, rounds: 1, difficulty: "nope" })).toThrow(/difficulty/);
		expect(() => runSim(data, { seed: 1, rounds: 1, difficulty: "normal", weapon: "nope" })).toThrow(
			/weapon/,
		);
	});
});
