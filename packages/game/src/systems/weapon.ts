import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { EnemyFaction, Health, Position, Radius } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { ProjectilePool, ProjectileSpec } from "../ecs/projectile";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { ItemEffects } from "../rules/effects";
import type { DamageQueue } from "./damage";
import type { TargetingSystem } from "./targeting";

/** One entry of `data/weapons.json` (fields the system reads). */
export interface WeaponDef {
	id?: string;
	kind: string;
	range: number;
	attacksPerSecond: number;
	damage: number;
	knockback: number;
	arcDegrees?: number;
	projectile?: {
		count: number;
		pierce?: number;
		spreadDegrees?: number;
		speed?: number;
		radius?: number;
		explosionRadius?: number;
	};
	special?: { id: string; params?: Record<string, number> };
	damageMult: readonly number[];
	attackSpeedBonusPerTier: number;
	rangeBonusPerTier: number;
	price?: number;
	unlockRound?: number;
	upgradePrices?: readonly number[];
}

/** Live hero stats (statsSystem owns the object). Percentages are fractions: 0.05 = +5%. */
export interface WeaponStats {
	damage: number;
	attackSpeed: number;
	critChance: number;
	/** Flat range bonus in u. */
	range: number;
	/** Fraction added to explosion radii (`explosion_size`). */
	explosionSize?: number;
}

export interface WeaponSystemDeps {
	weapon: WeaponDef;
	tier: number;
	stats: WeaponStats;
	/** `caps.attackSpeedPerSecond` in `data/hero.json`. */
	attackSpeedCap: number;
	queue: DamageQueue;
	events: EventBuffer;
	targeting: TargetingSystem;
	/** The enemy hash rebuilt this step (separationSystem.hash). */
	enemies: SpatialHash;
	rng: { float(a: number, b: number): number };
	projectiles: ProjectilePool;
	/** Item effects (`extra_pierce`, `damage_per_missing_hp`); optional. */
	effects?: ItemEffects | undefined;
}

export interface WeaponSystem {
	/** Effective reach in u for this tier and stats; the targeting range. */
	readonly range: number;
	/** Attacks performed since creation. */
	readonly attacks: number;
	readonly tier: number;
	readonly weapon: WeaponDef;
	/** Multiplier for the hero's speed: below 1 while a weapon with a firing penalty is shooting. */
	readonly speedMultiplier: number;
	/** Highest tier index (`damageMult.length - 1`). */
	readonly maxTier: number;
	/** Raises the tier by one; false at the maximum. */
	upgrade(): boolean;
	/** Swaps the weapon (the old one is sold by the shop) and resets the attack cooldown. */
	setWeapon(weapon: WeaponDef, tier?: number): void;
	run(world: GameWorld, hero: number): void;
}

const MAX_HITS = 128;
const KINDS = new Set(["melee", "single_shot", "burst", "continuous", "explosive"]);

