import { Health, Speed } from "../ecs/components";
import { computeStats, type HeroStatsData, type Modifier, type PlayerStats } from "../rules/stats";

export interface StatsSystem {
	readonly stats: PlayerStats;
	/** Every modifier picked this run (cards now; items and Ossuary nodes later). */
	readonly modifiers: readonly Modifier[];
	/** Adds modifiers and marks the stats dirty. */
	add(mods: readonly Modifier[]): void;
	/** Recomputes when dirty and pushes max HP and speed to the hero entity. */
	run(hero: number): void;
}

export function createStatsSystem(data: HeroStatsData, stats: PlayerStats): StatsSystem {
	const modifiers: Modifier[] = [];
	computeStats(data, modifiers, stats);

	return {
		stats,
		modifiers,
		add(mods: readonly Modifier[]): void {
			for (const m of mods) modifiers.push(m);
			stats.dirty = true;
		},
		run(hero: number): void {
			if (!stats.dirty) return;
			const before = Health.max[hero] ?? 0;
			computeStats(data, modifiers, stats);
			Health.max[hero] = stats.maxHp;
			// Gaining max HP also heals by the gain; losing it only clamps.
			const hp = (Health.hp[hero] ?? 0) + Math.max(0, stats.maxHp - before);
			Health.hp[hero] = Math.min(hp, stats.maxHp);
			Speed.value[hero] = stats.speed;
			stats.dirty = false;
		},
	};
}
