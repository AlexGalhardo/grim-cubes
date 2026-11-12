import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { milestonesData } from "../data";
import { isReached, unlockedSkins } from "./milestones";

test("the round 50 skin unlocks from the best record on any difficulty", () => {
	const meta = createMetaState();
	expect(unlockedSkins(milestonesData, meta)).toEqual([]);
	meta.records.grim = 50;
	expect(unlockedSkins(milestonesData, meta).map((s) => s.id)).toEqual(["iron_executioner"]);
	const round = milestonesData.milestones.find((m) => m.id === "round_50");
	expect(round && isReached(round, meta)).toBe(true);
});

test("the Ranged and the Mage open with the boss of round 10 and of round 20", () => {
	const meta = createMetaState();
	const gate = (hero: string) => milestonesData.milestones.find((m) => m.unlocksHero === hero);
	expect(gate("ranged") && isReached(gate("ranged") as never, meta)).toBe(false);
	meta.stats.bestBossRound = 10;
	expect(isReached(gate("ranged") as never, meta)).toBe(true);
	expect(isReached(gate("mage") as never, meta)).toBe(false);
	meta.stats.bestBossRound = 20;
	expect(isReached(gate("mage") as never, meta)).toBe(true);
});
