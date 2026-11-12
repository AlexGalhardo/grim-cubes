import type { EquipmentData } from "./equipment";

/** `data/rounds.json` `shop` block. */
export interface ShopConfig {
	/** Rounds per extra level an offer may jump above the equipped one. */
	jumpEveryRounds: number;
	/** Most extra levels an offer may jump. */
	maxJump: number;
	priceBaseRoundFactor: number;
	rerollIncFactor: number;
	rerollFirstFactor: number;
}

/** One gold offer: a level of one equipment slot. */
export interface ShopSlot {
	/** Index into `EquipmentData.slots`. */
	slot: number;
	level: number;
	price: number;
	locked: boolean;
	/** Bought; the offer stays visible but empty until the next refresh. */
	sold: boolean;
}

export interface ShopRng {
	int(n: number): number;
	chance(p: number): boolean;
}

/** GDD 17.2: `floor((base + N + base * 0.1 * N) * (1 + shop_price))`, at least 1. `shopPrice` is a fraction. */
export function shopPrice(config: ShopConfig, base: number, round: number, shopPriceStat = 0): number {
	const raw = (base + round + base * config.priceBaseRoundFactor * round) * (1 + shopPriceStat);
	return Math.max(1, Math.floor(raw));
}

/** GDD 17.2: `reroll_k(N) = floor(0.75 N) + inc + (k - 1) inc`, `inc = max(1, floor(0.4 N))`. `k` starts at 1. */
export function rerollPrice(config: ShopConfig, round: number, k: number): number {
	const inc = Math.max(1, Math.floor(config.rerollIncFactor * round));
	return Math.floor(config.rerollFirstFactor * round) + inc + (k - 1) * inc;
}

export interface GenerateContext {
	config: ShopConfig;
	equipment: EquipmentData;
	/** The `shop` RNG stream. */
	rng: ShopRng;
	round: number;
	/** Luck in points: each point is a 1% chance to draw a second level and keep the higher one. */
	luck: number;
	shopPrice: number;
	/** Level equipped in each slot, 0 when empty. */
	levels: readonly number[];
}

/** How many levels above the next one an offer may land at this round. */
export const levelJump = (config: ShopConfig, round: number): number =>
	Math.min(config.maxJump, Math.floor(round / config.jumpEveryRounds));

/**
 * One offer per slot still below the gold cap, in slot order. Its level is always above the equipped one (the shop
 * never sells a worse or equal piece) and at most `goldMaxLevel`; later rounds may skip levels. `keep` holds the
 * previous offers: locked ones that are still an upgrade stay, the rest are redrawn.
 */
export function generateShop(ctx: GenerateContext, keep: readonly ShopSlot[] = []): ShopSlot[] {
	const { config, equipment, rng, round, levels } = ctx;
	const out: ShopSlot[] = [];
	const jump = levelJump(config, round);
	equipment.slots.forEach((slot, i) => {
		const equipped = levels[i] ?? 0;
		if (equipped >= equipment.goldMaxLevel) return;
		const kept = keep.find((k) => k.slot === i && k.locked && !k.sold && k.level > equipped);
		if (kept) {
			out.push(kept);
			return;
		}
		// No luck, no second draw: the stream is untouched, so a run without luck stays reproducible as before.
		let skip = rng.int(jump + 1);
		if (ctx.luck > 0 && rng.chance(Math.min(1, ctx.luck / 100))) skip = Math.max(skip, rng.int(jump + 1));
		const level = Math.min(equipment.goldMaxLevel, equipped + 1 + skip);
		const base = slot.levels[level - 1]?.price ?? 0;
		out.push({
			slot: i,
			level,
			price: shopPrice(config, base, round, ctx.shopPrice),
			locked: false,
			sold: false,
		});
	});
	return out;
}
