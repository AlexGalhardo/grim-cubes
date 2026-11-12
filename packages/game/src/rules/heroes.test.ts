import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { heroesData, milestonesData } from "../data";
import { chooseHero, heroUnlocked } from "./heroes";

test("the Warrior is open; the Ranged waits for the round 10 boss and the Mage for the round 20 boss", () => {
	const meta = createMetaState();
	expect(heroUnlocked(milestonesData, meta, "warrior")).toBe(true);
	expect(heroUnlocked(milestonesData, meta, "ranged")).toBe(false);
	expect(heroUnlocked(milestonesData, meta, "mage")).toBe(false);
	meta.stats.bestBossRound = 5;
	expect(heroUnlocked(milestonesData, meta, "ranged")).toBe(false);
	meta.stats.bestBossRound = 10;
	expect(heroUnlocked(milestonesData, meta, "ranged")).toBe(true);
	expect(heroUnlocked(milestonesData, meta, "mage")).toBe(false);
	meta.stats.bestBossRound = 20;
	expect(heroUnlocked(milestonesData, meta, "mage")).toBe(true);
});

test("a requested class that is locked or unknown falls back to the Warrior", () => {
	const meta = createMetaState();
	expect(chooseHero(heroesData, milestonesData, meta, "ranged")).toBe("warrior");
	expect(chooseHero(heroesData, milestonesData, meta, "nobody")).toBe("warrior");
	expect(chooseHero(heroesData, milestonesData, meta, null)).toBe("warrior");
	meta.stats.bestBossRound = 10;
	expect(chooseHero(heroesData, milestonesData, meta, "ranged")).toBe("ranged");
});
