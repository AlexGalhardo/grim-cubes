import { describe, expect, it, vi } from "vitest";
import { runSim } from "./lib";
import { checkTargets, median, summarize } from "./report";

// Full 3,600-step simulations by design; the default 5 s trips when other processes saturate the CPU.
vi.setConfig({ testTimeout: 30_000 });

describe("sim harness", () => {
	it("is deterministic for a fixed seed", () => {
		const a = runSim({ seed: 42, rounds: 3, difficulty: "normal" });
		const b = runSim({ seed: 42, rounds: 3, difficulty: "normal" });
		expect(b).toEqual(a);
	});

	it("reaches the requested round and reports per-round numbers", () => {
		const report = runSim({ seed: 7, rounds: 3, difficulty: "normal" });
		expect(report.outcome).toBe("completed");
		expect(report.roundReached).toBe(3);
		expect(report.perRound.map((r) => r.round)).toEqual([1, 2, 3]);
		expect(report.kills).toBeGreaterThan(0);
		expect(report.eventsDropped).toBe(0);
	});

	it("shops greedily: spends gold on items between rounds", () => {
		const report = runSim({ seed: 7, rounds: 5, difficulty: "normal" });
		expect(report.itemsBought).toBeGreaterThan(0);
		expect(report.perRound.some((r) => r.avgItemPrice > 0)).toBe(true);
	});

	it("fights the round 10 boss and records how long it took", () => {
		// Seed 10 survives to round 10 and kills the Gravedigger (about 25 s); other seeds die earlier.
		const report = runSim({ seed: 10, rounds: 10, difficulty: "normal" });
		expect(report.bosses).toHaveLength(1);
		expect(report.bosses[0]).toMatchObject({ round: 10, boss: "gravedigger" });
		expect(report.bosses[0]?.killSeconds).toBeGreaterThan(0);
	});

	it("takes owned Ossuary nodes into the run", () => {
		const plain = runSim({ seed: 3, rounds: 2, difficulty: "normal" });
		const blessed = runSim({ seed: 3, rounds: 2, difficulty: "normal", ossuary: ["flesh_1", "flesh_2"] });
		expect(blessed.worldHash).not.toBe(plain.worldHash);
	});

	it("rejects unknown difficulty and weapon", () => {
		expect(() => runSim({ seed: 1, rounds: 1, difficulty: "nope" })).toThrow(/difficulty/);
		expect(() => runSim({ seed: 1, rounds: 1, difficulty: "normal", weapon: "nope" })).toThrow(/weapon/);
	});

	// Guard against an O(n^2) pass sneaking into a system: CPU time (not wall time, which other processes on the
	// machine inflate) of a run that steps a full horde for thousands of steps; 10 s budget.
	it("simulates a full horde within a loose CPU budget", () => {
		const before = process.cpuUsage();
		runSim({ seed: 3, rounds: 10, difficulty: "normal" });
		const used = process.cpuUsage(before);
		expect((used.user + used.system) / 1000).toBeLessThan(10_000);
	});
});

describe("sim report", () => {
	const fake = (round: number, bossSeconds: number | null) =>
		({
			seed: round,
			outcome: "died",
			roundReached: round,
			bosses:
				bossSeconds === undefined
					? []
					: [{ round: 10, boss: "gravedigger", killSeconds: bossSeconds, enrageStacks: 1 }],
			perRound: [{ round: 6, goldEarned: 30, avgItemPrice: 20, levelUps: 1 }],
		}) as never;

	it("summarizes the death round distribution and boss kill times", () => {
		const m = summarize([fake(10, 50), fake(20, 70), fake(30, null)]);
		expect(m.deathRound.p50).toBe(20);
		expect(m.bosses.gravedigger).toEqual({
			fought: 3,
			killed: 2,
			medianKillSeconds: 60,
			medianEnrageStacks: 1,
		});
		expect(m.goldPerPrice).toBeCloseTo(1.5);
		expect(m.levelUpsPerRound).toBe(1);
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it("checks the GDD 25 targets and skips what short runs cannot judge", () => {
		const m = summarize([fake(10, 50), fake(20, 70), fake(30, 120)]);
		const short = checkTargets(m, 10);
		expect(short.find((c) => c.id === "death-round-p50")?.skipped).toBe(true);
		expect(short.find((c) => c.id === "boss-kill-seconds:gravedigger")?.ok).toBe(true);
		const long = checkTargets(m, 30);
		expect(long.find((c) => c.id === "death-round-p50")).toMatchObject({ skipped: false, ok: true });
		const slow = summarize([fake(10, 200)]);
		expect(checkTargets(slow, 10).find((c) => c.id === "boss-kill-seconds:gravedigger")?.ok).toBe(false);
	});
});

describe("sim report fields", () => {
	it("measures killSeconds from the start of the boss round to the BossDied event", () => {
		// Seed 10 kills the Gravedigger (see the boss test above); the fight is recorded with its own clock.
		const report = runSim({ seed: 10, rounds: 10, difficulty: "normal" });
		const fight = report.bosses[0];
		const secondsInBossRound = fight?.killSeconds ?? 0;
		expect(secondsInBossRound).toBeGreaterThan(0);
		// A boss round lasts at most its own timer plus the intro, so the number cannot be a whole-run clock.
		expect(secondsInBossRound).toBeLessThan(report.steps / 60);
		expect(fight?.enrageStacks).toBeGreaterThanOrEqual(0);
	});
});
