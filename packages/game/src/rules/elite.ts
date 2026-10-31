import type { EliteModifierData, ElitesData } from "../data/types";

export interface EliteRoller {
	/** Decides whether this round gets an elite; call once per round, in order. */
	next(round: number, boss: boolean): boolean;
	/** Common rounds in a row without an elite. */
	readonly missed: number;
}

export interface EliteRng {
	chance(p: number): boolean;
}

/**
 * GDD 11: from `minRound`, each common round has `chance` of an elite; after `pityRounds` common rounds in a
 * row without one, the next is guaranteed. Boss rounds neither roll nor count. Round 1 never has one.
 */
export function createEliteRoller(
	rng: EliteRng,
	config: Pick<ElitesData, "chance" | "pityRounds" | "minRound" | "excludeBossRounds">,
): EliteRoller {
	let missed = 0;
	return {
		get missed(): number {
			return missed;
		},
		next(round: number, boss: boolean): boolean {
			if (boss && config.excludeBossRounds) return false;
			if (round < config.minRound) {
				missed++;
				return false;
			}
			const elite = missed >= config.pityRounds || rng.chance(config.chance);
			missed = elite ? 0 : missed + 1;
			return elite;
		},
	};
}

export interface EliteStats {
	hpMult: number;
	armorAdd: number;
	speedMult: number;
	lifesteal: number;
	explosion: { radius: number; damage: number } | null;
}

/** Numbers one modifier applies at `round` (explosion damage grows with the round). */
export function eliteStats(modifier: EliteModifierData, round: number): EliteStats {
	const boom = modifier.onDeathExplosion;
	return {
		hpMult: modifier.hpMult,
		armorAdd: modifier.armorAdd ?? 0,
		speedMult: modifier.speedMult ?? 1,
		lifesteal: modifier.lifestealOfDamage ?? 0,
		explosion: boom
			? { radius: boom.radius, damage: boom.damageBase + boom.damagePerRound * round }
			: null,
	};
}
