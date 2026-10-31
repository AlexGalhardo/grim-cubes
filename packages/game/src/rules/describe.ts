import type { Modifier, PlayerStats } from "./stats";

/**
 * pt-BR labels for stats, until the i18n pipeline exists (SDD 07). `percent` stats are fractions in the data
 * (0.05 = +5%); the rest are shown as plain numbers.
 */
const LABELS: Readonly<Record<string, { label: string; percent: boolean }>> = {
	max_hp: { label: "HP máx", percent: false },
	hp_regen: { label: "regen", percent: false },
	life_steal: { label: "roubo de vida", percent: true },
	damage: { label: "dano", percent: true },
	attack_speed: { label: "velocidade de ataque", percent: true },
	crit_chance: { label: "crítico", percent: true },
	range: { label: "u alcance", percent: false },
	armor: { label: "armadura", percent: false },
	dodge: { label: "esquiva", percent: true },
	speed: { label: "velocidade", percent: true },
	luck: { label: "sorte", percent: false },
	harvest: { label: "colheita", percent: false },
	pickup_range: { label: "raio de pickup", percent: true },
	xp_gain: { label: "XP", percent: true },
	shop_price: { label: "preços na loja", percent: true },
	knockback: { label: "knockback", percent: true },
	enemy_speed: { label: "velocidade dos inimigos", percent: true },
	boss_damage: { label: "dano em chefes", percent: true },
	explosion_size: { label: "tamanho de explosão", percent: true },
};

const trim = (n: number): string => String(Math.round(n * 100) / 100).replace(".", ",");

export function describeModifier(m: Modifier): string {
	const meta = LABELS[m.stat] ?? { label: m.stat, percent: false };
	if (m.op === "mul") return `${meta.label} ×${trim(m.value)}`;
	const value = meta.percent ? m.value * 100 : m.value;
	return `${m.value >= 0 ? "+" : "−"}${trim(Math.abs(value))}${meta.percent ? "%" : ""} ${meta.label}`;
}

export interface StatLine {
	label: string;
	value: string;
}

/** The hero stats the shop shows next to the offers. */
export function describeStats(stats: PlayerStats): StatLine[] {
	const pct = (n: number): string => `${trim(n * 100)}%`;
	return [
		{ label: "HP máx", value: trim(stats.maxHp) },
		{ label: "Armadura", value: trim(stats.armor) },
		{ label: "Dano", value: pct(stats.damage) },
		{ label: "Vel. de ataque", value: pct(stats.attackSpeed) },
		{ label: "Crítico", value: pct(stats.critChance) },
		{ label: "Esquiva", value: pct(stats.dodge) },
		{ label: "Velocidade", value: trim(stats.speed) },
		{ label: "Roubo de vida", value: pct(stats.lifeSteal) },
		{ label: "Regen", value: trim(stats.hpRegen) },
		{ label: "Sorte", value: trim(stats.luck) },
		{ label: "Colheita", value: trim(stats.harvest) },
	];
}
