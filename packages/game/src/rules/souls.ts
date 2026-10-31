/** `data/rounds.json` `souls` block plus the boss reward from `boss`. */
export interface SoulsConfig {
	perRound: number;
	perElite: number;
	bossBase: number;
	bossPerRound: number;
}

export interface RunSummary {
	/** The round the run ended in (GDD 18.2: dying in round 12 counts 12). */
	round: number;
	elitesKilled: number;
	/** Round number of every boss killed. */
	bossRounds: readonly number[];
}

/**
 * GDD 18.2: `5 * rounds + 25 * elites + (100 + 10 * N)` per boss killed in round N, times the difficulty
 * multiplier and `1 + soul_gain` from items, rounded down.
 */
export function soulsForRun(config: SoulsConfig, run: RunSummary, difficultyMult = 1, soulGain = 0): number {
	const bosses = run.bossRounds.reduce((sum, n) => sum + config.bossBase + config.bossPerRound * n, 0);
	const base = config.perRound * run.round + config.perElite * run.elitesKilled + bosses;
	return Math.floor(base * difficultyMult * (1 + soulGain));
}
