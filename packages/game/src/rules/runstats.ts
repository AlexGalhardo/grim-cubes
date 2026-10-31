/** What the Results screen and the souls formula need from a run (GDD 21, 18.2). */
export interface RunStats {
	kills: number;
	damageDealt: number;
	elitesKilled: number;
	/** Round of every boss killed. */
	bossRounds: number[];
	/** Who landed the blow that killed the hero. */
	killer: { kind: "none" | "enemy" | "self"; type: number };
}

export function createRunStats(): RunStats {
	return { kills: 0, damageDealt: 0, elitesKilled: 0, bossRounds: [], killer: { kind: "none", type: -1 } };
}
