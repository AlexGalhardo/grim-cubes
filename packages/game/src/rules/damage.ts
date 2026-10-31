export interface DamageConfig {
	armorConstant: number;
	dodgeCap: number;
	lifeStealHpPerSecond: number;
	lifeStealTriggerSeconds: number;
	iFramesOnHitSeconds: number;
	knockbackDurationSeconds: number;
	bossKnockbackMult: number;
	eliteKnockbackMult: number;
}

/** The slice of `data/hero.json` that combat reads; the app passes the parsed file in. */
export interface HeroCombatData {
	caps: { lifeStealHpPerSecond: number; dodge: number };
	formulas: { armorConstant: number; lifeStealTriggerSeconds: number };
	combat: {
		iFramesOnHitSeconds: number;
		knockbackDurationSeconds: number;
		bossKnockbackMult: number;
		eliteKnockbackMult: number;
	};
}

export function damageConfigFromHero(hero: HeroCombatData): DamageConfig {
	return {
		armorConstant: hero.formulas.armorConstant,
		dodgeCap: hero.caps.dodge,
		lifeStealHpPerSecond: hero.caps.lifeStealHpPerSecond,
		lifeStealTriggerSeconds: hero.formulas.lifeStealTriggerSeconds,
		iFramesOnHitSeconds: hero.combat.iFramesOnHitSeconds,
		knockbackDurationSeconds: hero.combat.knockbackDurationSeconds,
		bossKnockbackMult: hero.combat.bossKnockbackMult,
		eliteKnockbackMult: hero.combat.eliteKnockbackMult,
	};
}

/**
 * Damage taken multiplier (GDD 8.2): 100 / (100 + armor * k) for armor >= 0.
 * Negative armor uses 2 - 100 / (100 + |armor| * k), which stays finite and below 2;
 * the literal GDD form diverges at armor = -100 / k (about -15).
 */
export function armorMultiplier(armor: number, armorConstant: number): number {
	const reduction = 100 / (100 + Math.abs(armor) * armorConstant);
	return armor >= 0 ? reduction : 2 - reduction;
}

export function effectiveDodge(dodge: number, cap: number): number {
	return Math.min(Math.max(dodge, 0), cap);
}

export function knockbackScale(config: DamageConfig, boss: boolean, elite: boolean): number {
	if (boss) return config.bossKnockbackMult;
	return elite ? config.eliteKnockbackMult : 1;
}

export interface LifeStealLimiter {
	/** Queues healing earned from damage dealt. */
	add(heal: number): void;
	/** Call once per simulation step; returns the HP to grant now (0 between triggers). */
	step(): number;
}

/** Releases at most `cap * triggerSeconds` HP per trigger, so healing never exceeds `cap` HP/s. */
export function createLifeStealLimiter(config: DamageConfig, stepSeconds: number): LifeStealLimiter {
	const triggerSteps = Math.max(1, Math.round(config.lifeStealTriggerSeconds / stepSeconds));
	const perTrigger = config.lifeStealHpPerSecond * config.lifeStealTriggerSeconds;
	let pending = 0;
	let steps = 0;
	return {
		add(heal: number): void {
			// Bounded backlog: no free healing long after the fight ended.
			pending = Math.min(pending + heal, config.lifeStealHpPerSecond);
		},
		step(): number {
			if (++steps < triggerSteps) return 0;
			steps = 0;
			const granted = Math.min(pending, perTrigger);
			pending -= granted;
			return granted;
		},
	};
}
