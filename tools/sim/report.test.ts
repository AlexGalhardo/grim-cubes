import { expect, test } from "vitest";
import { ALIVE_LIMIT, checkTargets, type Metrics } from "./report";

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
