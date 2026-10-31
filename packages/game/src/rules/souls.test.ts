import { expect, test } from "vitest";
import { roundsData } from "../data";
import { soulsForRun } from "./souls";

const config = {
	perRound: roundsData.souls.perRound,
	perElite: roundsData.souls.perElite,
	bossBase: roundsData.boss.soulsBase,
	bossPerRound: roundsData.boss.soulsPerRound,
};

test("dying in round 12 with 1 elite and 1 boss (round 10) gives 285 souls on Normal", () => {
	expect(soulsForRun(config, { round: 12, elitesKilled: 1, bossRounds: [10] })).toBe(285);
});

test("a run to round 30 with 3 bosses and 5 elites follows the formula (the GDD example says 630 for the bosses, the formula gives 900)", () => {
	expect(soulsForRun(config, { round: 30, elitesKilled: 5, bossRounds: [10, 20, 30] })).toBe(
		150 + 125 + 900,
	);
});

test("difficulty and soul_gain multiply, rounding down", () => {
	const run = { round: 12, elitesKilled: 1, bossRounds: [10] };
	expect(soulsForRun(config, run, 1.5)).toBe(427);
	expect(soulsForRun(config, run, 1, 0.5)).toBe(427);
	expect(soulsForRun(config, { round: 1, elitesKilled: 0, bossRounds: [] })).toBe(5);
});
