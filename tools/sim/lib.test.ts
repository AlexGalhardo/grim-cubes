import { describe, expect, it } from "vitest";
import { loadSimData, runSim } from "./lib";

const data = loadSimData();

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

	it("rejects unknown difficulty and weapon", () => {
		expect(() => runSim(data, { seed: 1, rounds: 1, difficulty: "nope" })).toThrow(/difficulty/);
		expect(() => runSim(data, { seed: 1, rounds: 1, difficulty: "normal", weapon: "nope" })).toThrow(
			/weapon/,
		);
	});
});
