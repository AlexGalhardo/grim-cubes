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
	free_rerolls: { label: "rerolls grátis", percent: false },
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

const pct = (n: number): string => `${trim(n * 100)}%`;

/** pt-BR descriptions of the special effects on Ossuary nodes, until the i18n pipeline exists. */
const EFFECT_TEXT: Readonly<Record<string, (p: Record<string, number | string | boolean>) => string>> = {
	weak_phylactery: (p) => `Filactério fraco: revive 1× com ${pct(Number(p.hpFraction ?? 0))} de HP`,
	crit_mult_set: (p) => `Multiplicador crítico ×${trim(Number(p.value ?? 0))}`,
	dash_unlock: () => "Desbloqueia o dash",
	dash_cooldown_reduction: (p) => `Dash: recarga −${trim(Number(p.seconds ?? 0))} s`,
	dash_charges: (p) => `${trim(Number(p.value ?? 0))} cargas de dash`,
	fragment_gain: (p) => `+${pct(Number(p.fraction ?? 0))} fragmentos`,
	start_gold: (p) => `Começa a run com ${trim(Number(p.value ?? 0))} de ouro`,
	soul_gain: (p) => `+${pct(Number(p.fraction ?? 0))} almas`,
	guaranteed_uncommon_shop_item: () => "A loja começa com 1 item Incomum garantido",
	card_rerolls: (p) => `${trim(Number(p.count ?? 0))} reroll de cartas por run`,
	extra_legendary_pool: (p) => `Pool Lendário +${trim(Number(p.count ?? 0))} itens exclusivos`,
};

export function describeEffect(id: string, params: Record<string, number | string | boolean> = {}): string {
	return EFFECT_TEXT[id]?.(params) ?? id;
}
