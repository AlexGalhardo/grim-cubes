/**
 * Every special-effect id the data may name, grouped by the module that implements it (B-02-01). The enum of
 * `effectId` in `data/schema/common.schema.json` must list exactly these ids, so `data:check` refuses an id nobody
 * handles; `effectIds.test.ts` keeps the two lists and the code in step.
 */
export const EFFECT_HANDLERS = {
	/** `computeEffects` in rules/effects.ts. */
	item: [
		"bleed_on_crit",
		"bonus_damage_vs_elites",
		"contact_damage",
		"damage_per_missing_hp",
		"double_fragment_chance",
		"end_of_round_fragment_bonus",
		"extra_pierce",
		"fragment_gain",
		"on_kill_explode",
		"proximity_aura_damage",
		"revive_once",
		"shockwave_every_kills",
		"pull_fragments",
		"soul_gain",
	],
	/** `configure` in systems/weapon.ts. */
	weapon: [
		"close_range_damage_mult",
		"crit_chance_bonus",
		"hero_speed_penalty_while_firing",
		"self_damage_in_radius",
	],
	/** `ossuaryBonuses` in rules/ossuary.ts. */
	ossuary: [
		"card_rerolls",
		"crit_mult_set",
		"dash_charges",
		"dash_cooldown_reduction",
		"dash_unlock",
		"extra_legendary_pool",
		"fragment_gain",
		"guaranteed_uncommon_shop_item",
		"soul_gain",
		"start_gold",
		"weak_phylactery",
	],
	/** Describes what the weapon kind already does, so there is nothing to look up: the sword hits its whole arc. */
	intrinsic: ["hit_all_in_arc"],
} as const;

export const IMPLEMENTED_EFFECT_IDS: readonly string[] = [
	...new Set(Object.values(EFFECT_HANDLERS).flat()),
].sort();
