import type { Described } from "@gc/core";
import { describeModifier } from "../rules/describe";
import { type EquipmentData, equipmentModifiers, levelTier, upgradeCost } from "../rules/equipment";
import {
	type GenerateContext,
	generateShop,
	rerollPrice,
	type ShopConfig,
	type ShopRng,
	type ShopSlot,
} from "../rules/shop";
import type { Progress } from "./loot";
import type { StatsSystem } from "./stats";

export interface ShopSystemDeps {
	config: ShopConfig;
	equipment: EquipmentData;
	/** The `shop` RNG stream. */
	rng: ShopRng;
	progress: Progress;
	stats: StatsSystem;
	round: () => number;
}

export interface ShopSlotView {
	/** Equipment slot id (`helmet`, `ring`, ...). */
	slot: string;
	level: number;
	/** Effect lines as keys and parameters, e.g. +3 armor; the UI translates them. */
	lines: Described[];
	price: number;
	tier: number;
	locked: boolean;
	sold: boolean;
	affordable: boolean;
}

/** What it takes to raise an equipment slot with materials; `next` is null when gold sells the next level or the slot is maxed. */
export interface ShopUpgradeView {
	slot: string;
	level: number;
	next: number | null;
	fragments: number;
	relics: number;
	affordable: boolean;
}

export interface ShopView {
	slots: ShopSlotView[];
	rerollPrice: number;
	gold: number;
	/** The run's materials. */
	fragments: number;
	relics: number;
	/** One entry per equipment slot, in slot order. */
	upgrades: ShopUpgradeView[];
}

export interface ShopSystem {
	readonly slots: readonly ShopSlot[];
	/** Price of the next reroll. */
	readonly rerollPrice: number;
	/** Level equipped in each slot of `equipment.json`, 0 when empty. */
	readonly levels: readonly number[];
	/** Puts back the equipped levels (a resumed run). */
	restoreLevels(levels: readonly number[]): void;
	/** Draws the offers for the current round, keeping locked ones, and resets the reroll counter. */
	open(): void;
	buy(index: number): boolean;
	/** Spends fragments (levels 7 to 9) or a relic (level 10) to raise the equipment slot `slot` by one level. */
	upgrade(slot: number): boolean;
	reroll(): boolean;
	toggleLock(index: number): void;
	view(): ShopView;
}

export function createShopSystem(deps: ShopSystemDeps): ShopSystem {
	const { config, equipment, rng, progress, stats, round } = deps;
	const levels: number[] = equipment.slots.map(() => 0);
	let slots: ShopSlot[] = [];
	let rerolls = 0;

	const context = (): GenerateContext => ({
		config,
		equipment,
		rng,
		round: round(),
		luck: stats.stats.luck,
		shopPrice: stats.stats.shopPrice,
		levels,
	});
	const nextRerollPrice = (): number => {
		const free = stats.stats.freeRerolls;
		return rerolls < free ? 0 : rerollPrice(config, round(), rerolls - free + 1);
	};
	const applyEquipment = (): void => stats.setEquipment(equipmentModifiers(equipment, levels));

	return {
		get slots(): readonly ShopSlot[] {
			return slots;
		},
		get rerollPrice(): number {
			return nextRerollPrice();
		},
		levels,
		restoreLevels(saved: readonly number[]): void {
			equipment.slots.forEach((slot, i) => {
				levels[i] = Math.min(Math.max(0, saved[i] ?? 0), slot.levels.length);
			});
			applyEquipment();
		},
		open(): void {
			rerolls = 0;
			slots = generateShop(context(), slots);
		},
		buy(index: number): boolean {
			const offer = slots[index];
			if (!offer || offer.sold || progress.gold < offer.price) return false;
			// A stale offer (the slot moved past it since) is never sold: the shop does not sell a worse piece.
			if (offer.level <= (levels[offer.slot] ?? 0)) return false;
			levels[offer.slot] = offer.level;
			applyEquipment();
			progress.gold -= offer.price;
			slots[index] = { ...offer, sold: true, locked: false };
			return true;
		},
		upgrade(slot: number): boolean {
			const cost = upgradeCost(equipment, levels[slot] ?? -1);
			const fragments = cost?.fragments ?? 0;
			const relics = cost?.relics ?? 0;
			if (!cost || progress.eliteFragments < fragments || progress.relics < relics) return false;
			progress.eliteFragments -= fragments;
			progress.relics -= relics;
			levels[slot] = cost.level;
			applyEquipment();
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
			const offer = slots[index];
			if (offer && !offer.sold) slots[index] = { ...offer, locked: !offer.locked };
		},
		view(): ShopView {
			return {
				slots: slots.map((offer) => ({
					slot: equipment.slots[offer.slot]?.id ?? "",
					level: offer.level,
					lines: (equipment.slots[offer.slot]?.levels[offer.level - 1]?.modifiers ?? []).map(
						describeModifier,
					),
					price: offer.price,
					tier: levelTier(offer.level),
					locked: offer.locked,
					sold: offer.sold,
					affordable: progress.gold >= offer.price,
				})),
				rerollPrice: nextRerollPrice(),
				gold: Math.floor(progress.gold),
				fragments: progress.eliteFragments,
				relics: progress.relics,
				upgrades: equipment.slots.map((slot, i) => {
					const level = levels[i] ?? 0;
					const cost = upgradeCost(equipment, level);
					const fragments = cost?.fragments ?? 0;
					const relics = cost?.relics ?? 0;
					return {
						slot: slot.id,
						level,
						next: cost?.level ?? null,
						fragments,
						relics,
						affordable:
							cost !== null &&
							progress.eliteFragments >= fragments &&
							progress.relics >= relics,
					};
				}),
			};
		},
	};
}
