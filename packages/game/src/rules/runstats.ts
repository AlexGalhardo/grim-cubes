/** What the Results screen and the souls formula need from a run (GDD 21, 18.2). */
export interface RunStats {
	kills: number;
	damageDealt: number;
	elitesKilled: number;
	/** Combat time of the run, in seconds. */
	seconds: number;
	/** Round of every boss killed. */
	bossRounds: number[];
	/**
	 * Who landed the blow that killed the hero: an enemy (`type` is its `enemies.json` index), an elite (same),
	 * a boss (`type` is its `bosses.json` index), an enemy projectile (shooter unknown), or the hero's own blast.
	 */
	killer: { kind: "none" | "enemy" | "elite" | "boss" | "shot" | "self"; type: number };
	/** Damage dealt to enemies by `DamageOrigin`. */
	damageBySource: number[];
}

/** Where a point of damage dealt to enemies came from, for the Results bars. */
export const DamageOrigin = { Weapon: 0, Spell: 1, Item: 2, Bleed: 3 } as const;
export const DAMAGE_ORIGIN_COUNT = 4;

export function createRunStats(): RunStats {
	return {
		kills: 0,
		damageDealt: 0,
		elitesKilled: 0,
		seconds: 0,
		bossRounds: [],
		killer: { kind: "none", type: -1 },
		damageBySource: new Array<number>(DAMAGE_ORIGIN_COUNT).fill(0),
	};
}
