import type { SpatialHash } from "@gc/core";
import { hasComponent, removeComponent } from "bitecs";
import {
	Bleed,
	EnemyFaction,
	Health,
	Invulnerable,
	Position,
	Radius,
	ThornsCooldown,
} from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import {
	computeEffects,
	createItemEffects,
	type EffectSource,
	type EffectsExtra,
	type ItemEffects,
} from "../rules/effects";
import type { DamageQueue } from "./damage";

export interface EffectsSystem {
	readonly effects: ItemEffects;
	/** Call after the inventory changes (a shop purchase). */
	refresh(): void;
	/** Consumes a revive if one is available: restores HP, grants i-frames, returns true. */
	tryRevive(hero: number): boolean;
}

/** Steps of invulnerability after a revive (2 s). */
const REVIVE_IFRAMES = 120;

export function createEffectsSystem(
	items: readonly EffectSource[],
	owned: ReadonlyMap<string, number>,
	extra?: EffectsExtra,
	events?: EventBuffer,
): EffectsSystem {
	const effects = createItemEffects();
	let spent = 0;
	const refresh = (): void => computeEffects(items, owned, effects, spent, extra);
	refresh();

	return {
		effects,
		refresh,
		tryRevive(hero: number): boolean {
			if (effects.revives <= 0) return false;
			spent++;
			Health.hp[hero] = (Health.max[hero] ?? 0) * effects.reviveHpFraction;
			Invulnerable.ticks[hero] = REVIVE_IFRAMES;
			events?.push(EventType.Revived, 0, 0, 0, hero);
			refresh();
			return true;
		},
	};
}

export interface AuraSystemDeps {
	effects: ItemEffects;
	queue: DamageQueue;
	/** The enemy hash rebuilt this step (separationSystem.hash). */
	enemies: SpatialHash;
	round: () => number;
}

export interface AuraSystem {
	run(world: GameWorld, hero: number): void;
}

const MAX_NEAR = 128;

/** `proximity_aura_damage` (`brimstone_heart`): enemies near the hero take damage per second, spread over the steps. */
export function createAuraSystem(deps: AuraSystemDeps): AuraSystem {
	const { effects, queue, enemies, round } = deps;
	const near = new Uint16Array(MAX_NEAR);

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			for (let a = 0; a < effects.auras.length; a++) {
				const aura = effects.auras[a];
				if (!aura) continue;
				const perStep = (aura.damageBase + aura.damagePerRound * round()) * STEP;
				const n = enemies.queryCircle(hx, hz, aura.radius + 1, near);
				for (let i = 0; i < n; i++) {
					const e = near[i] ?? 0;
					if ((Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
					const dist = Math.hypot((Position.x[e] ?? 0) - hx, (Position.z[e] ?? 0) - hz);
					if (dist <= aura.radius + (Radius.r[e] ?? 0)) queue.push(e, perStep, 0, 0, 0, 0);
				}
			}
		},
	};
}

export interface BleedSystemDeps {
	events: EventBuffer;
}

const bleeding = createQueryCache([Bleed]);
const enemyFaction = createQueryCache([EnemyFaction]);
/** The bleed reports its damage to the render in lumps this often (steps), not every step. */
const BLEED_REPORT_STEPS = 30;

/**
 * `bone_saw`: a bleeding enemy loses its share of the crit's damage each step. It is damage over time, not a blow, so
 * it skips the hit path: no flash, no knockback reset, no life steal; the render hears one aggregated `Damaged`
 * every half second and `Died` when the bleed kills.
 */
export function createBleedSystem({ events }: BleedSystemDeps): { run(world: GameWorld): void } {
	return {
		run(world: GameWorld): void {
			const list = bleeding(world);
			for (let i = list.length - 1; i >= 0; i--) {
				const e = list[i] ?? 0;
				const ticks = Bleed.ticks[e] ?? 0;
				if (ticks <= 0) {
					removeComponent(world, e, Bleed);
					continue;
				}
				Bleed.ticks[e] = ticks - 1;
				const hp = Health.hp[e] ?? 0;
				if (hp > 0) {
					const dealt = Bleed.perStep[e] ?? 0;
					Health.hp[e] = hp - dealt;
					Bleed.shown[e] = (Bleed.shown[e] ?? 0) + dealt;
					if ((Health.hp[e] ?? 0) <= 0) events.push(EventType.Died, 0, 0, 0, e);
				}
				const last = ticks === 1 || (Health.hp[e] ?? 0) <= 0;
				if ((last || ticks % BLEED_REPORT_STEPS === 0) && (Bleed.shown[e] ?? 0) > 0) {
					events.push(EventType.Damaged, Bleed.shown[e] ?? 0, 0, 0, e);
					Bleed.shown[e] = 0;
				}
				if (last) removeComponent(world, e, Bleed);
			}
		},
	};
}

