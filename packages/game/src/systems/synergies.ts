import type { SynergyData } from "../data/types";
import { computeSynergies, type SynergyState, synergyModifiers, type TaggedItem } from "../rules/synergies";
import type { StatsSystem } from "./stats";

export interface SynergySystem {
	/** Current progress per tag; replaced on `refresh`, so read it again after the inventory changes. */
	readonly states: readonly SynergyState[];
	/** Call after the inventory changes (a shop purchase, a chest, a restored run). */
	refresh(): void;
}

export function createSynergySystem(
	items: readonly TaggedItem[],
	owned: ReadonlyMap<string, number>,
	synergies: readonly SynergyData[],
	stats: Pick<StatsSystem, "setBonus">,
): SynergySystem {
	let states: readonly SynergyState[] = computeSynergies(items, owned, synergies);
	return {
		get states(): readonly SynergyState[] {
			return states;
		},
		refresh(): void {
			states = computeSynergies(items, owned, synergies);
			stats.setBonus(synergyModifiers(states, synergies));
		},
	};
}
