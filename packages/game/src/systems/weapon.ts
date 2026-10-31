import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { EnemyFaction, Health, Position, Radius } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { ProjectilePool, ProjectileSpec } from "../ecs/projectile";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { DamageQueue } from "./damage";
import type { TargetingSystem } from "./targeting";

/** One entry of `data/weapons.json` (fields the system reads). */
export interface WeaponDef {
	kind: string;
	range: number;
	attacksPerSecond: number;
	damage: number;
	knockback: number;
	arcDegrees?: number;
	projectile?: { count: number; pierce?: number; spreadDegrees?: number; speed?: number; radius?: number };
	special?: { id: string; params?: Record<string, number> };
	damageMult: readonly number[];
	attackSpeedBonusPerTier: number;
	rangeBonusPerTier: number;
}

/** Live hero stats (statsSystem owns the object). Percentages are fractions: 0.05 = +5%. */
export interface WeaponStats {
	damage: number;
	attackSpeed: number;
	critChance: number;
	/** Flat range bonus in u. */
	range: number;
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
}

export interface WeaponSystem {
	/** Effective reach in u for this tier and stats; the targeting range. */
	readonly range: number;
	/** Attacks performed since creation. */
	readonly attacks: number;
	run(world: GameWorld, hero: number): void;
}

const MAX_HITS = 128;

export function createWeaponSystem(deps: WeaponSystemDeps): WeaponSystem {
	const { weapon, tier, stats, queue, events, targeting, enemies, rng, projectiles } = deps;
	if (weapon.kind !== "melee" && weapon.kind !== "single_shot") {
		throw new RangeError(`weapon kind "${weapon.kind}" is not implemented`);
	}
	const projectile = weapon.projectile;
	if (weapon.kind === "single_shot" && !((projectile?.speed ?? 0) > 0)) {
		throw new RangeError("projectile weapons need projectile.speed in weapons.json");
	}
	// One mutable spec reused for every shot: the pool copies it into SoA, so nothing is allocated per attack.
	const shot: ProjectileSpec = {
		x: 0,
		z: 0,
		vx: 0,
		vz: 0,
		damage: 0,
		critChance: 0,
		knockback: weapon.knockback,
		pierce: projectile?.pierce ?? 0,
		lifeSteps: 0,
		radius: projectile?.radius ?? 0,
	};
	const near = new Uint16Array(MAX_HITS);
	const arcCos = Math.cos((((weapon.arcDegrees ?? 360) / 2) * Math.PI) / 180);
	const critBonus = weapon.special?.id === "crit_chance_bonus" ? (weapon.special.params?.value ?? 0) : 0;
	const tierDamage = weapon.damageMult[tier] ?? 1;
	let cooldown = 0;
	let attacks = 0;

	const reach = (): number => weapon.range + weapon.rangeBonusPerTier * tier + stats.range;
	const periodSteps = (): number => {
		const rate =
			weapon.attacksPerSecond * (1 + weapon.attackSpeedBonusPerTier * tier + stats.attackSpeed);
		return Math.max(1, 1 / (Math.min(rate, deps.attackSpeedCap) * STEP));
	};
	const damage = (): number => weapon.damage * tierDamage * (1 + stats.damage);
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
			queue.push(e, damage(), 0, crit(), rx * weapon.knockback, rz * weapon.knockback);
		}
	}

	function shoot(hero: number, dx: number, dz: number, range: number): void {
		const speed = projectile?.speed ?? 0;
		const spread = ((projectile?.spreadDegrees ?? 0) * Math.PI) / 180;
		const count = projectile?.count ?? 1;
		for (let i = 0; i < count; i++) {
			const a = Math.atan2(dz, dx) + (spread > 0 ? rng.float(-spread / 2, spread / 2) : 0);
			shot.x = Position.x[hero] ?? 0;
			shot.z = Position.z[hero] ?? 0;
			shot.vx = Math.cos(a) * speed;
			shot.vz = Math.sin(a) * speed;
			shot.damage = damage();
			shot.critChance = crit();
			shot.lifeSteps = Math.ceil(range / speed / STEP);
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
		run(world: GameWorld, hero: number): void {
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
				else shoot(hero, dx, dz, range);
				attacks++;
				// Fractional period keeps the remainder, so 7.5 steps alternate 8 and 7 (SMG at exactly 8/s).
				cooldown += periodSteps();
			}
			// Floor of -1 so idle time banks at most one step of credit, never a burst.
			cooldown = Math.max(cooldown - 1, -1);
		},
	};
}
