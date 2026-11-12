import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { equipmentData, roundsData } from "../data";
import { levelTier } from "./equipment";
import { generateShop, levelJump, rerollPrice, shopPrice } from "./shop";

const config = roundsData.shop;
const empty = equipmentData.slots.map(() => 0);

function ctx(round: number, levels: readonly number[], seed = 1) {
	return { config, equipment: equipmentData, rng: mulberry32(seed), round, luck: 0, shopPrice: 0, levels };
}

test("the shop offers one piece per slot, in slot order, and nothing for a slot at the gold cap", () => {
	const offers = generateShop(ctx(3, empty));
	expect(offers.map((o) => o.slot)).toEqual(equipmentData.slots.map((_, i) => i));
	const capped = empty.map((_, i) => (i === 2 ? equipmentData.goldMaxLevel : 0));
	expect(generateShop(ctx(3, capped)).map((o) => o.slot)).not.toContain(2);
	expect(
		generateShop(
			ctx(
				3,
				empty.map(() => equipmentData.goldMaxLevel),
			),
		),
	).toEqual([]);
});

test("an offer is never worse than the equipped piece, nor above the gold cap, in any round", () => {
	for (let seed = 1; seed <= 40; seed++) {
		for (const round of [1, 5, 9, 17, 30, 80]) {
			const levels = empty.map((_, i) => (seed + i) % (equipmentData.goldMaxLevel + 1));
			for (const offer of generateShop(ctx(round, levels, seed))) {
				expect(offer.level).toBeGreaterThan(levels[offer.slot] ?? 0);
				expect(offer.level).toBeLessThanOrEqual(equipmentData.goldMaxLevel);
			}
		}
	}
});

test("early rounds sell the next level; later rounds may skip up to maxJump levels", () => {
	expect(levelJump(config, 1)).toBe(0);
	expect(levelJump(config, config.jumpEveryRounds * 99)).toBe(config.maxJump);
	for (let seed = 1; seed <= 20; seed++)
		for (const offer of generateShop(ctx(1, empty, seed))) expect(offer.level).toBe(1);
	const seen = new Set<number>();
	for (let seed = 1; seed <= 60; seed++)
		for (const offer of generateShop(ctx(config.jumpEveryRounds * 9, empty, seed))) seen.add(offer.level);
	expect([...seen].sort()).toEqual([1, 2, 3].slice(0, config.maxJump + 1));
});

test("luck makes a higher level more likely and never changes the stream without it", () => {
	const late = config.jumpEveryRounds * 9;
	const total = (luck: number): number => {
		let sum = 0;
		for (let seed = 1; seed <= 80; seed++)
			for (const offer of generateShop({ ...ctx(late, empty, seed), luck })) sum += offer.level;
		return sum;
	};
	expect(total(100)).toBeGreaterThan(total(0));
	const a = generateShop(ctx(late, empty, 7));
	expect(generateShop({ ...ctx(late, empty, 7), luck: 0 })).toEqual(a);
});

test("the gold price comes from the level's base price, scaled by round and the shop-price stat", () => {
	const helmet = equipmentData.slots[0];
	const [first] = generateShop(ctx(1, empty));
	expect(first?.price).toBe(shopPrice(config, helmet?.levels[0]?.price ?? 0, 1));
	const [later] = generateShop(ctx(config.jumpEveryRounds * 2, empty, 4));
	expect(later?.price).toBe(
		shopPrice(config, helmet?.levels[(later?.level ?? 1) - 1]?.price ?? 0, config.jumpEveryRounds * 2),
	);
	expect(shopPrice(config, 100, 10, -0.5)).toBeLessThan(shopPrice(config, 100, 10, 0));
	expect(shopPrice(config, 0, 0)).toBe(1);
});

test("a locked offer survives a redraw while it is still an upgrade; a sold or stale one does not", () => {
	const first = generateShop(ctx(1, empty));
	const locked = first.map((o, i) => (i === 0 ? { ...o, locked: true } : o));
	const again = generateShop(ctx(1, empty, 99), locked);
	expect(again[0]).toEqual(locked[0]);
	expect(again[1]?.locked).toBe(false);
	const stale = generateShop(
		ctx(
			1,
			empty.map((_, i) => (i === 0 ? 3 : 0)),
			5,
		),
		locked,
	);
	expect(stale[0]?.level).toBeGreaterThan(3);
	const sold = locked.map((o) => ({ ...o, sold: true }));
	expect(generateShop(ctx(1, empty), sold).every((o) => !o.sold)).toBe(true);
});

test("the reroll price grows with the round and with every reroll", () => {
	expect(rerollPrice(config, 10, 1)).toBeLessThan(rerollPrice(config, 10, 2));
	expect(rerollPrice(config, 10, 1)).toBeLessThan(rerollPrice(config, 20, 1));
});

test("a level maps to a rarity tier from 1 to 5", () => {
	expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(levelTier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});
