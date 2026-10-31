import biomesJson from "../../../../data/biomes.json";
import bossesJson from "../../../../data/bosses.json";
import cardsJson from "../../../../data/cards.json";
import elitesJson from "../../../../data/elites.json";
import enemiesJson from "../../../../data/enemies.json";
import heroJson from "../../../../data/hero.json";
import itemsJson from "../../../../data/items.json";
import milestonesJson from "../../../../data/milestones.json";
import ossuaryJson from "../../../../data/ossuary.json";
import propsJson from "../../../../data/props.json";
import renderJson from "../../../../data/render.json";
import roundsJson from "../../../../data/rounds.json";
import weaponsJson from "../../../../data/weapons.json";
import worldJson from "../../../../data/world.json";
import type { ShopWeapon } from "../rules/shop";
import { type BehaviorConfig, BehaviorKind } from "../systems/behavior";
import type { EnemyDef } from "../systems/spawn";
import type { BiomeDef } from "../world/chunkGen";
import type {
	BiomeData,
	BossData,
	CardsData,
	ElitesData,
	EnemyData,
	HeroData,
	ItemData,
	MilestonesData,
	OssuaryData,
	PropData,
	RenderData,
	RoundsData,
	WeaponData,
	WorldData,
} from "./types";

/**
 * Typed views of `data/*.json` (SDD 05 section 1). The assignments below are the type check: if a file
 * drifts from these shapes, `bun check` fails. `bun run data:check` validates the values against the schemas.
 */
export const heroData: HeroData = heroJson;
export const enemiesData: readonly EnemyData[] = enemiesJson;
export const weaponsData: readonly WeaponData[] = weaponsJson;
export const roundsData: RoundsData = roundsJson;
export const worldData: WorldData = worldJson;
export const biomesData: readonly BiomeData[] = biomesJson;
export const cardsData: CardsData = cardsJson;
export const ossuaryData: OssuaryData = ossuaryJson;
export const milestonesData: MilestonesData = milestonesJson;
export const bossesData: readonly BossData[] = bossesJson;
export const elitesData: ElitesData = elitesJson;
export const itemsData: readonly ItemData[] = itemsJson;
export const propsData: readonly PropData[] = propsJson;
export const renderData: RenderData = renderJson;

const BEHAVIORS: Readonly<Record<string, number>> = {
	chase: BehaviorKind.Chase,
	zigzag: BehaviorKind.Zigzag,
	push: BehaviorKind.Push,
	latch_drain: BehaviorKind.LatchDrain,
	armored: BehaviorKind.Armored,
	ranged_static: BehaviorKind.RangedStatic,
	charge: BehaviorKind.Charge,
	spawner: BehaviorKind.Spawner,
};

const param = (e: EnemyData, key: string, fallback: number): number => {
	const value = e.behaviorParams[key];
	return typeof value === "number" ? value : fallback;
};

/**
 * Maps `enemies.json` to the spawn system defs. Entry order is the `EnemyType` id. A behavior name that no
 * code implements throws, so a typo in the data cannot silently turn an enemy into a Carcaça.
 */
export function toEnemyDefs(enemies: readonly EnemyData[]): EnemyDef[] {
	return enemies.map((e) => {
		const behavior = BEHAVIORS[e.behavior];
		if (behavior === undefined) {
			throw new RangeError(`enemy "${e.id}" has unknown behavior "${e.behavior}"`);
		}
		return {
			radius: e.radius,
			hpBase: e.hpBase,
			hpPerRound: e.hpPerRound,
			damageBase: e.damageBase,
			damagePerRound: e.damagePerRound,
			speed: e.speed,
			armor: param(e, "armor", 0),
			behavior,
			knockbackTakenMult: param(e, "knockbackTakenMult", 1),
		};
	});
}

/**
 * Builds the behavior system config from the data: each special behavior reads the `behaviorParams` of the first
 * enemy that uses it. `cap` is the simultaneous-enemy limit the breeder must respect.
 */
