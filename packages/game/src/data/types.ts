import type { FragmentsConfig, XpConfig } from "../rules/fragments";
import type { ShopConfig, TierChance } from "../rules/shop";
import type { Modifier } from "../rules/stats";
import type { RunConfig } from "../systems/round";
import type { SpawnConfig } from "../systems/spawn";
import type { WeaponDef } from "../systems/weapon";
import type { WorldConfig } from "../world/chunkSystem";

/** `data/hero.json`. */
export interface HeroData {
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

/** `data/rounds.json` (the blocks the game reads). */
export interface RoundsData {
	flow: RunConfig["flow"];
	duration: RunConfig["duration"];
	boss: RunConfig["boss"];
	ai: { separationWeight: number; attackAnimationSeconds: number };
	spawn: SpawnConfig;
	biomeMix: Record<string, Record<string, number>>;
	fragments: FragmentsConfig;
	xp: XpConfig;
	shop: ShopConfig;
	tierChance: TierChance[];
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
}
