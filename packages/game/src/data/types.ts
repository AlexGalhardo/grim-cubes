import type { FragmentsConfig, XpConfig } from "../rules/fragments";
import type { ShopConfig, TierChance } from "../rules/shop";
import type { Modifier } from "../rules/stats";
import type { RunConfig } from "../systems/round";
import type { SpawnConfig } from "../systems/spawn";
import type { WeaponDef } from "../systems/weapon";
import type { WorldConfig } from "../world/chunkSystem";

/** `data/hero.json`. */
export interface HeroData {
	dash: { distance: number; durationSeconds: number; iFramesSeconds: number; cooldownSeconds: number };
	startingWeapon: string;
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
		radius: number;
	};
	caps: {
		lifeStealHpPerSecond: number;
		attackSpeedPerSecond: number;
		critChance: number;
		dodge: number;
		speedMax: number;
		speedMin: number;
	};
	formulas: { armorConstant: number; lifeStealTriggerSeconds: number };
	combat: {
		iFramesOnHitSeconds: number;
		contactCooldownSeconds: number;
		knockbackDurationSeconds: number;
		bossKnockbackMult: number;
		eliteKnockbackMult: number;
		targetPriorityDistanceMult: number;
	};
}

/** One entry of `data/enemies.json`. */
export interface EnemyData {
	id: string;
	name: string;
	biomeRing: number;
	radius: number;
	hpBase: number;
	hpPerRound: number;
	damageBase: number;
	damagePerRound: number;
	speed: number;
	sizeClass: string;
	/** Speed (u/s) at which the walk clip was authored. */
	walkRefSpeed: number;
	behavior: string;
	behaviorParams: Record<string, number | string>;
	fragments: number;
}

export type WeaponData = WeaponDef & { id: string; name: string };

/** One entry of `rounds.json` `difficulties` (GDD 17). */
export interface DifficultyData {
	id: string;
	/** Multiplies enemy and boss HP and damage. */
	hpDamageMult: number;
	soulsMult: number;
	/** Best round needed on another difficulty; absent when always open. */
	unlockedBy?: { difficulty: string; round: number } | undefined;
}

/** `data/rounds.json` (the blocks the game reads). */
export interface RoundsData {
	flow: RunConfig["flow"];
	duration: RunConfig["duration"];
	boss: RunConfig["boss"] & {
		soulsBase: number;
		soulsPerRound: number;
		enrageEverySeconds: number;
		enrageDamageSpeedBonus: number;
		contactDamageBase: number;
		contactDamagePerRound: number;
		hpScalePerTenRounds: number;
		rewardChest: { minTier: number; offered: number; picks: number };
		freeWeaponUpgrades: number;
	};
	ai: { separationWeight: number; attackAnimationSeconds: number };
	spawn: SpawnConfig;
	biomeMix: Record<string, Record<string, number>>;
	fragments: FragmentsConfig;
	xp: XpConfig;
	shop: ShopConfig;
	souls: { perRound: number; perElite: number };
	tierChance: TierChance[];
	difficulties: DifficultyData[];
}

/** `data/render.json`. */
export interface RenderData {
	camera: {
		alpha: number;
		elevationDegrees: number;
		fov: number;
		radius: number;
		radiusMobile: number;
		followRate: number;
	};
	vfx: {
		particlePool: number;
		decalPool: number;
		damageNumberPool: number;
		bloodCubesPerHit: number[];
		bloodCubesPerDeath: number[];
		explosionCubes: number[];
		reducedDeathCubes: number;
		cubeSizeRange: number[];
		particleLifeSeconds: number;
		gravity: number;
		bloodLightShare: number;
		decalSizeRange: number[];
		decalFromLandingChance: number;
		hitStopCritMs: number;
		hitStopBossDeathMs: number;
		flashBrightness: number;
		flashSeconds: number;
		damageNumberLifeSeconds: number;
		damageNumberRise: number;
		damageNumberHeight: number;
		projectileSize: number;
	};
	propFade: {
		minHeight: number;
		alpha: number;
		ratePerSecond: number;
		heroHalfWidth: number;
		heroHeight: number;
	};
}

/** One entry of `data/props.json`. */
export interface PropData {
	id: string;
	sizeClass: string;
	kind: string;
	/** Collision circle radius in units (blocking props). */
	radius: number;
	/** Model height in units. */
	height: number;
}

export interface BiomeData {
	id: string;
	name: string;
	ring: number;
	minDistance: number;
	maxDistance?: number;
	/** The last ring repeats outward (SDD 03). */
	repeats?: boolean;
	enemyPool: string[];
	/** Only the first ring has authored visuals so far (P-01-x). */
	floorTiles?: string[];
	props?: { blocking: string[]; decor: string[]; breakable: string[] };
	propCounts?: { blocking: number[]; decor: number[]; breakable: number[] };
	propDensity?: number;
	music?: string;
	fogColor?: string;
}

/** `data/cards.json`. */
export interface CardsData {
	doubleCard: { minLevel: number; chance: number; bonuses: number };
	cards: { id: string; name: string; modifiers: Modifier[] }[];
}

export type WorldData = WorldConfig;

export interface ItemEffect {
	id: string;
	params: Record<string, number | boolean>;
}

/** One entry of `data/items.json`. */
export interface ItemData {
	id: string;
	name: string;
	tier: number;
	price: number;
	modifiers: Modifier[];
	effects: ItemEffect[];
	status?: string;
}

export interface EliteModifierData {
	id: string;
	name: string;
	hpMult: number;
	aura: string;
	armorAdd?: number;
	speedMult?: number;
	lifestealOfDamage?: number;
	onDeathExplosion?: { radius: number; damageBase: number; damagePerRound: number };
}

/** `data/elites.json`. */
export interface ElitesData {
	chance: number;
	pityRounds: number;
	minRound: number;
	excludeBossRounds: boolean;
	scale: number;
	entryDelaySeconds: number;
	incomingWarningSeconds: number;
	reward: { chest: { tier: number; offered: number; picks: number }; souls: number; healHp: number };
	modifiers: EliteModifierData[];
}

export interface BossPatternData {
	id: string;
	params?: Record<string, number | string | boolean>;
}

/** One entry of `data/bosses.json`. Only the PROTOTYPE boss carries `radius` and `speed` so far. */
export interface BossData {
	id: string;
	name: string;
	round: number;
	hpBaseRound10: number;
	radius?: number;
	speed?: number;
	patternCooldownSeconds?: number;
	archetype: string;
	delivery: string;
	patterns: BossPatternData[];
}

export interface OssuaryNodeData {
	id: string;
	index: number;
	requires: string | null;
	cost: number;
	modifiers: Modifier[];
	effects: { id: string; params?: Record<string, number | string | boolean> }[];
}

export interface OssuaryBranchData {
	id: string;
	name: string;
	theme: string;
	nodes: OssuaryNodeData[];
}

/** `data/ossuary.json`. */
export interface OssuaryData {
	branches: OssuaryBranchData[];
	/** The demo sells only nodes with `index <= demoMaxNodeIndex` (GDD 19.2). */
	demoMaxNodeIndex: number;
}
