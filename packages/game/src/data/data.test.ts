import { expect, test } from "vitest";
import { cardsData, enemiesData, heroData, roundsData, toEnemyDefs, weaponsData, worldData } from "./index";

test("loaders expose the data files with the shapes the systems read", () => {
	expect(heroData.base.speed).toBe(6);
	expect(roundsData.spawn.maxSimultaneous).toBe(100);
	expect(worldData.chunkSize).toBe(16);
	expect(cardsData.cards.length).toBeGreaterThan(0);
	expect(weaponsData.some((w) => w.id === heroData.startingWeapon)).toBe(true);
});

test("toEnemyDefs keeps the file order and maps behaviors and armor", () => {
	const defs = toEnemyDefs(enemiesData);
	expect(defs).toHaveLength(enemiesData.length);
	expect(defs[0]?.radius).toBe(enemiesData[0]?.radius);
	const forged = enemiesData.findIndex((e) => e.id === "forged");
	expect(defs[forged]?.armor).toBe(10);
	const wail = enemiesData.findIndex((e) => e.id === "wail");
	expect(defs[wail]?.behavior).toBe(1);
});
