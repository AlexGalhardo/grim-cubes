import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { itemsData, roundsData, weaponsData } from "../data";
import {
	type GenerateContext,
	generateShop,
	rerollPrice,
	rollTier,
	type ShopItem,
	type ShopSlot,
	type ShopWeapon,
	sellValue,
	shopPrice,
	tierChance,
} from "./shop";

const config = roundsData.shop;
const tiers = roundsData.tierChance;
const items = itemsData as unknown as ShopItem[];
const weapons = weaponsData as unknown as ShopWeapon[];

function ctx(round: number, seed = 1, over: Partial<GenerateContext> = {}): GenerateContext {
	return {
		config,
		tiers,
		catalog: { items, weapons },
		rng: mulberry32(seed),
		round,
		luck: 0,
		shopPrice: 0,
		currentWeapon: { id: "sword", tier: 0, maxTier: 3 },
		...over,
	};
}

const tier = (n: number) => tiers.find((t) => t.tier === n) as (typeof tiers)[number];
const isWeaponLike = (s: ShopSlot): boolean => s.kind !== "item";

test("price formula: a 20 base item costs 24 in round 1 and 60 in round 10", () => {
	expect(shopPrice(config, 20, 1)).toBe(24);
	expect(shopPrice(config, 20, 10)).toBe(60);
	expect(shopPrice(config, 20, 10, -0.1)).toBe(54);
	expect(shopPrice(config, 1, 1, -0.9)).toBe(1);
});

test("reroll prices in round 10 are 11, 15, 19", () => {
	expect([1, 2, 3].map((k) => rerollPrice(config, 10, k))).toEqual([11, 15, 19]);
});

test("tier chances follow the GDD caps and luck", () => {
	expect(tierChance(tier(2), 1)).toBe(0);
	expect(tierChance(tier(2), 3)).toBeCloseTo(0.12);
	expect(tierChance(tier(2), 100)).toBeCloseTo(0.6);
	expect(tierChance(tier(3), 100, 50)).toBeCloseTo(0.25 * 1.5);
	expect(tierChance(tier(4), 7)).toBe(0);
});

test("rollTier frequencies at round 20 match the cascade T4, T3, T2, T1", () => {
	const rng = mulberry32(4);
	const counts = [0, 0, 0, 0, 0];
	const n = 40_000;
	for (let i = 0; i < n; i++) {
		const t = rollTier(rng, tiers, 20);
		counts[t] = (counts[t] ?? 0) + 1;
	}
	const p4 = 0.0023 * 13;
	const p3 = (1 - p4) * 0.25;
	const p2 = (1 - p4) * (1 - 0.25) * 0.6;
	expect(Math.abs((counts[4] ?? 0) / n - p4)).toBeLessThan(0.01);
	expect(Math.abs((counts[3] ?? 0) / n - p3)).toBeLessThan(0.01);
	expect(Math.abs((counts[2] ?? 0) / n - p2)).toBeLessThan(0.012);
	expect(counts[0]).toBe(0);
});

test("rounds 1 and 2 guarantee one weapon offer and three items; later rounds mix by chance", () => {
	for (let seed = 1; seed <= 100; seed++) {
		for (const round of [1, 2]) {
			const shop = generateShop(ctx(round, seed));
			expect(shop).toHaveLength(4);
			expect(shop.filter(isWeaponLike)).toHaveLength(1);
		}
	}
	let weaponLike = 0;
	let total = 0;
	for (let seed = 1; seed <= 1000; seed++) {
		for (const slot of generateShop(ctx(5, seed))) {
			total++;
			if (isWeaponLike(slot)) weaponLike++;
		}
	}
	expect(Math.abs(weaponLike / total - config.weaponChance)).toBeLessThan(0.03);
});

test("weapons respect their unlock round and are never the one the hero holds", () => {
	for (let seed = 1; seed <= 200; seed++) {
		for (const slot of generateShop(ctx(3, seed))) {
			if (slot.kind !== "weapon") continue;
			expect(slot.id).not.toBe("sword");
			expect(weapons.find((w) => w.id === slot.id)?.unlockRound).toBeLessThanOrEqual(3);
		}
	}
});

test("upgrade offers need room to grow and carry the upgrade price of the current tier", () => {
	let upgrades = 0;
	for (let seed = 1; seed <= 300; seed++) {
		for (const slot of generateShop(ctx(2, seed))) {
			if (slot.kind === "upgrade") {
				upgrades++;
				expect(slot.price).toBe(
					shopPrice(config, weapons.find((w) => w.id === "sword")?.upgradePrices[0] ?? 0, 2),
				);
			}
		}
		const maxed = generateShop(ctx(2, seed, { currentWeapon: { id: "sword", tier: 3, maxTier: 3 } }));
		expect(maxed.some((s) => s.kind === "upgrade")).toBe(false);
	}
	expect(upgrades).toBeGreaterThan(50);
});

test("locked slots survive a refresh and unlocked ones are redrawn", () => {
	const first = generateShop(ctx(4, 7));
	const locked: ShopSlot[] = first.map((s, i) => ({ ...s, locked: i === 1 }));
	const next = generateShop(ctx(5, 8), locked);
	expect(next[1]).toEqual(locked[1]);
	expect(next).toHaveLength(4);
});

test("selling the old weapon returns half of what was paid", () => {
	expect(sellValue(config, 30)).toBe(15);
	expect(sellValue(config, 45 + 45)).toBe(45);
});

test("upgrade prices follow the shop formula, so round 10 costs more than round 2", () => {
	const base = weapons.find((w) => w.id === "sword")?.upgradePrices[0] ?? 0;
	let seen = 0;
	for (let seed = 1; seed <= 300 && seen < 3; seed++) {
		for (const slot of generateShop(ctx(10, seed))) {
			if (slot.kind !== "upgrade") continue;
			seen++;
			expect(slot.price).toBe(shopPrice(config, base, 10));
			expect(slot.price).toBeGreaterThan(base);
		}
	}
	expect(seen).toBeGreaterThan(0);
});

test("no item repeats within one shop, locked slots included, and alpha items are never sold", () => {
	// No real item is alpha any more, so a synthetic one stands in for an effect that is not implemented yet.
	const stub = { id: "stub_alpha", name: "Stub", tier: 4, price: 100, modifiers: [], status: "alpha" };
	const catalog = { items: [...items, stub], weapons };
	const alpha = new Set([stub.id]);
	for (let seed = 1; seed <= 1000; seed++) {
		const first = generateShop(ctx(8, seed, { catalog }));
		const locked = first.map((s, i) => ({ ...s, locked: i === 0 }));
		const second = generateShop(ctx(9, seed + 1, { catalog }), locked);
		for (const shop of [first, second]) {
			const ids = shop.filter((s) => s.kind === "item").map((s) => s.id);
			expect(new Set(ids).size).toBe(ids.length);
			for (const id of ids) expect(alpha.has(id)).toBe(false);
		}
	}
});
