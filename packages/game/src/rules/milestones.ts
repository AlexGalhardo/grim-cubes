import type { MetaState } from "@gc/core";
import type { ItemData, MilestoneData, MilestonesData, SkinData } from "../data/types";

function statValue(stat: string, meta: MetaState): number {
	if (stat === "record") return Math.max(meta.records.normal, meta.records.grim, meta.records.nightmare);
	if (stat === "kills" || stat === "bossKills" || stat === "elitesKilled" || stat === "runs")
		return meta.stats[stat];
	throw new RangeError(`unknown milestone stat "${stat}"`);
}

export function isReached(milestone: MilestoneData, meta: MetaState): boolean {
	return statValue(milestone.requires.stat, meta) >= milestone.requires.value;
}

/** Items a milestone gates, minus the ones whose milestone is reached; they stay out of every pool. */
export function lockedItemIds(data: MilestonesData, meta: MetaState): ReadonlySet<string> {
	const locked = new Set<string>();
	for (const m of data.milestones) {
		if (m.unlocksItem !== undefined && !isReached(m, meta)) locked.add(m.unlocksItem);
	}
	return locked;
}

/** The item pool for a run: everything except what the account has not unlocked yet. */
export function availableItems(
	items: readonly ItemData[],
	data: MilestonesData,
	meta: MetaState,
): readonly ItemData[] {
	const locked = lockedItemIds(data, meta);
	return locked.size === 0 ? items : items.filter((item) => !locked.has(item.id));
}

/** Skins whose milestone is reached. */
export function unlockedSkins(data: MilestonesData, meta: MetaState): readonly SkinData[] {
	const ids = new Set<string>();
	for (const m of data.milestones) {
		if (m.unlocksSkin !== undefined && isReached(m, meta)) ids.add(m.unlocksSkin);
	}
	return data.skins.filter((s) => ids.has(s.id));
}
