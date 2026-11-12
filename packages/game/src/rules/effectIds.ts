/**
 * Every special-effect id the data may name, grouped by the module that implements it (B-02-01). The enum of
 * `effectId` in `data/schema/common.schema.json` must list exactly these ids, so `data:check` refuses an id nobody
 * handles; `effectIds.test.ts` keeps the two lists and the code in step.
 */
export const EFFECT_HANDLERS = {
	/** `configure` in systems/weapon.ts. */
	weapon: [
		"close_range_damage_mult",
		"crit_chance_bonus",
		"hero_speed_penalty_while_firing",
		"self_damage_in_radius",
	],
	/** Describes what the weapon kind already does, so there is nothing to look up: the sword hits its whole arc. */
	intrinsic: ["hit_all_in_arc"],
} as const;

export const IMPLEMENTED_EFFECT_IDS: readonly string[] = [
	...new Set(Object.values(EFFECT_HANDLERS).flat()),
].sort();
