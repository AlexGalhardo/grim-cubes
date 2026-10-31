import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { itemsData, milestonesData } from "../data";
import { availableItems, isReached, lockedItemIds, unlockedSkins } from "./milestones";

const ids = (meta: ReturnType<typeof createMetaState>): string[] =>
	availableItems(itemsData, milestonesData, meta).map((i) => i.id);

test("cube_of_wrath stays out of the pool until 1,000 kills and comes in after", () => {
	const meta = createMetaState();
	meta.stats.kills = 999;
	expect(ids(meta)).not.toContain("cube_of_wrath");
	meta.stats.kills = 1000;
	expect(ids(meta)).toContain("cube_of_wrath");
	expect(ids(meta)).not.toContain("warlord_banner");
});

test("warlord_banner needs 10,000 kills and executioner_mark 5 bosses", () => {
	const meta = createMetaState();
	expect(lockedItemIds(milestonesData, meta)).toEqual(
		new Set(["cube_of_wrath", "warlord_banner", "executioner_mark"]),
	);
	meta.stats.kills = 10_000;
	meta.stats.bossKills = 5;
	expect(lockedItemIds(milestonesData, meta).size).toBe(0);
	expect(availableItems(itemsData, milestonesData, meta)).toBe(itemsData);
});

test("the round 50 skin unlocks from the best record on any difficulty", () => {
	const meta = createMetaState();
	expect(unlockedSkins(milestonesData, meta)).toEqual([]);
	meta.records.grim = 50;
	expect(unlockedSkins(milestonesData, meta).map((s) => s.id)).toEqual(["iron_executioner"]);
	const round = milestonesData.milestones.find((m) => m.id === "round_50");
	expect(round && isReached(round, meta)).toBe(true);
});
