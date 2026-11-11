import type { HudItem, HudWeapon, IconRef } from "@gc/ui";

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