export function behaviorConfigFromData(
	enemies: readonly EnemyData[],
	contactCooldownSeconds: number,
	attackAnimationSeconds: number,
	cap: number,
): BehaviorConfig {
	const of = (name: string): EnemyData | undefined => enemies.find((e) => e.behavior === name);
	const zigzag = of("zigzag");
	const leech = of("latch_drain");
	const watcher = of("ranged_static");
	const hunter = of("charge");
	const breeder = of("spawner");
	const spawnTarget = breeder ? enemies.findIndex((e) => e.id === breeder.behaviorParams.spawnEnemy) : -1;
	if (breeder && spawnTarget < 0) throw new RangeError("the spawner's spawnEnemy is not in enemies.json");
	return {
		zigzag: {
			amplitude: zigzag ? param(zigzag, "amplitude", 1.5) : 1.5,
			periodSeconds: zigzag ? param(zigzag, "periodSeconds", 0.8) : 0.8,
		},
		contactCooldownSeconds,
		attackAnimationSeconds,
		...(leech
			? {
					latch: {
						drainHpPerSecond: param(leech, "drainHpPerSecond", 1),
						speedMult: param(leech, "speedMult", 1.2),
					},
				}
			: {}),
		...(watcher
			? {
					ranged: {
						range: param(watcher, "projectileRange", 10),
						projectileSpeed: param(watcher, "projectileSpeed", 8),
						intervalSeconds: param(watcher, "intervalSeconds", 2),
						projectileRadius: param(watcher, "projectileRadius", 0.25),
					},
				}
			: {}),
		...(hunter
			? {
					charge: {
						intervalSeconds: param(hunter, "chargeIntervalSeconds", 3),
						triggerDistance: param(hunter, "triggerDistance", 8),
						windupSeconds: param(hunter, "windupSeconds", 0.5),
						chargeSeconds: param(hunter, "chargeSeconds", 0.6),
						speedMult: param(hunter, "speedMult", 3),
						recoverSeconds: param(hunter, "recoverSeconds", 1),
					},
				}
			: {}),
		...(breeder
			? {
					spawner: {
						type: spawnTarget,
						intervalSeconds: param(breeder, "spawnIntervalSeconds", 4),
						count: param(breeder, "spawnCount", 1),
						cap,
					},
				}
			: {}),
	};
}

export type {
	BiomeData,
	BossData,
	BossPatternData,
	CardsData,
	DifficultyData,
	EliteModifierData,
	ElitesData,
	EnemyData,
	HeroData,
	ItemData,
	ItemEffect,
	OssuaryBranchData,
	OssuaryData,
	OssuaryNodeData,
	PropData,
	RenderData,
	RoundsData,
	WeaponData,
	WorldData,
} from "./types";

/** Maps `biomes.json` to the chunk generator's defs (count ranges become tuples). */
export function toBiomeDefs(biomes: readonly BiomeData[]): BiomeDef[] {
	const range = (r: number[] | undefined): readonly [number, number] => [r?.[0] ?? 0, r?.[1] ?? 0];
	return biomes.map((b) => ({
		id: b.id,
		minDistance: b.minDistance,
		...(b.props && b.propCounts
			? {
					props: b.props,
					propCounts: {
						blocking: range(b.propCounts.blocking),
						decor: range(b.propCounts.decor),
						breakable: range(b.propCounts.breakable),
					},
				}
			: {}),
	}));
}

/** Weapons as the shop sees them; entries without prices cannot be offered and are priced out. */
export function toShopWeapons(weapons: readonly WeaponData[]): ShopWeapon[] {
	return weapons.map((w) => ({
		id: w.id,
		name: w.name,
		price: w.price ?? 0,
		upgradePrices: w.upgradePrices ?? [],
		unlockRound: w.unlockRound ?? 1,
	}));
}
