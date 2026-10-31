import { expect, test } from "vitest";
import { ALIVE_LIMIT, checkTargets, type Metrics, rangesFor } from "./report";

const metrics = (runs: number, survivors: number): Metrics => ({
	runs,
	deathRound: { p50: 24, p25: 14, p75: 35, iqr: 21, mean: 23, stdev: 11 },
	survivors,
	bosses: {},
	goldPerPrice: 1.5,
	levelUpsPerRound: 1.3,
});

const alive = (m: Metrics, rounds = 35): ReturnType<typeof checkTargets>[number] | undefined =>
	checkTargets(m, rounds).find((c) => c.id === "alive-fraction-at-horizon");

test("the alive-at-horizon check passes up to the limit and fails above it", () => {
	expect(alive(metrics(100, 45))?.ok).toBe(true);
	expect(alive(metrics(100, 46))?.ok).toBe(false);
	expect(ALIVE_LIMIT).toBe(0.45);
});

test("the alive-at-horizon check is skipped for short runs", () => {
	expect(alive(metrics(100, 90), 10)?.skipped).toBe(true);
});

const p50Check = (p50: number, profile: Parameters<typeof checkTargets>[2]): boolean | undefined =>
	checkTargets(
		{ ...metrics(100, 10), deathRound: { ...metrics(100, 10).deathRound, p50 } },
		35,
		profile,
	).find((c) => c.id === "death-round-p50")?.ok;

test("the p50 range follows the difficulty and the policy (GDD 25.1)", () => {
	expect(rangesFor({ difficulty: "normal", policy: "greedy" }).p50).toEqual([18, 26]);
	expect(rangesFor({ difficulty: "grim", policy: "greedy" }).p50).toEqual([14, 22]);
	expect(rangesFor({ difficulty: "nightmare", policy: "greedy" }).p50).toEqual([11, 18]);
	expect(p50Check(16, { difficulty: "grim", policy: "greedy" })).toBe(true);
	expect(p50Check(16, { difficulty: "normal", policy: "greedy" })).toBe(false);
	expect(p50Check(30, { difficulty: "normal", policy: "tank" })).toBe(true);
	expect(p50Check(30, { difficulty: "normal", policy: "greedy" })).toBe(false);
	expect(p50Check(28, { difficulty: "nightmare", policy: "tank" })).toBe(false);
});

test("the tank may leave more runs alive and take longer on the bosses than the greedy bot", () => {
	const tank = rangesFor({ difficulty: "normal", policy: "tank" });
	const greedy = rangesFor({ difficulty: "normal", policy: "greedy" });
	expect(tank.alive).toBeGreaterThan(greedy.alive);
	expect(tank.killMax.other).toBeGreaterThan(greedy.killMax.other);
	expect(rangesFor({ difficulty: "nightmare", policy: "tank" }).enrageBelow).toBe(4);
});

test("Easy expects a late p50 with most runs alive and accepts a little less gold per price", () => {
	const greedy = rangesFor({ difficulty: "easy", policy: "greedy" });
	const tank = rangesFor({ difficulty: "easy", policy: "tank" });
	expect(greedy.p50).toEqual([30, 35]);
	expect(greedy.alive).toBe(0.85);
	expect(tank.alive).toBe(0.9);
	expect(greedy.goldMin).toBe(1.1);
	expect(rangesFor({ difficulty: "normal", policy: "greedy" }).goldMin).toBe(1.2);
	expect(p50Check(32, { difficulty: "easy", policy: "greedy" })).toBe(true);
	expect(p50Check(24, { difficulty: "easy", policy: "greedy" })).toBe(false);
});
