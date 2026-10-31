import type { Modifier } from "./stats";

/** `data/rounds.json` `shop` block. */
export interface ShopConfig {
	slots: number;
	weaponChance: number;
	upgradeChance: number;
	guaranteedWeapons: number;
	guaranteedItems: number;
	guaranteeUntilRound: number;
	sellFraction: number;
	priceBaseRoundFactor: number;
	rerollIncFactor: number;
	rerollFirstFactor: number;
}

/** One entry of `data/rounds.json` `tierChance`. */
export interface TierChance {
	tier: number;
	base: number;
	perRound: number;
	cap: number;
	minRound: number;
}

export interface ShopItem {
	id: string;
	name: string;
	tier: number;
	price: number;
	modifiers: readonly Modifier[];
	/** "alpha": the special effect is not implemented yet, so the item is not sold. */
	status?: string | undefined;
}

export interface ShopWeapon {
	id: string;
	name: string;
	price: number;
	upgradePrices: readonly number[];
	unlockRound: number;
}

export type SlotKind = "item" | "weapon" | "upgrade";

export interface ShopSlot {
	kind: SlotKind;
	/** Item id, weapon id, or the id of the weapon being upgraded. */
	id: string;
	price: number;
	locked: boolean;
	/** Bought; the slot stays visible but empty until the next refresh. */
	sold: boolean;
}

export interface ShopRng {
	float(a: number, b: number): number;
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

/** GDD 15.2: `clamp(base + inc * max(0, N - min + 1), 0, cap) * (1 + luck / 100)` (luck in points). */
export function tierChance(entry: TierChance, round: number, luck = 0): number {
	const raw = Math.min(
		Math.max(entry.base + entry.perRound * Math.max(0, round - entry.minRound + 1), 0),
		entry.cap,
	);
	return raw * (1 + luck / 100);
}

/** Tests T4, then T3, then T2; what is left is T1. */
export function rollTier(rng: ShopRng, tiers: readonly TierChance[], round: number, luck = 0): number {
	const ordered = [...tiers].sort((a, b) => b.tier - a.tier);
	for (const entry of ordered) {
		if (round >= entry.minRound && rng.chance(tierChance(entry, round, luck))) return entry.tier;
	}
	return 1;
}

export interface ShopCatalog {
	items: readonly ShopItem[];
	weapons: readonly ShopWeapon[];
}

export interface GenerateContext {
	config: ShopConfig;
	tiers: readonly TierChance[];
	catalog: ShopCatalog;
	rng: ShopRng;
	round: number;
	luck: number;
	shopPrice: number;
	/** The weapon the hero holds, and its tier index, for upgrade offers. */
	currentWeapon: { id: string; tier: number; maxTier: number };
}

function pickItem(ctx: GenerateContext, used: ReadonlySet<string>): ShopItem {
	const { catalog, rng } = ctx;
	const sellable = catalog.items.filter((i) => i.status !== "alpha");
	const fresh = sellable.filter((i) => !used.has(i.id));
	// Every sellable item is already on offer only in absurdly small catalogues; repeat rather than fail.
	const source = fresh.length > 0 ? fresh : sellable;
	let tier = rollTier(rng, ctx.tiers, ctx.round, ctx.luck);
	for (; tier >= 1; tier--) {
		const pool = source.filter((i) => i.tier === tier);
		if (pool.length > 0) return pool[rng.int(pool.length)] as ShopItem;
	}
	return source[rng.int(source.length)] as ShopItem;
}

function itemSlot(ctx: GenerateContext, used: Set<string>): ShopSlot {
	const item = pickItem(ctx, used);
	used.add(item.id);
	return {
		kind: "item",
		id: item.id,
		price: shopPrice(ctx.config, item.price, ctx.round, ctx.shopPrice),
		locked: false,
		sold: false,
	};
}

function weaponSlot(ctx: GenerateContext, used: Set<string>): ShopSlot {
	const { catalog, rng, currentWeapon } = ctx;
	const current = catalog.weapons.find((w) => w.id === currentWeapon.id);
	const canUpgrade = current !== undefined && currentWeapon.tier < currentWeapon.maxTier;
	if (current && canUpgrade && rng.chance(ctx.config.upgradeChance)) {
		return {
			kind: "upgrade",
			id: current.id,
			price: shopPrice(
				ctx.config,
				current.upgradePrices[currentWeapon.tier] ?? 0,
				ctx.round,
				ctx.shopPrice,
			),
			locked: false,
			sold: false,
		};
	}
	const pool = catalog.weapons.filter((w) => w.unlockRound <= ctx.round && w.id !== currentWeapon.id);
	if (pool.length === 0) return itemSlot(ctx, used);
	const weapon = pool[rng.int(pool.length)] as ShopWeapon;
	return {
		kind: "weapon",
		id: weapon.id,
		price: shopPrice(ctx.config, weapon.price, ctx.round, ctx.shopPrice),
		locked: false,
		sold: false,
	};
}

/**
 * GDD 17.1: 4 slots, each 35% weapon / 65% item; rounds up to `guaranteeUntilRound` guarantee 1 weapon and
 * 3 items. `keep` holds the slots to preserve (locked ones, by index); the rest are redrawn.
 */
export function generateShop(ctx: GenerateContext, keep: readonly (ShopSlot | null)[] = []): ShopSlot[] {
	const { config, rng } = ctx;
	const slots: (ShopSlot | null)[] = [];
	for (let i = 0; i < config.slots; i++) {
		const kept = keep[i];
		slots.push(kept?.locked ? kept : null);
	}
	// Items already on screen (locked slots included) are not offered twice in one visit.
	const used = new Set(slots.flatMap((s) => (s?.kind === "item" ? [s.id] : [])));
	const open = slots.flatMap((s, i) => (s === null ? [i] : []));
	const wants = new Map<number, "weapon" | "item">();
	if (ctx.round <= config.guaranteeUntilRound) {
		const heldWeapons = slots.filter((s) => s && s.kind !== "item").length;
		const weaponsNeeded = Math.max(0, config.guaranteedWeapons - heldWeapons);
		const shuffled = open.map((i) => ({ i, k: rng.float(0, 1) })).sort((a, b) => a.k - b.k);
		for (const [n, entry] of shuffled.entries())
			wants.set(entry.i, n < weaponsNeeded ? "weapon" : "item");
	} else {
		for (const i of open) wants.set(i, rng.chance(config.weaponChance) ? "weapon" : "item");
	}
	for (const i of open) slots[i] = wants.get(i) === "weapon" ? weaponSlot(ctx, used) : itemSlot(ctx, used);
	return slots as ShopSlot[];
}

/** GDD 17.1: replacing the weapon sells the old one for `sellFraction` of everything paid for it. */
export function sellValue(config: ShopConfig, paid: number): number {
	return Math.floor(paid * config.sellFraction);
}
