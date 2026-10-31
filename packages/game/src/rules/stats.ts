export interface Modifier {
	stat: string;
	op: string;
	value: number;
}

/** Flat hero stats (SDD 05 section 2). Percentages are fractions; `speed` is already in u/s. */
export interface PlayerStats {
	maxHp: number;
	hpRegen: number;
	lifeSteal: number;
	damage: number;
	attackSpeed: number;
	critChance: number;
	critMult: number;
	range: number;
	armor: number;
	dodge: number;
	speed: number;
	luck: number;
	harvest: number;
	pickupRadius: number;
	xpGain: number;
	shopPrice: number;
	knockback: number;
	enemySpeed: number;
	bossDamage: number;
	explosionSize: number;
	/** Rerolls per shop visit that cost nothing. */
	freeRerolls: number;
	/** Set whenever a modifier is added; the statsSystem clears it after recomputing. */
	dirty: boolean;
}

export type StatField = Exclude<keyof PlayerStats, "dirty">;

/** `stat` ids used in `cards.json`, `items.json` and `ossuary.json` mapped to fields. */
export const STAT_FIELDS: Readonly<Record<string, StatField>> = {
	max_hp: "maxHp",
	hp_regen: "hpRegen",
	life_steal: "lifeSteal",
	damage: "damage",
	attack_speed: "attackSpeed",
	crit_chance: "critChance",
	range: "range",
	armor: "armor",
	dodge: "dodge",
	speed: "speed",
	luck: "luck",
	harvest: "harvest",
	pickup_range: "pickupRadius",
	xp_gain: "xpGain",
	shop_price: "shopPrice",
	knockback: "knockback",
	enemy_speed: "enemySpeed",
	boss_damage: "bossDamage",
	explosion_size: "explosionSize",
	free_rerolls: "freeRerolls",
};

const FIELDS = [...new Set(Object.values(STAT_FIELDS))];

export interface StatCaps {
	dodge: number;
	critChance: number;
}

/** The slice of `data/hero.json` the stats read. */
export interface HeroStatsData {
	base: {
		maxHp: number;
		hpRegen: number;
		speed: number;
		pickupRadius: number;
		armor: number;
		dodge: number;
		critChance: number;
		critMult: number;
		damage: number;
		attackSpeed: number;
		luck: number;
		harvest: number;
	};
	caps: { dodge: number };
}

export function createPlayerStats(): PlayerStats {
	return {
		maxHp: 0,
		hpRegen: 0,
		lifeSteal: 0,
		damage: 0,
		attackSpeed: 0,
		critChance: 0,
		critMult: 2,
		range: 0,
		armor: 0,
		dodge: 0,
		speed: 0,
		luck: 0,
		harvest: 0,
		pickupRadius: 0,
		xpGain: 0,
		shopPrice: 0,
		knockback: 0,
		enemySpeed: 0,
		bossDamage: 0,
		explosionSize: 0,
		freeRerolls: 0,
		dirty: false,
	};
}

const add = createPlayerStats();
const mul = createPlayerStats();

/**
 * SDD 05 section 2 order: base, then every `add` summed, then every `mul` multiplied, then caps.
 * Writes into `out` in place so systems holding the object see the new values. `speed` modifiers are
 * fractions of the base speed (+4% = 0.04).
 */
export function computeStats(
	data: HeroStatsData,
	modifiers: readonly Modifier[],
	out: PlayerStats,
	caps: StatCaps = { dodge: data.caps.dodge, critChance: 1 },
): void {
	for (const f of FIELDS) {
		add[f] = 0;
		mul[f] = 1;
	}
	for (let i = 0; i < modifiers.length; i++) {
		const m = modifiers[i];
		if (!m) continue;
		const field = STAT_FIELDS[m.stat];
		if (!field) throw new RangeError(`unknown stat "${m.stat}" in a modifier`);
		if (m.op === "add") add[field] += m.value;
		else if (m.op === "mul") mul[field] *= m.value;
	}

	const b = data.base;
	out.maxHp = (b.maxHp + add.maxHp) * mul.maxHp;
	out.hpRegen = (b.hpRegen + add.hpRegen) * mul.hpRegen;
	out.lifeSteal = add.lifeSteal * mul.lifeSteal;
	out.damage = (b.damage + add.damage) * mul.damage;
	out.attackSpeed = (b.attackSpeed + add.attackSpeed) * mul.attackSpeed;
	out.critChance = Math.min((b.critChance + add.critChance) * mul.critChance, caps.critChance);
	out.critMult = b.critMult;
	out.range = add.range * mul.range;
	out.armor = (b.armor + add.armor) * mul.armor;
	out.dodge = Math.min(Math.max((b.dodge + add.dodge) * mul.dodge, 0), caps.dodge);
	out.speed = b.speed * (1 + add.speed) * mul.speed;
	out.luck = (b.luck + add.luck) * mul.luck;
	out.harvest = (b.harvest + add.harvest) * mul.harvest;
	out.pickupRadius = b.pickupRadius * (1 + add.pickupRadius) * mul.pickupRadius;
	out.xpGain = add.xpGain * mul.xpGain;
	out.shopPrice = add.shopPrice * mul.shopPrice;
	out.knockback = add.knockback * mul.knockback;
	out.enemySpeed = add.enemySpeed * mul.enemySpeed;
	out.bossDamage = add.bossDamage * mul.bossDamage;
	out.explosionSize = add.explosionSize * mul.explosionSize;
	out.freeRerolls = Math.max(0, Math.floor(add.freeRerolls * mul.freeRerolls));
}
