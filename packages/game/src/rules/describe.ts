import type { Described } from "@gc/core";
import type { Modifier, PlayerStats } from "./stats";

/**
 * The game describes stats and effects as keys plus parameters (`Described`); the UI layer turns them into text with
 * `t()` (A-07-01), so no language lives in `game`. `percent` stats are fractions in the data (0.05 = +5%).
 */
const PERCENT_STATS: ReadonlySet<string> = new Set([
	"life_steal",
	"damage",
	"attack_speed",
	"crit_chance",
	"dodge",
	"speed",
	"pickup_range",
	"xp_gain",
	"shop_price",
	"knockback",
	"enemy_speed",
	"boss_damage",
	"explosion_size",
]);

export function describeModifier(m: Modifier): Described {
	const stat: Described = { key: `stat.${m.stat}` };
	if (m.op === "mul") return { key: "modifier.mul", params: { stat, value: m.value } };
	const percent = PERCENT_STATS.has(m.stat);
	return {
		key: "modifier.add",
		params: {
			sign: m.value >= 0 ? "+" : "−",
			value: Math.abs(percent ? m.value * 100 : m.value),
			unit: percent ? "%" : "",
			stat,
		},
	};
}

/** One hero stat for the shop panel: `percent` values are fractions to show as percentages. */
export interface StatLine {
	/** Locale key of the label (`statLine.*`). */
	key: string;
	value: number;
	percent: boolean;
}

/** The hero stats the shop shows next to the offers. */
export function describeStats(stats: PlayerStats): StatLine[] {
	return [
		{ key: "statLine.maxHp", value: stats.maxHp, percent: false },
		{ key: "statLine.armor", value: stats.armor, percent: false },
		{ key: "statLine.damage", value: stats.damage, percent: true },
		{ key: "statLine.attackSpeed", value: stats.attackSpeed, percent: true },
		{ key: "statLine.critChance", value: stats.critChance, percent: true },
		{ key: "statLine.dodge", value: stats.dodge, percent: true },
		{ key: "statLine.speed", value: stats.speed, percent: false },
		{ key: "statLine.lifeSteal", value: stats.lifeSteal, percent: true },
		{ key: "statLine.hpRegen", value: stats.hpRegen, percent: false },
		{ key: "statLine.luck", value: stats.luck, percent: false },
		{ key: "statLine.harvest", value: stats.harvest, percent: false },
	];
}

/** Effect parameters that are fractions in the data and shown as percentages (`0.15` -> `15`). */
const FRACTION_PARAMS: ReadonlySet<string> = new Set(["hpFraction", "fraction"]);

export function describeEffect(
	id: string,
	params: Record<string, number | string | boolean> = {},
): Described {
	const out: Record<string, string | number> = {};
	for (const [name, value] of Object.entries(params)) {
		if (typeof value === "number") out[name] = FRACTION_PARAMS.has(name) ? value * 100 : value;
		else if (typeof value === "string") out[name] = value;
	}
	return { key: `effect.${id}`, params: out };
}
