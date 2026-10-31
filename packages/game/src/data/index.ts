import biomesJson from "../../../../data/biomes.json";
import cardsJson from "../../../../data/cards.json";
import elitesJson from "../../../../data/elites.json";
import enemiesJson from "../../../../data/enemies.json";
import heroJson from "../../../../data/hero.json";
import itemsJson from "../../../../data/items.json";
import propsJson from "../../../../data/props.json";
import renderJson from "../../../../data/render.json";
import roundsJson from "../../../../data/rounds.json";
import weaponsJson from "../../../../data/weapons.json";
import worldJson from "../../../../data/world.json";
import type { ShopWeapon } from "../rules/shop";
import { BehaviorKind } from "../systems/behavior";
import type { EnemyDef } from "../systems/spawn";
import type { BiomeDef } from "../world/chunkGen";
import type {
	BiomeData,
	CardsData,
	ElitesData,
	EnemyData,
	HeroData,
	ItemData,
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
export const elitesData: ElitesData = elitesJson;
export const itemsData: readonly ItemData[] = itemsJson;
export const propsData: readonly PropData[] = propsJson;
export const renderData: RenderData = renderJson;

const BEHAVIORS: Readonly<Record<string, number>> = {
	chase: BehaviorKind.Chase,
	zigzag: BehaviorKind.Zigzag,
};

/**
 * Maps `enemies.json` to the spawn system's defs. Behaviors without an implementation yet (A-02-02) chase.
 * Entry order is the `EnemyType` id.
 */
export function toEnemyDefs(enemies: readonly EnemyData[]): EnemyDef[] {
	return enemies.map((e) => ({
		radius: e.radius,
		hpBase: e.hpBase,
		hpPerRound: e.hpPerRound,
		damageBase: e.damageBase,
		damagePerRound: e.damagePerRound,
		speed: e.speed,
		armor: Number(e.behaviorParams.armor ?? 0),
		behavior: BEHAVIORS[e.behavior] ?? BehaviorKind.Chase,
	}));
}

export type {
	BiomeData,
	CardsData,
	EliteModifierData,
	ElitesData,
	EnemyData,
	HeroData,
	ItemData,
	ItemEffect,
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
