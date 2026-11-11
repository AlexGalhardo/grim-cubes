import type { MetaState } from "@gc/core";
import type { HeroDef, MilestoneData, MilestonesData } from "../data/types";
import { isReached } from "./milestones";

/** The milestones that gate `heroId`; a hero with none is open from the start. */
export function heroMilestones(data: MilestonesData, heroId: string): readonly MilestoneData[] {
	return data.milestones.filter((m) => m.unlocksHero === heroId);
}

/** True when the hero has no milestone, or when the account reached one of them. */
export function heroUnlocked(data: MilestonesData, meta: MetaState, heroId: string): boolean {
	const gates = heroMilestones(data, heroId);
	return gates.length === 0 || gates.some((m) => isReached(m, meta));
}

/** The hero a run starts with: `requested` when it exists and is unlocked, else the first (default) hero. */
export function chooseHero(
	heroes: readonly HeroDef[],
	data: MilestonesData,
	meta: MetaState,
	requested: string | null | undefined,
): string {
	const found = heroes.find((h) => h.id === requested);
	if (found && heroUnlocked(data, meta, found.id)) return found.id;
	const first = heroes[0];
	if (!first) throw new Error("data/heroes.json is empty");
	return first.id;
}
