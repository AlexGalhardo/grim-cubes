import { hash32x3 } from "@gc/core";

/** Slice of `data/world.json` `biomes`. */
export interface BiomeRoundsConfig {
	/** Rounds each biome lasts, in the order of `biomes.json` (10: rounds 1-10, 11-20, ...). */
	roundsPerBiome: number;
	/** From this round on the biome is drawn every round (infinite mode, ADR-0030). */
	randomFromRound: number;
}

const SALT = 0x62696f6d;

/**
 * Index of the biome a round is played in: the list order, `roundsPerBiome` rounds each, then one deterministic draw
 * per round (a pure function of the seed, so a resumed run lands in the same biome) once the list is used up.
 */
export function biomeForRound(config: BiomeRoundsConfig, count: number, seed: number, round: number): number {
	if (round >= config.randomFromRound) return (hash32x3(seed, round, SALT) >>> 0) % count;
	return Math.min(count - 1, Math.floor((Math.max(1, round) - 1) / config.roundsPerBiome));
}
