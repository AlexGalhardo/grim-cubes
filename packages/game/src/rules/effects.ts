/** The slice of an `items.json` entry that effects read. */
export interface EffectSource {
	id: string;
	status?: string;
	effects: readonly { id: string; params: Record<string, number | boolean> }[];
}

export interface ExplosionEffect {
	chance: number;
	radius: number;
	damageBase: number;
	damagePerRound: number;
}

export interface ShockwaveEffect {
	/** Kills between two waves. */
	kills: number;
	radius: number;
	damageBase: number;
	damagePerRound: number;
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
	/** Extra souls fraction at the end of a run (`soul_jar`). */
	soulGain: number;
	/** Fraction of the round's fragments added again at round end (`tithe_box`). */
	endOfRoundFragmentBonus: number;
	/** Revives left this run and the HP fraction restored (`phylactery`). */
	revives: number;
	reviveHpFraction: number;
	/** Seconds between two pulls of every fragment on the floor to the hero (`bone_lodestone`); 0 = none. */
	pullFragmentsEverySeconds: number;
	auras: AuraEffect[];
	/** Fraction of a critical hit's damage that bleeds on over `bleedSeconds` (`bone_saw`). */
	bleedFraction: number;
	bleedSeconds: number;
	/** Damage an enemy takes each time it touches the hero (`spiked_boots`). */
	contactDamage: number;
	/** Chance-on-kill explosions (`doom_sigil`), one entry per owned copy. */
	explosions: ExplosionEffect[];
	/** Every-N-kills waves around the hero (`cube_of_wrath`), one entry per owned copy. */
	shockwaves: ShockwaveEffect[];
}

export function createItemEffects(): ItemEffects {
	return {
		doubleFragmentChance: 0,
		bonusDamageVsElites: 0,
		extraPierce: 0,
		damagePerMissingHpPercent: 0,
		fragmentGain: 0,
		soulGain: 0,
		endOfRoundFragmentBonus: 0,
		revives: 0,
		reviveHpFraction: 0,
		pullFragmentsEverySeconds: 0,
		auras: [],
		bleedFraction: 0,
		bleedSeconds: 0,
		contactDamage: 0,
		explosions: [],
		shockwaves: [],
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
/** Permanent bonuses from the Ossuary that stack with the items (A-04-01). */
export interface EffectsExtra {
	fragmentGain: number;
	soulGain: number;
	/** HP fraction of the weak phylactery revive; null when the node is not owned. */
	weakReviveHpFraction: number | null;
}

export function computeEffects(
	items: readonly EffectSource[],
	owned: ReadonlyMap<string, number>,
	out: ItemEffects,
	revivesSpent = 0,
	extra?: EffectsExtra,
): void {
	out.doubleFragmentChance = 0;
	out.bonusDamageVsElites = 0;
	out.extraPierce = 0;
	out.damagePerMissingHpPercent = 0;
	out.fragmentGain = 0;
	out.soulGain = 0;
	out.endOfRoundFragmentBonus = 0;
	out.reviveHpFraction = 0;
	out.pullFragmentsEverySeconds = 0;
	out.auras.length = 0;
	out.bleedFraction = 0;
	out.bleedSeconds = 0;
	out.contactDamage = 0;
	out.explosions.length = 0;
	out.shockwaves.length = 0;
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
				case "soul_gain":
					out.soulGain += num(p, "fraction") * count;
					break;
				case "end_of_round_fragment_bonus":
					out.endOfRoundFragmentBonus += num(p, "fraction") * count;
					break;
				case "pull_fragments": {
					// Each copy pulls on its own clock, so n copies pull n times as often.
					const every = num(p, "intervalSeconds") / count;
					out.pullFragmentsEverySeconds =
						out.pullFragmentsEverySeconds === 0
							? every
							: Math.min(out.pullFragmentsEverySeconds, every);
					break;
				}
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
				case "bleed_on_crit":
					out.bleedFraction += num(p, "damageFraction") * count;
					out.bleedSeconds = Math.max(out.bleedSeconds, num(p, "durationSeconds"));
					break;
				case "contact_damage":
					out.contactDamage += num(p, "damage") * count;
					break;
				case "on_kill_explode":
					for (let i = 0; i < count; i++) {
						out.explosions.push({
							chance: num(p, "chance"),
							radius: num(p, "radius"),
							damageBase: num(p, "damageBase"),
							damagePerRound: num(p, "damagePerRound"),
						});
					}
					break;
				case "shockwave_every_kills":
					for (let i = 0; i < count; i++) {
						out.shockwaves.push({
							kills: num(p, "kills"),
							radius: num(p, "radius"),
							damageBase: num(p, "damageBase"),
							damagePerRound: num(p, "damagePerRound"),
						});
					}
					break;
				default:
					// An id nobody implemented would silently do nothing; mark the item `status: "alpha"` instead.
					throw new RangeError(`unknown effect "${effect.id}" on item "${item.id}"`);
			}
		}
	}
	if (extra) {
		out.fragmentGain += extra.fragmentGain;
		out.soulGain += extra.soulGain;
		// The weak phylactery only applies while the real one is not owned.
		if (extra.weakReviveHpFraction !== null && revives === 0) {
			revives = 1;
			out.reviveHpFraction = extra.weakReviveHpFraction;
		}
	}
	out.revives = Math.max(0, revives - revivesSpent);
}
