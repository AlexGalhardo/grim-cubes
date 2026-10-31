/** The slice of an `items.json` entry that effects read. */
export interface EffectSource {
	id: string;
	status?: string;
	effects: readonly { id: string; params: Record<string, number | boolean> }[];
}

export interface AuraEffect {
	radius: number;
	damageBase: number;
	damagePerRound: number;
}

/**
 * Aggregated special effects of the items the hero owns (GDD 15). Systems hold this object and read it each
 * step; `computeEffects` rewrites it in place whenever the inventory changes.
 */
export interface ItemEffects {
	/** Chance that a dropped pile is worth double (`rat_king`). */
	doubleFragmentChance: number;
	/** Extra damage fraction against elites (`executioner_mark`). */
	bonusDamageVsElites: number;
	/** Extra enemies a shot passes through (`hellfire_round`). */
	extraPierce: number;
	/** Damage fraction gained per percent of missing HP (`blood_altar`, 0.01 = +1% per 1%). */
	damagePerMissingHpPercent: number;
	/** Extra fragment value credited on pickup (`gilded_skull`). */
	fragmentGain: number;
	/** Fraction of the round's fragments added again at round end (`tithe_box`). */
	endOfRoundFragmentBonus: number;
	/** Revives left this run and the HP fraction restored (`phylactery`). */
	revives: number;
	reviveHpFraction: number;
	auras: AuraEffect[];
}

export function createItemEffects(): ItemEffects {
	return {
		doubleFragmentChance: 0,
		bonusDamageVsElites: 0,
		extraPierce: 0,
		damagePerMissingHpPercent: 0,
		fragmentGain: 0,
		endOfRoundFragmentBonus: 0,
		revives: 0,
		reviveHpFraction: 0,
		auras: [],
	};
}

const num = (params: Record<string, number | boolean>, key: string): number => {
	const value = params[key];
	return typeof value === "number" ? value : 0;
};

/**
 * Recomputes `out` from the owned items (`owned` maps item id to count). Effects of items marked `status: "alpha"`
 * are not implemented yet and are ignored; their stat modifiers still apply through the stats system.
 * `revives` is only raised, never lowered, so a revive that was already spent stays spent.
 */
export function computeEffects(
	items: readonly EffectSource[],
	owned: ReadonlyMap<string, number>,
	out: ItemEffects,
	revivesSpent = 0,
): void {
	out.doubleFragmentChance = 0;
	out.bonusDamageVsElites = 0;
	out.extraPierce = 0;
	out.damagePerMissingHpPercent = 0;
	out.fragmentGain = 0;
	out.endOfRoundFragmentBonus = 0;
	out.reviveHpFraction = 0;
	out.auras.length = 0;
	let revives = 0;

	for (const item of items) {
		const count = owned.get(item.id) ?? 0;
		if (count <= 0 || item.status === "alpha") continue;
		for (const effect of item.effects) {
			const p = effect.params;
			switch (effect.id) {
				case "double_fragment_chance":
					out.doubleFragmentChance = Math.min(
						1,
						out.doubleFragmentChance + num(p, "chance") * count,
					);
					break;
				case "bonus_damage_vs_elites":
					out.bonusDamageVsElites += num(p, "value") * count;
					break;
				case "extra_pierce":
					out.extraPierce += num(p, "value") * count;
					break;
				case "damage_per_missing_hp":
					out.damagePerMissingHpPercent += num(p, "damagePerPercent") * count;
					break;
				case "fragment_gain":
					out.fragmentGain += num(p, "fraction") * count;
					break;
				case "end_of_round_fragment_bonus":
					out.endOfRoundFragmentBonus += num(p, "fraction") * count;
					break;
				case "revive_once":
					// Not stackable: owning it twice still revives once.
					revives = 1;
					out.reviveHpFraction = num(p, "hpFraction");
					break;
				case "proximity_aura_damage":
					for (let i = 0; i < count; i++) {
						out.auras.push({
							radius: num(p, "radius"),
							damageBase: num(p, "damageBase"),
							damagePerRound: num(p, "damagePerRound"),
						});
					}
					break;
				default:
					break;
			}
		}
	}
	out.revives = Math.max(0, revives - revivesSpent);
}