export function createWeaponSystem(deps: WeaponSystemDeps): WeaponSystem {
	const { stats, queue, events, targeting, enemies, rng, projectiles, effects } = deps;
	let heroId = -1;
	let weapon = deps.weapon;
	let tier = deps.tier;
	let arcCos = 1;
	let critBonus = 0;
	let closeMult = 1;
	let closeDistance = 0;
	let firingPenalty = 0;
	let lingerSteps = 0;
	let selfFraction = 0;
	let cooldown = 0;
	let firing = 0;
	let attacks = 0;
	// One mutable spec reused for every shot: the pool copies it into SoA, so nothing is allocated per attack.
	const shot: ProjectileSpec = {
		x: 0,
		z: 0,
		vx: 0,
		vz: 0,
		damage: 0,
		critChance: 0,
		knockback: 0,
		pierce: 0,
		lifeSteps: 0,
		radius: 0,
		explosionRadius: 0,
		selfFraction: 0,
	};
	const near = new Uint16Array(MAX_HITS);

	function configure(def: WeaponDef): void {
		if (!KINDS.has(def.kind)) throw new RangeError(`weapon kind "${def.kind}" is not implemented`);
		if (def.kind !== "melee" && !((def.projectile?.speed ?? 0) > 0)) {
			throw new RangeError("projectile weapons need projectile.speed in weapons.json");
		}
		const params = def.special?.params;
		weapon = def;
		arcCos = Math.cos((((def.arcDegrees ?? 360) / 2) * Math.PI) / 180);
		critBonus = def.special?.id === "crit_chance_bonus" ? (params?.value ?? 0) : 0;
		closeMult = def.special?.id === "close_range_damage_mult" ? (params?.mult ?? 1) : 1;
		closeDistance = def.special?.id === "close_range_damage_mult" ? (params?.maxDistance ?? 0) : 0;
		firingPenalty = def.special?.id === "hero_speed_penalty_while_firing" ? (params?.value ?? 0) : 0;
		lingerSteps = Math.round((params?.lingerSeconds ?? 0) / STEP);
		selfFraction = def.special?.id === "self_damage_in_radius" ? (params?.fraction ?? 0) : 0;
		shot.knockback = def.knockback;
		shot.pierce = def.projectile?.pierce ?? 0;
		shot.radius = def.projectile?.radius ?? 0;
	}
	configure(weapon);

	const maxTier = (): number => weapon.damageMult.length - 1;
	const reach = (): number => weapon.range + weapon.rangeBonusPerTier * tier + stats.range;
	const periodSteps = (): number => {
		const rate =
			weapon.attacksPerSecond * (1 + weapon.attackSpeedBonusPerTier * tier + stats.attackSpeed);
		return Math.max(1, 1 / (Math.min(rate, deps.attackSpeedCap) * STEP));
	};
	const missingHpPercent = (): number => {
		const max = Health.max[heroId] ?? 0;
		return max > 0 ? Math.max(0, 1 - (Health.hp[heroId] ?? 0) / max) * 100 : 0;
	};
	const damage = (targetDistance: number): number =>
		weapon.damage *
		(weapon.damageMult[tier] ?? 1) *
		(1 + stats.damage) *
		(1 + (effects?.damagePerMissingHpPercent ?? 0) * missingHpPercent()) *
		(closeMult !== 1 && targetDistance <= closeDistance ? closeMult : 1);
	const crit = (): number => stats.critChance + critBonus;

	function swing(world: GameWorld, hero: number, dx: number, dz: number, range: number): void {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		events.push(EventType.Swung, dx, dz, range, hero);
		const n = enemies.queryCircle(hx, hz, range + 1, near);
		for (let i = 0; i < n; i++) {
			const e = near[i] ?? 0;
			if ((Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
			const ex = (Position.x[e] ?? 0) - hx;
			const ez = (Position.z[e] ?? 0) - hz;
			const dist = Math.hypot(ex, ez);
			if (dist > range + (Radius.r[e] ?? 0)) continue;
			if (dist > 1e-6 && (ex * dx + ez * dz) / dist < arcCos) continue;
			// Radial knockback: each enemy is pushed away from the hero, not along the target direction.
			const rx = dist > 1e-6 ? ex / dist : dx;
			const rz = dist > 1e-6 ? ez / dist : dz;
			queue.push(e, damage(dist), 0, crit(), rx * weapon.knockback, rz * weapon.knockback);
		}
	}

	function shoot(hero: number, dx: number, dz: number, range: number, targetDistance: number): void {
		const projectile = weapon.projectile;
		const speed = projectile?.speed ?? 0;
		const spread = ((projectile?.spreadDegrees ?? 0) * Math.PI) / 180;
		const count = projectile?.count ?? 1;
		const explosion = (projectile?.explosionRadius ?? 0) * (1 + (stats.explosionSize ?? 0));
		for (let i = 0; i < count; i++) {
			const a = Math.atan2(dz, dx) + (spread > 0 ? rng.float(-spread / 2, spread / 2) : 0);
			shot.x = Position.x[hero] ?? 0;
			shot.z = Position.z[hero] ?? 0;
			shot.vx = Math.cos(a) * speed;
			shot.vz = Math.sin(a) * speed;
			shot.damage = damage(targetDistance);
			shot.pierce = (projectile?.pierce ?? 0) + (effects?.extraPierce ?? 0);
			shot.critChance = crit();
			shot.lifeSteps = Math.ceil(range / speed / STEP);
			shot.explosionRadius = explosion;
			shot.selfFraction = selfFraction;
			projectiles.acquire(shot);
		}
		events.push(EventType.Fired, dx, dz, 0, hero);
	}

	return {
		get range(): number {
			return reach();
		},
		get attacks(): number {
			return attacks;
		},
		get tier(): number {
			return tier;
		},
		get weapon(): WeaponDef {
			return weapon;
		},
		get maxTier(): number {
			return maxTier();
		},
		get speedMultiplier(): number {
			return firing > 0 ? 1 - firingPenalty : 1;
		},
		upgrade(): boolean {
			if (tier >= maxTier()) return false;
			tier++;
			return true;
		},
		setWeapon(next: WeaponDef, nextTier = 0): void {
			configure(next);
			tier = Math.min(nextTier, maxTier());
			cooldown = 0;
		},
		run(world: GameWorld, hero: number): void {
			heroId = hero;
			if (firing > 0) firing--;
			const target = targeting.target;
			if (cooldown <= 0 && target >= 0) {
				let dx = (Position.x[target] ?? 0) - (Position.x[hero] ?? 0);
				let dz = (Position.z[target] ?? 0) - (Position.z[hero] ?? 0);
				const dist = Math.hypot(dx, dz);
				if (dist > 1e-6) {
					dx /= dist;
					dz /= dist;
				} else {
					dx = 1;
					dz = 0;
				}
				const range = reach();
				if (weapon.kind === "melee") swing(world, hero, dx, dz, range);
				else shoot(hero, dx, dz, range, dist);
				attacks++;
				firing = lingerSteps;
				// Fractional period keeps the remainder, so 7.5 steps alternate 8 and 7 (SMG at exactly 8/s).
				cooldown += periodSteps();
			}
			// Floor of -1 so idle time banks at most one step of credit, never a burst.
			cooldown = Math.max(cooldown - 1, -1);
		},
	};
}
