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
	formulas: {
		armorConstant: number;
		lifeStealTriggerSeconds: number;
		hpRegenFirstPoint: number;
		hpRegenExtraPoint: number;
	};
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
/** The Merchant NPC that waits for the hero after a round (A-05-01). */
export interface MerchantConfig {
	/** Distance from the hero at which he appears, in u. */
	distance: number;
	arriveSeconds: number;
	leaveSeconds: number;
	/** The shop opens by itself when the hero gets this close. */
	openRadius: number;
	/** The talk action works within this distance. */
	talkRadius: number;
}

export interface RoundsData {
	flow: RunConfig["flow"];
	merchant: MerchantConfig;
	duration: RunConfig["duration"];
	boss: RunConfig["boss"] & {
		soulsBase: number;
		soulsPerRound: number;
		enrageEverySeconds: number;
		enrageDamageSpeedBonus: number;
		/** From this round the boss is drawn from the whole roster instead of the fixed 10/20/30 order. */
		randomRosterFromRound: number;
		/** Boss rounds from which the boss carries one, then two, elite modifiers. */
		eliteModifierFromRound: number;
		secondEliteModifierFromRound: number;
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
	character: { blendSeconds: number; executionZoom: number; executionSeconds: number };
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
		bossScale: number;
		bossEnrageTint: number[];
		enemyShotSize: number;
		shakeHeroHit: number;
		shakeExplosion: number;
		shakeBossDeath: number;
		shakeSeconds: number;
		vignetteHit: number;
		vignetteSeconds: number;
		vignetteLowHpBelow: number;
		vignetteLowHpMax: number;
		hitSquash: number;
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
	/** Collision circle radius in units (blocking and breakable props). */
	radius: number;
	/** Hit points of a breakable prop. */
	hp?: number;
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
	/** Ossuary node that adds the item to the pool. */
	exclusiveTo?: string;
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
	/** Multiplies the shared boss contact damage (rounds.json boss); balance lever per boss. Default 1. */
	contactDamageMult?: number;
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

/** `data/milestones.json` (GDD 20). */
export interface MilestoneData {
	id: string;
	/** `record` is the best round reached on any difficulty. */
	requires: { stat: string; value: number };
	unlocksItem?: string | undefined;
	unlocksSkin?: string | undefined;
}

export interface SkinData {
	id: string;
	name: string;
	tint: string;
}

export interface MilestonesData {
	milestones: MilestoneData[];
	skins: SkinData[];
}

/** `data/consumables.json` (GDD 15.4). */
export interface ConsumableKindData {
	id: string;
	name: string;
	/** Relative drop weight among the kinds. */
	weight: number;
	/** `blood_vial`: fraction of max HP healed on pickup. */
	healFraction?: number;
	/** `bone_magnet`: seconds every fragment on the floor flies to the hero. */
	pullSeconds?: number;
}

export interface ConsumablesData {
	dropChance: { breakable: number; elite: number };
	pickupRadius: number;
	kinds: ConsumableKindData[];
}

export type ShadowQuality = "cascade2048" | "cascade1024" | "blob" | "none";

/** One entry of `data/presets.json` (SDD 14 section 5). */
export interface VideoPreset {
	id: string;
	name: string;
	/** Simultaneous enemy cap: spawns beyond it are removed without a drop. */
	enemyCap: number;
	shadows: ShadowQuality;
	post: "all" | "vignette" | "none";
	decalPool: number;
	particlePool: number;
	/** Render scale, 1 = native; `hardwareScalingLevel = 1 / renderScale`. */
	renderScale: number;
	/** The SceneOptimizer-style scaler may degrade the scale below `renderScale` while frames are slow. */
	dynamicScale: boolean;
}

export interface DynamicScaleConfig {
	/** Starting level = devicePixelRatio / startDivisor (never below 1). */
	startDivisor: number;
	maxLevel: number;
	p99Ms: number;
	degradeSeconds: number;
	recoverSeconds: number;
	step: number;
}

/**
 * One rule of the automatic preset (R-01-03). Every field present must hold; the first matching rule wins. Hardware
 * facts that the browser does not expose (`deviceMemory` is Chromium only) never match a memory bound.
 */
export interface AutoPresetRule {
	preset: string;
	mobile?: boolean;
	maxCores?: number;
	minCores?: number;
	maxMemoryGb?: number;
	minMemoryGb?: number;
	/** Case-insensitive regular expression tested against the WebGL renderer string. */
	rendererMatches?: string;
}

export interface PresetsData {
	auto: { fallback: string; rules: AutoPresetRule[] };
	default: string;
	dynamicScale: DynamicScaleConfig;
	presets: VideoPreset[];
}
