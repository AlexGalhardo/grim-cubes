import type { Described } from "@gc/core";
import { describeModifier } from "../rules/describe";
import {
	type GenerateContext,
	generateShop,
	rerollPrice,
	type ShopCatalog,
	type ShopConfig,
	type ShopRng,
	type ShopSlot,
	sellValue,
	type TierChance,
} from "../rules/shop";
import type { Progress } from "./loot";
import type { StatsSystem } from "./stats";
import type { WeaponDef, WeaponSystem } from "./weapon";

export interface ShopSystemDeps {
	config: ShopConfig;
	tiers: readonly TierChance[];
	catalog: ShopCatalog;
	/** Full weapon defs by id, used when a weapon is bought. */
	weaponDefs: readonly WeaponDef[];
	/** The `shop` RNG stream. */
	rng: ShopRng;
	progress: Progress;
	stats: StatsSystem;
	weapon: WeaponSystem;
	round: () => number;
	/** Inventory map shared with the effects system; created here when omitted. */
	owned?: Map<string, number>;
	/** Ossuary: Uncommon item slots every shop visit must hold. */
	guaranteedUncommon?: number | undefined;
	/** Called after an item is bought, so effects can be recomputed. */
	onItemBought?: () => void;
}

export interface ShopSlotView {
	kind: ShopSlot["kind"];
	id: string;
	name: string;
	/** Effect lines as keys and parameters, e.g. +3 armor; the UI translates them. */
	lines: Described[];
	price: number;
	tier: number;
	locked: boolean;
	sold: boolean;
	affordable: boolean;
}

export interface ShopView {
	slots: ShopSlotView[];
	rerollPrice: number;
	gold: number;
}

export interface ShopSystem {
	readonly slots: readonly ShopSlot[];
	/** Price of the next reroll. */
	readonly rerollPrice: number;
	/** Items owned this run, by id. */
	readonly owned: ReadonlyMap<string, number>;
	/** Total paid for the weapon in hand, including upgrades (half is refunded when it is replaced). */
	readonly paid: number;
	/** Draws the offers for the current round, keeping locked slots, and resets the reroll counter. */
	open(): void;
	buy(index: number): boolean;
	reroll(): boolean;
	toggleLock(index: number): void;
	view(): ShopView;
}

export function createShopSystem(deps: ShopSystemDeps): ShopSystem {
	const { config, tiers, catalog, weaponDefs, rng, progress, stats, weapon, round, guaranteedUncommon } =
		deps;
	const owned = deps.owned ?? new Map<string, number>();
	let slots: ShopSlot[] = [];
	let rerolls = 0;
	// The starting weapon was free, so selling it returns nothing.
	let paid = 0;

	/** `opening`: the Ossuary guarantee only shapes the first offer of a visit (GDD 19.1), never a reroll. */
	const context = (opening = false): GenerateContext => ({
		config,
		tiers,
		catalog,
		rng,
		round: round(),
		luck: stats.stats.luck,
		shopPrice: stats.stats.shopPrice,
		currentWeapon: { id: weapon.weapon.id ?? "", tier: weapon.tier, maxTier: weapon.maxTier },
		...(opening && guaranteedUncommon ? { guaranteedUncommon } : {}),
	});
	const nextRerollPrice = (): number => {
		const free = stats.stats.freeRerolls;
		return rerolls < free ? 0 : rerollPrice(config, round(), rerolls - free + 1);
	};

	function describe(slot: ShopSlot): { name: string; lines: Described[]; tier: number } {
		if (slot.kind === "item") {
			const item = catalog.items.find((i) => i.id === slot.id);
			return {
				name: item?.name ?? slot.id,
				lines: (item?.modifiers ?? []).map(describeModifier),
				tier: item?.tier ?? 1,
			};
		}
		const w = catalog.weapons.find((x) => x.id === slot.id);
		return {
			name: slot.kind === "upgrade" ? `${w?.name ?? slot.id} +` : (w?.name ?? slot.id),
			lines: [],
			tier: 1,
		};
	}

	return {
		get slots(): readonly ShopSlot[] {
			return slots;
		},
		get rerollPrice(): number {
			return nextRerollPrice();
		},
		owned,
		get paid(): number {
			return paid;
		},
		open(): void {
			rerolls = 0;
			slots = generateShop(context(true), slots);
		},
		buy(index: number): boolean {
			const slot = slots[index];
			if (!slot || slot.sold || progress.gold < slot.price) return false;
			if (slot.kind === "item") {
				const item = catalog.items.find((i) => i.id === slot.id);
				if (!item) return false;
				stats.add(item.modifiers);
				owned.set(item.id, (owned.get(item.id) ?? 0) + 1);
				deps.onItemBought?.();
			} else if (slot.kind === "weapon") {
				const def = weaponDefs.find((w) => w.id === slot.id);
				if (!def) return false;
				progress.gold += sellValue(config, paid);
				weapon.setWeapon(def, 0);
				paid = slot.price;
			} else {
				if (!weapon.upgrade()) return false;
				paid += slot.price;
			}
			progress.gold -= slot.price;
			slots[index] = { ...slot, sold: true, locked: false };
			return true;
		},
		reroll(): boolean {
			const price = nextRerollPrice();
			if (progress.gold < price) return false;
			progress.gold -= price;
			rerolls++;
			slots = generateShop(context(), slots);
			return true;
		},
		toggleLock(index: number): void {
			const slot = slots[index];
			if (slot && !slot.sold) slots[index] = { ...slot, locked: !slot.locked };
		},
		view(): ShopView {
			return {
				slots: slots.map((slot) => {
					const info = describe(slot);
					return {
						kind: slot.kind,
						id: slot.id,
						name: info.name,
						lines: info.lines,
						price: slot.price,
						tier: info.tier,
						locked: slot.locked,
						sold: slot.sold,
						affordable: progress.gold >= slot.price,
					};
				}),
				rerollPrice: nextRerollPrice(),
				gold: Math.floor(progress.gold),
			};
		},
	};
}
