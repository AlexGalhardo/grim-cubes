import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { equipmentData, heroData, roundsData } from "../data";
import { createPlayerStats } from "../rules/stats";
import { createProgress } from "./loot";
import { createShopSystem } from "./shop";
import { createStatsSystem } from "./stats";

function setup(round = 3, seed = 1) {
	const stats = createStatsSystem(heroData, createPlayerStats());
	const progress = createProgress();
	const shop = createShopSystem({
		config: roundsData.shop,
		equipment: equipmentData,
		rng: mulberry32(seed),
		progress,
		stats,
		round: () => round,
	});
	return { shop, stats, progress };
}

test("a fresh shop opens with one offer per slot and nothing equipped", () => {
	const s = setup();
	s.shop.open();
	expect(s.shop.slots).toHaveLength(equipmentData.slots.length);
	expect(s.shop.levels).toEqual([0, 0, 0, 0, 0, 0]);
});

test("buying an offer equips it, charges the price and applies its attributes", () => {
	const s = setup(1);
	s.shop.open();
	const offer = s.shop.slots[0];
	if (!offer) throw new Error("no offer");
	s.progress.gold = offer.price + 5;
	const armorBefore = s.stats.stats.armor;
	expect(s.shop.buy(0)).toBe(true);
	s.stats.run(0);
	expect(s.progress.gold).toBe(5);
	expect(s.shop.levels[0]).toBe(offer.level);
	expect(s.stats.stats.armor).toBeGreaterThan(armorBefore);
	expect(s.shop.slots[0]?.sold).toBe(true);
	expect(s.shop.buy(0)).toBe(false);
	// The equipment bonus is not a saved modifier: the checkpoint stores the levels instead.
	expect(s.stats.modifiers).toEqual([]);
});

test("a better piece replaces the equipped one instead of stacking on it", () => {
	const s = setup(1);
	s.shop.open();
	s.progress.gold = 1000;
	s.shop.buy(0);
	s.stats.run(0);
	const armor1 = s.stats.stats.armor;
	s.shop.reroll();
	s.shop.buy(0);
	s.stats.run(0);
	expect(s.shop.levels[0]).toBe(2);
	const level2 = equipmentData.slots[0]?.levels[1]?.modifiers.find((m) => m.stat === "armor")?.value ?? 0;
	expect(s.stats.stats.armor).toBe(level2);
	expect(s.stats.stats.armor).toBeGreaterThan(armor1);
});

test("a purchase is refused without gold", () => {
	const s = setup();
	s.shop.open();
	s.progress.gold = 0;
	expect(s.shop.buy(0)).toBe(false);
	expect(s.shop.levels[0]).toBe(0);
});

test("a slot at the gold cap gets no more offers, and rerolls never sell a worse piece", () => {
	const s = setup(40, 7);
	s.shop.restoreLevels([6, 2, 0, 0, 0, 0]);
	s.progress.gold = 10_000;
	s.shop.open();
	for (let i = 0; i < 10; i++) {
		expect(s.shop.slots.every((o) => o.slot !== 0)).toBe(true);
		for (const o of s.shop.slots) expect(o.level).toBeGreaterThan(s.shop.levels[o.slot] ?? 0);
		s.shop.reroll();
	}
});

test("a reroll charges a price that grows, and free rerolls make the first ones cost nothing", () => {
	const s = setup(10);
	s.shop.open();
	const first = s.shop.rerollPrice;
	s.progress.gold = first;
	expect(s.shop.reroll()).toBe(true);
	expect(s.progress.gold).toBe(0);
	expect(s.shop.rerollPrice).toBeGreaterThan(first);
	expect(s.shop.reroll()).toBe(false);
	s.stats.add([{ stat: "free_rerolls", op: "add", value: 1 }]);
	s.stats.run(0);
	s.shop.open();
	expect(s.shop.rerollPrice).toBe(0);
});