export interface ThornsSystemDeps {
	effects: ItemEffects;
	queue: DamageQueue;
	enemies: SpatialHash;
	/** `hero.json` `combat.contactCooldownSeconds`: the same enemy is hurt again no sooner than this. */
	cooldownSeconds: number;
}

/** `spiked_boots`: an enemy that touches the hero takes damage, at most once per contact cooldown. */
export function createThornsSystem(deps: ThornsSystemDeps): AuraSystem {
	const { effects, queue, enemies, cooldownSeconds } = deps;
	const near = new Uint16Array(MAX_NEAR);
	const cooldownSteps = Math.max(1, Math.round(cooldownSeconds / STEP));

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const reach = Radius.r[hero] ?? 0;
			// Every enemy cools down, near the hero or not: one that walked away must not come back still on cooldown.
			const all = enemyFaction(world);
			for (let i = 0; i < all.length; i++) {
				const e = all[i] ?? 0;
				const wait = ThornsCooldown.ticks[e] ?? 0;
				if (wait > 0) ThornsCooldown.ticks[e] = wait - 1;
			}
			const n = effects.contactDamage > 0 ? enemies.queryCircle(hx, hz, reach + 3, near) : 0;
			for (let i = 0; i < n; i++) {
				const e = near[i] ?? 0;
				if (!hasComponent(world, e, EnemyFaction) || (Health.hp[e] ?? 0) <= 0) continue;
				if ((ThornsCooldown.ticks[e] ?? 0) > 0) continue;
				const dist = Math.hypot((Position.x[e] ?? 0) - hx, (Position.z[e] ?? 0) - hz);
				if (dist > reach + (Radius.r[e] ?? 0)) continue;
				queue.push(e, effects.contactDamage, hero, 0, 0, 0);
				ThornsCooldown.ticks[e] = cooldownSteps;
			}
		},
	};
}

export interface KillEffectsDeps {
	effects: ItemEffects;
	queue: DamageQueue;
	enemies: SpatialHash;
	events: EventBuffer;
	/** The `effects` stream. */
	rng: { chance(p: number): boolean };
	round: () => number;
	hero: number;
}

export interface KillEffectsSystem {
	/** Wire to the death system's `onDeath`. */
	onKill(world: GameWorld, enemy: number, x: number, z: number): void;
}

/** `doom_sigil` (chance-on-kill explosion) and `cube_of_wrath` (a wave around the hero every N kills). */
export function createKillEffectsSystem(deps: KillEffectsDeps): KillEffectsSystem {
	const { effects, queue, enemies, events, rng, round, hero } = deps;
	const near = new Uint16Array(MAX_NEAR);
	/** Kills counted towards each owned cube; grows with the inventory, never shrinks mid-run. */
	const counters: number[] = [];

	function blast(
		world: GameWorld,
		x: number,
		z: number,
		radius: number,
		damage: number,
		skip: number,
	): void {
		events.push(EventType.Exploded, x, z, radius, 0);
		const n = enemies.queryCircle(x, z, radius + 1, near);
		for (let i = 0; i < n; i++) {
			const e = near[i] ?? 0;
			if (e === skip || (Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
			const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
			if (dist <= radius + (Radius.r[e] ?? 0)) queue.push(e, damage, hero, 0, 0, 0);
		}
	}

	return {
		onKill(world: GameWorld, enemy: number, x: number, z: number): void {
			const level = round();
			for (const boom of effects.explosions) {
				if (rng.chance(boom.chance))
					blast(world, x, z, boom.radius, boom.damageBase + boom.damagePerRound * level, enemy);
			}
			for (let i = 0; i < effects.shockwaves.length; i++) {
				const wave = effects.shockwaves[i];
				if (!wave) continue;
				const kills = (counters[i] ?? 0) + 1;
				if (kills >= wave.kills) {
					counters[i] = 0;
					blast(
						world,
						Position.x[hero] ?? 0,
						Position.z[hero] ?? 0,
						wave.radius,
						wave.damageBase + wave.damagePerRound * level,
						enemy,
					);
				} else {
					counters[i] = kills;
				}
			}
		},
	};
}
