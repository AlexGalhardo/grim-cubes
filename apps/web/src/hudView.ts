import type { Described } from "@gc/core";
import {
	computeStats,
	describeEffect,
	describeModifier,
	type HeroStatsData,
	type Modifier,
	type PlayerStats,
} from "@gc/game";
import type { HudItem, HudWeapon, IconRef, ResultsViewModel } from "@gc/ui";

export interface LoadoutSource {
	/** Item id to count, as the session keeps it. */
	owned: ReadonlyMap<string, number>;
	weaponId: string;
	/** 0-3, as the weapon system keeps it. */
	weaponTier: number;
	/** Part of the memo key: names are translated when the view is built. */
	locale: string;
}

export interface LoadoutLookup {
	itemName(id: string): string;
	itemTier(id: string): number;
	itemIcon(id: string): IconRef | undefined;
	weaponName(id: string): string;
	weaponIcon(id: string): IconRef | undefined;
}

export interface LoadoutView {
	weapon: HudWeapon;
	items: readonly HudItem[];
}

/** Last tier pip count (the weapon system tiers run 0-3). */
const MAX_PIPS = 4;

/**
 * The weapon and the item strip of the HUD. `update` returns the same object (and so the same `items` array) until
 * the owned set, the weapon or the locale changes, and allocates nothing while it compares.
 */
export function createLoadoutView(lookup: LoadoutLookup): { update(source: LoadoutSource): LoadoutView } {
	const ids: string[] = [];
	const counts: number[] = [];
	let weaponId = "";
	let weaponTier = -1;
	let locale = "";
	let view: LoadoutView | null = null;

	function unchanged(source: LoadoutSource): boolean {
		if (
			view === null ||
			source.weaponId !== weaponId ||
			source.weaponTier !== weaponTier ||
			source.locale !== locale ||
			source.owned.size !== ids.length
		) {
			return false;
		}
		let i = 0;
		for (const [id, count] of source.owned) {
			if (ids[i] !== id || counts[i] !== count) return false;
			i++;
		}
		return true;
	}

	return {
		update(source): LoadoutView {
			if (view !== null && unchanged(source)) return view;
			ids.length = 0;
			counts.length = 0;
			for (const [id, count] of source.owned) {
				ids.push(id);
				counts.push(count);
			}
			weaponId = source.weaponId;
			weaponTier = source.weaponTier;
			locale = source.locale;
			view = {
				weapon: {
					id: source.weaponId,
					name: lookup.weaponName(source.weaponId),
					tier: Math.min(MAX_PIPS, source.weaponTier + 1),
					icon: lookup.weaponIcon(source.weaponId),
				},
				items: ids.map((id, i) => ({
					id,
					name: lookup.itemName(id),
					tier: lookup.itemTier(id),
					count: counts[i] ?? 1,
					icon: lookup.itemIcon(id),
				})),
			};
			return view;
		},
	};
}

/** Whole seconds left in a timed round; 0 outside one (the boss round has no timer). */
export function roundSecondsLeft(state: string, ticksLeft: number, step: number): number {
	return state === "Round" || state === "Paused" ? Math.max(0, Math.ceil(ticksLeft * step)) : 0;
}

export interface ResultsLookup {
	enemy(type: number): string;
	boss(type: number): string;
	/** The elite form of an enemy name. */
	elite(name: string): string;
	shot(): string;
	self(): string;
	unknown(): string;
	/** Label of a `DamageOrigin` id (see `DAMAGE_SOURCE_IDS`). */
	source(id: string): string;
}

export interface ResultsSource {
	round: number;
	kills: number;
	damageDealt: number;
	fightTicks: number;
	step: number;
	killer: { kind: "none" | "enemy" | "elite" | "boss" | "shot" | "self"; type: number };
	/** Damage dealt per `DamageOrigin`, in `DAMAGE_SOURCE_IDS` order. */
	damageBySource: readonly number[];
	souls: number;
	totalSouls: number;
	record: number;
	newRecord: boolean;
	seed: number;
	loadout: LoadoutView;
	/** Every Ossuary node with its label, cost and state; the next unlock is the cheapest one still open. */
	nodes: readonly { label: string; cost: number; state: string }[];
}

/** `DamageOrigin` values in order: the weapon, spells, item effects and bleed. */
export const DAMAGE_SOURCE_IDS: readonly string[] = ["weapon", "spell", "item", "bleed"];

/** Who killed the hero: never "unknown" when the damage system recorded a killer. */
export function describeCause(
	killer: ResultsSource["killer"],
	lookup: ResultsLookup,
): { cause: string; causeKind: NonNullable<ResultsViewModel["causeKind"]> } {
	switch (killer.kind) {
		case "enemy":
			return { cause: lookup.enemy(killer.type), causeKind: "enemy" };
		case "elite":
			return { cause: lookup.elite(lookup.enemy(killer.type)), causeKind: "elite" };
		case "boss":
			return { cause: lookup.boss(killer.type), causeKind: "boss" };
		case "shot":
			return { cause: lookup.shot(), causeKind: "shot" };
		case "self":
			return { cause: lookup.self(), causeKind: "self" };
		default:
			return { cause: lookup.unknown(), causeKind: "none" };
	}
}

export function buildResults(source: ResultsSource, lookup: ResultsLookup): ResultsViewModel {
	const open = source.nodes
		.filter((node) => node.state === "available")
		.reduce<{ label: string; cost: number } | null>(
			(best, node) => (best === null || node.cost < best.cost ? node : best),
			null,
		);
	return {
		round: source.round,
		kills: source.kills,
		damage: Math.round(source.damageDealt),
		...describeCause(source.killer, lookup),
		weapon: source.loadout.weapon,
		items: source.loadout.items,
		seconds: Math.floor(source.fightTicks * source.step),
		sources: DAMAGE_SOURCE_IDS.flatMap((id, i) => {
			const damage = Math.round(source.damageBySource[i] ?? 0);
			return damage > 0 ? [{ id, label: lookup.source(id), damage }] : [];
		}),
		souls: source.souls,
		totalSouls: source.totalSouls,
		record: source.record,
		newRecord: source.newRecord,
		seed: source.seed,
		nextUnlock: open ? { name: open.label, cost: open.cost } : null,
	};
}

/** The effect lines of an item: its stat modifiers, then its effects. Most chest and shop items are effect-only, so a card needs both. */
export function itemLines(
	item: {
		modifiers: readonly Modifier[];
		effects?:
			| readonly { id: string; params?: Record<string, number | string | boolean> | undefined }[]
			| undefined;
	},
	text: (described: Described) => string,
): string[] {
	return [
		...item.modifiers.map((m) => text(describeModifier(m))),
		...(item.effects ?? []).map((e) => text(describeEffect(e.id, e.params))),
	];
}

/**
 * The hero's stats as they stand now. `system.stats` is recomputed by the next simulation step, and the sim is paused
 * while a card or chest is open, so after a pick that opens another offer at once it would still miss that pick.
 * Returns `system.stats` when it is clean, else `scratch` filled from the modifiers.
 */
export function currentStats(
	system: { readonly stats: PlayerStats; readonly modifiers: readonly Modifier[] },
	data: HeroStatsData,
	bonus: readonly Modifier[],
	scratch: PlayerStats,
): PlayerStats {
	if (!system.stats.dirty) return system.stats;
	computeStats(data, system.modifiers, scratch, undefined, bonus);
	return scratch;
}
