import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { heroesData, milestonesData } from "../data";
import { chooseHero, heroUnlocked } from "./heroes";

test("the Carrasco is open and the others wait for their milestone", () => {
	const meta = createMetaState();
	expect(heroUnlocked(milestonesData, meta, "executioner")).toBe(true);
	expect(heroUnlocked(milestonesData, meta, "riddled")).toBe(false);
	expect(heroUnlocked(milestonesData, meta, "penitent")).toBe(false);
	meta.records.grim = 10;
	expect(heroUnlocked(milestonesData, meta, "riddled")).toBe(true);
	expect(heroUnlocked(milestonesData, meta, "penitent")).toBe(false);
	meta.stats.bossKills = 3;
	expect(heroUnlocked(milestonesData, meta, "penitent")).toBe(true);
});

test("a requested hero that is locked or unknown falls back to the default", () => {
	const meta = createMetaState();
	expect(chooseHero(heroesData, milestonesData, meta, "riddled")).toBe("executioner");
	expect(chooseHero(heroesData, milestonesData, meta, "nobody")).toBe("executioner");
	expect(chooseHero(heroesData, milestonesData, meta, null)).toBe("executioner");
	meta.records.normal = 12;
	expect(chooseHero(heroesData, milestonesData, meta, "riddled")).toBe("riddled");
});
