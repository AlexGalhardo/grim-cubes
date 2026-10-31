import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { EnemyFaction, Health, Position, Radius } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { spawnProjectile } from "../ecs/projectile";
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
	projectile?: { count: number; pierce?: number; spreadDegrees?: number; speed?: number };
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
	const { weapon, tier, stats, queue, events, targeting, enemies, rng } = deps;
	if (weapon.kind !== "melee" && weapon.kind !== "single_shot") {
		throw new RangeError(`weapon kind "${weapon.kind}" is not implemented`);
	}
	const near = new Uint16Array(MAX_HITS);
	const arcCos = Math.cos((((weapon.arcDegrees ?? 360) / 2) * Math.PI) / 180);
	const critBonus = weapon.special?.id === "crit_chance_bonus" ? (weapon.special.params?.value ?? 0) : 0;
	const tierDamage = weapon.damageMult[tier] ?? 1;
	let cooldown = 0;
	let attacks = 0;

	const reach = (): number => weapon.range + weapon.rangeBonusPerTier * tier + stats.range;
	const cooldownSteps = (): number => {
		const rate =
			weapon.attacksPerSecond * (1 + weapon.attackSpeedBonusPerTier * tier + stats.attackSpeed);
		return Math.max(1, Math.round(1 / (Math.min(rate, deps.attackSpeedCap) * STEP)));
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
			queue.push(e, damage(), 0, crit(), dx * weapon.knockback, dz * weapon.knockback);
		}
	}

	function shoot(world: GameWorld, hero: number, dx: number, dz: number, range: number): void {
		const spec = weapon.projectile;
		const speed = spec?.speed ?? 0;
		if (speed <= 0) throw new RangeError("projectile weapons need projectile.speed in weapons.json");
		const spread = ((spec?.spreadDegrees ?? 0) * Math.PI) / 180;
		const count = spec?.count ?? 1;
		for (let i = 0; i < count; i++) {
			const a = Math.atan2(dz, dx) + (spread > 0 ? rng.float(-spread / 2, spread / 2) : 0);
			spawnProjectile(world, {
				x: Position.x[hero] ?? 0,
				z: Position.z[hero] ?? 0,
				vx: Math.cos(a) * speed,
				vz: Math.sin(a) * speed,
				damage: damage(),
				critChance: crit(),
				knockback: weapon.knockback,
				pierce: spec?.pierce ?? 0,
				lifeSteps: Math.ceil(range / speed / STEP),
			});
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
			if (cooldown > 0) cooldown--;
			const target = targeting.target;
			if (cooldown > 0 || target < 0) return;
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
			else shoot(world, hero, dx, dz, range);
			attacks++;
			cooldown = cooldownSteps();
		},
	};
}
