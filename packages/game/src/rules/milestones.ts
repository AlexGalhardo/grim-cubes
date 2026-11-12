import type { MetaState } from "@gc/core";
import type { MilestoneData, MilestonesData, SkinData } from "../data/types";

function statValue(stat: string, meta: MetaState): number {
	if (stat === "record") return Math.max(meta.records.normal, meta.records.grim, meta.records.nightmare);
	if (stat === "bestBossRound") return meta.stats.bestBossRound;
	if (stat === "kills" || stat === "bossKills" || stat === "elitesKilled" || stat === "runs")
		return meta.stats[stat];
	throw new RangeError(`unknown milestone stat "${stat}"`);
}

export function isReached(milestone: MilestoneData, meta: MetaState): boolean {
	return statValue(milestone.requires.stat, meta) >= milestone.requires.value;
}

/** Skins whose milestone is reached. */
export function unlockedSkins(data: MilestonesData, meta: MetaState): readonly SkinData[] {
	const ids = new Set<string>();
	for (const m of data.milestones) {
		if (m.unlocksSkin !== undefined && isReached(m, meta)) ids.add(m.unlocksSkin);
	}
	return data.skins.filter((s) => ids.has(s.id));
}