test("a locked offer stays through a reroll", () => {
	const s = setup(1);
	s.shop.open();
	s.progress.gold = 1000;
	const kept = s.shop.slots[1];
	s.shop.toggleLock(1);
	s.shop.reroll();
	expect(s.shop.slots[1]).toEqual({ ...kept, locked: true });
});

test("restored levels come back with their attributes and are clamped to the data", () => {
	const s = setup();
	s.shop.restoreLevels([10, 99, -3, 0, 4]);
	s.stats.run(0);
	expect(s.shop.levels).toEqual([10, 10, 0, 0, 4, 0]);
	expect(s.stats.stats.armor).toBeGreaterThan(0);
});

test("the view lists the offers with their attribute lines and whether the hero can pay", () => {
	const s = setup(1);
	s.shop.open();
	s.progress.gold = 0;
	const view = s.shop.view();
	expect(view.slots).toHaveLength(equipmentData.slots.length);
	expect(view.slots.every((o) => !o.affordable && o.lines.length > 0)).toBe(true);
	expect(view.slots[0]?.slot).toBe("helmet");
});

test("fragments raise a slot from 6 to 9 step by step, a relic raises it to 10, and each refuses without its material", () => {
	const s = setup();
	s.shop.restoreLevels([6, 3, 0, 0, 0, 0]);
	const [seven, eight, nine, ten] = equipmentData.upgrades;
	expect([seven?.level, eight?.level, nine?.level, ten?.level]).toEqual([7, 8, 9, 10]);

	// Gold levels are not sold for materials, and an empty wallet buys nothing.
	expect(s.shop.upgrade(1)).toBe(false);
	expect(s.shop.upgrade(0)).toBe(false);
	expect(s.shop.levels[0]).toBe(6);

	s.progress.eliteFragments = (seven?.fragments ?? 0) - 1;
	expect(s.shop.upgrade(0)).toBe(false);
	s.progress.eliteFragments = (seven?.fragments ?? 0) + (eight?.fragments ?? 0) + (nine?.fragments ?? 0);
	expect(s.shop.upgrade(0)).toBe(true);
	expect(s.shop.levels[0]).toBe(7);
	expect(s.shop.upgrade(0)).toBe(true);
	expect(s.shop.upgrade(0)).toBe(true);
	expect(s.shop.levels[0]).toBe(9);
	expect(s.progress.eliteFragments).toBe(0);

	// Level 10 takes a relic, never fragments.
	s.progress.eliteFragments = 100;
	expect(s.shop.upgrade(0)).toBe(false);
	s.progress.relics = 1;
	expect(s.shop.upgrade(0)).toBe(true);
	expect(s.shop.levels[0]).toBe(10);
	expect(s.progress.relics).toBe(0);
	expect(s.progress.eliteFragments).toBe(100);
	expect(s.shop.upgrade(0)).toBe(false);
});

test("a material upgrade applies the new level's attributes and is offered only to a slot that reached 6", () => {
	const s = setup();
	s.shop.restoreLevels([6, 0, 0, 0, 0, 0]);
	s.progress.eliteFragments = 10;
	s.stats.run(0);
	const before = s.stats.stats.armor;
	s.shop.upgrade(0);
	s.stats.run(0);
	const level7 = equipmentData.slots[0]?.levels[6]?.modifiers.find((m) => m.stat === "armor")?.value ?? 0;
	expect(s.stats.stats.armor).toBe(level7);
	expect(s.stats.stats.armor).toBeGreaterThan(before);

	s.shop.open();
	const view = s.shop.view();
	expect(view.upgrades.map((u) => u.next)).toEqual([8, null, null, null, null, null]);
	expect(view.upgrades[0]).toMatchObject({
		slot: "helmet",
		level: 7,
		fragments: 3,
		relics: 0,
		affordable: true,
	});
	expect([view.fragments, view.relics]).toEqual([s.progress.eliteFragments, 0]);
});
