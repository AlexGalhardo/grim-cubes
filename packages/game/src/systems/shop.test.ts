import { createSpatialHash, mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { heroData, itemsData, roundsData, weaponsData } from "../data";
import { createEventBuffer } from "../ecs/events";
import { createProjectilePool } from "../ecs/projectile";
import { createGameWorld, spawnBody } from "../ecs/world";
import type { ShopItem, ShopSlot, ShopWeapon } from "../rules/shop";
import { createPlayerStats } from "../rules/stats";
import { createDamageSystem } from "./damage";
import { createProgress } from "./loot";
import { createShopSystem } from "./shop";
import { createStatsSystem } from "./stats";
import { createTargetingSystem } from "./targeting";
import { createWeaponSystem } from "./weapon";

function setup(round = 3, seed = 1) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	const events = createEventBuffer(64);
	const hash = createSpatialHash();
	const stats = createStatsSystem(heroData, createPlayerStats());
	const damage = createDamageSystem({
		config: {
			armorConstant: 6.66,
			dodgeCap: 0.6,
			lifeStealHpPerSecond: 10,
			lifeStealTriggerSeconds: 0.1,
			iFramesOnHitSeconds: 0.3,
			knockbackDurationSeconds: 0.1,
			bossKnockbackMult: 0.1,
			eliteKnockbackMult: 0.5,
		},
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events,
		hero,
		stats: stats.stats,
	});
	const weapon = createWeaponSystem({
		weapon: weaponsData.find((w) => w.id === "sword") as (typeof weaponsData)[number],
		tier: 0,
		stats: stats.stats,
		attackSpeedCap: 12,
		queue: damage.queue,
		events,
		targeting: createTargetingSystem({ priorityDistanceMult: 0.8, retargetEvery: 3 }, hash),
		enemies: hash,
		rng: mulberry32(3),
		projectiles: createProjectilePool(world, events, 4),
	});
	const progress = createProgress();
	const roundRef = { value: round };
	const shop = createShopSystem({
		config: roundsData.shop,
		tiers: roundsData.tierChance,
		catalog: {
			items: itemsData as unknown as ShopItem[],
			weapons: weaponsData as unknown as ShopWeapon[],
		},
		weaponDefs: weaponsData,
		rng: mulberry32(seed),
		progress,
		stats,
		weapon,
		round: () => roundRef.value,
	});
	return { shop, progress, stats, weapon, roundRef };
}

const firstOf = (slots: readonly ShopSlot[], kind: ShopSlot["kind"]): number =>
	slots.findIndex((s) => s.kind === kind);

test("buying an item charges the price and applies its modifiers", () => {
	const { shop, progress, stats } = setup(3);
	shop.open();
	const index = firstOf(shop.slots, "item");
	const slot = shop.slots[index] as ShopSlot;
	progress.gold = slot.price - 1;
	expect(shop.buy(index)).toBe(false);
	progress.gold = slot.price + 5;
	expect(shop.buy(index)).toBe(true);
	expect(progress.gold).toBe(5);
	expect(stats.stats.dirty).toBe(true);
	expect(shop.owned.get(slot.id)).toBe(1);
	expect(shop.slots[index]?.sold).toBe(true);
	expect(shop.buy(index)).toBe(false);
});

test("buying a new weapon swaps it and refunds half of what the old one cost", () => {
	for (let seed = 1; seed < 200; seed++) {
		const s = setup(2, seed);
		s.shop.open();
		const index = firstOf(s.shop.slots, "weapon");
		if (index < 0) continue;
		const slot = s.shop.slots[index] as ShopSlot;
		const oldPaid = s.shop.paid;
		s.progress.gold = 1000;
		expect(s.shop.buy(index)).toBe(true);
		expect(s.weapon.weapon.id).toBe(slot.id);
		expect(s.weapon.tier).toBe(0);
		expect(s.progress.gold).toBe(1000 + Math.floor(oldPaid * 0.5) - slot.price);
		expect(s.shop.paid).toBe(slot.price);
		return;
	}
	throw new Error("no weapon offer in 200 seeds");
});

test("an upgrade raises the tier once per purchase and adds to the paid total", () => {
	for (let seed = 1; seed < 300; seed++) {
		const s = setup(2, seed);
		s.shop.open();
		const index = firstOf(s.shop.slots, "upgrade");
		if (index < 0) continue;
		const slot = s.shop.slots[index] as ShopSlot;
		const paidBefore = s.shop.paid;
		s.progress.gold = 500;
		expect(s.shop.buy(index)).toBe(true);
		expect(s.weapon.tier).toBe(1);
		expect(s.shop.paid).toBe(paidBefore + slot.price);
		return;
	}
	throw new Error("no upgrade offer in 300 seeds");
});

test("reroll charges the escalating price and keeps locked slots", () => {
	const { shop, progress } = setup(10, 2);
	progress.gold = 100;
	shop.open();
	shop.toggleLock(1);
	const lockedBefore = shop.slots[1];
	expect(shop.rerollPrice).toBe(11);
	expect(shop.reroll()).toBe(true);
	expect(progress.gold).toBe(89);
	expect(shop.rerollPrice).toBe(15);
	expect(shop.slots[1]).toEqual(lockedBefore);
	progress.gold = 3;
	expect(shop.reroll()).toBe(false);
	expect(progress.gold).toBe(3);
});

test("open() resets the reroll counter and the view mirrors affordability", () => {
	const { shop, progress } = setup(5, 3);
	progress.gold = 200;
	shop.open();
	shop.reroll();
	shop.open();
	expect(shop.rerollPrice).toBe(5);
	progress.gold = 0;
	const view = shop.view();
	expect(view.slots).toHaveLength(4);
	expect(view.slots.every((s) => !s.affordable)).toBe(true);
	expect(view.slots.some((s) => s.kind === "item" && s.lines.length > 0)).toBe(true);
});

test("free rerolls cost nothing and do not escalate the paid price", () => {
	const { shop, progress, stats } = setup(10, 2);
	stats.add([{ stat: "free_rerolls", op: "add", value: 1 }]);
	stats.run(0);
	progress.gold = 100;
	shop.open();
	expect(shop.rerollPrice).toBe(0);
	expect(shop.reroll()).toBe(true);
	expect(progress.gold).toBe(100);
	expect(shop.rerollPrice).toBe(11);
});
