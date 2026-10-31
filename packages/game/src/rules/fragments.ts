/** `data/rounds.json` `fragments` block. */
export interface FragmentsConfig {
	guaranteedDropUntilRound: number;
	dropPercentBase: number;
	dropPercentPerRound: number;
	dropPercentMin: number;
	goldPerFragment: number;
	xpPerFragment: number;
	groundPileCap: number;
	harvestPerRound: number;
	magnetSpeed: number;
	collectRadius: number;
}

/** `data/rounds.json` `xp` block. */
export interface XpConfig {
	base: number;
	perLevel: number;
}

/** GDD 18.1: 100% up to round 4, then `100 - 1.5 * N`, never below 50%. Returns a probability. */
export function dropChance(config: FragmentsConfig, round: number): number {
	if (round <= config.guaranteedDropUntilRound) return 1;
	const percent = config.dropPercentBase - config.dropPercentPerRound * round;
	return Math.max(config.dropPercentMin, percent) / 100;
}

/** GDD 16.1: XP needed to leave `level`: `10 + 8 * (level - 1)`. */
export function xpForLevel(config: XpConfig, level: number): number {
	return config.base + config.perLevel * (level - 1);
}

/** GDD 18.1: `harvest * (1 + 0.05 * N)` extra fragments at round end, rounded up. */
export function harvestCount(config: FragmentsConfig, round: number, harvest: number): number {
	if (harvest <= 0) return 0;
	return Math.ceil(harvest * (1 + config.harvestPerRound * round) - 1e-9);
}
