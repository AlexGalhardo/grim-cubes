import type { SynergyData } from "../data/types";
import type { Modifier } from "./stats";

/** The slice of an `items.json` entry that synergies read. */
export interface TaggedItem {
	id: string;
	tags: readonly string[];
}

/** Where the hero stands on one tag: what the UI draws (store, HUD, shop preview). */
export interface SynergyState {
	id: string;
	name: string;
	/** Distinct owned items carrying the tag. */
	count: number;
	/** Counts of every tier of the tag, ascending (2, 4, 6). */
	thresholds: readonly number[];
	/** How many tiers are active now. */
	reached: number;
	/** Count of the next tier, or null when all are reached. */
	nextAt: number | null;
}

/** Distinct owned items per tag: a second copy of the same item adds nothing, so the set has to be collected. */
export function computeSynergies(
	items: readonly TaggedItem[],
	owned: ReadonlyMap<string, number>,
	synergies: readonly SynergyData[],
): SynergyState[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		if ((owned.get(item.id) ?? 0) <= 0) continue;
		for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}
	return synergies.map((s) => {
		const count = counts.get(s.id) ?? 0;
		const reached = s.tiers.filter((t) => count >= t.count).length;
		return {
			id: s.id,
			name: s.name,
			count,
			thresholds: s.tiers.map((t) => t.count),
			reached,
			nextAt: s.tiers[reached]?.count ?? null,
		};
	});
}

/** Every reached tier applies (they stack); dropping below a threshold removes its modifiers on the next call. */
export function synergyModifiers(
	states: readonly SynergyState[],
	synergies: readonly SynergyData[],
): Modifier[] {
	const out: Modifier[] = [];
	for (const state of states) {
		const tiers = synergies.find((s) => s.id === state.id)?.tiers ?? [];
		for (let i = 0; i < state.reached; i++) out.push(...(tiers[i]?.modifiers ?? []));
	}
	return out;
}
