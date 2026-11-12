import { expect, test } from "vitest";
import { equipmentData, heroData } from "../data";
import { equipmentModifiers, MAX_EQUIPMENT_LEVEL } from "./equipment";
import { computeStats, createPlayerStats } from "./stats";

test("six slots with ten levels each, and stats that only ever grow with the level", () => {
	expect(equipmentData.slots.map((s) => s.id)).toEqual([
		"helmet",
		"armor",
		"pants",
		"boots",
		"ring",
		"amulet",
	]);
	for (const slot of equipmentData.slots) {
		expect(slot.levels).toHaveLength(MAX_EQUIPMENT_LEVEL);
		for (let i = 1; i < slot.levels.length; i++) {
			const before = slot.levels[i - 1];
			const now = slot.levels[i];
			expect(now?.modifiers.length).toBe(before?.modifiers.length);
			for (const [j, m] of (now?.modifiers ?? []).entries())
				expect(m.value).toBeGreaterThan(before?.modifiers[j]?.value ?? 0);
		}
	}
});

test("only the levels up to the gold cap have a price, and prices rise with the level", () => {
	for (const slot of equipmentData.slots) {
		const prices = slot.levels.map((l) => l.price);
		expect(prices.slice(0, equipmentData.goldMaxLevel).every((p) => typeof p === "number")).toBe(true);
		expect(prices.slice(equipmentData.goldMaxLevel).every((p) => p === undefined)).toBe(true);
		const gold = prices.slice(0, equipmentData.goldMaxLevel) as number[];
		for (const [i, p] of gold.entries()) expect(p).toBeGreaterThan(gold[i - 1] ?? 0);
	}
});

test("equipment modifiers add up per equipped slot, and an empty slot adds nothing", () => {
	expect(equipmentModifiers(equipmentData, [0, 0, 0, 0, 0, 0])).toEqual([]);
	const helmet3 = equipmentData.slots[0]?.levels[2]?.modifiers ?? [];
	const ring10 = equipmentData.slots[4]?.levels[9]?.modifiers ?? [];
	expect(equipmentModifiers(equipmentData, [3, 0, 0, 0, 10, 0])).toEqual([...helmet3, ...ring10]);
});

test("the attributes of a level reach the hero's stats", () => {
	const none = createPlayerStats();
	const geared = createPlayerStats();
	computeStats(heroData, [], none);
	computeStats(
		heroData,
		[],
		geared,
		undefined,
		equipmentModifiers(equipmentData, [10, 10, 10, 10, 10, 10]),
	);
	expect(geared.armor).toBeGreaterThan(none.armor);
	expect(geared.maxHp).toBeGreaterThan(none.maxHp);
	expect(geared.speed).toBeGreaterThan(none.speed);
	expect(geared.damage).toBeGreaterThan(none.damage);
});
