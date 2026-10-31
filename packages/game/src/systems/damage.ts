import { addComponent, hasComponent } from "bitecs";
import {
	Armor,
	Bleed,
	Boss,
	Elite,
	EnemyFaction,
	EnemyType,
	Health,
	HitFlash,
	Invulnerable,
	Knockback,
	KnockbackResist,
} from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import {
	armorMultiplier,
	createLifeStealLimiter,
	type DamageConfig,
	effectiveDodge,
	knockbackScale,
} from "../rules/damage";
import type { ItemEffects } from "../rules/effects";
import type { RunStats } from "../rules/runstats";

export const DAMAGE_QUEUE_CAPACITY = 1024;

/** SoA queue, filled by weapon/projectile/contact systems and drained by `damageSystem` each step. */
export interface DamageQueue {
	/**
	 * `amount` is the pre-crit, pre-armor damage (weapon x damage% x bonus vs type).
	 * `critChance` is rolled by the system; use 0 for enemy attacks on the hero.
	 * Returns false (and counts a drop) when the queue is full.
	 */
	push(
		target: number,
		amount: number,
		source: number,
		critChance: number,
		knockbackX: number,
		knockbackZ: number,
	): boolean;
	readonly size: number;
	readonly dropped: number;
}

/** Mutable object owned by statsSystem; read by reference every step. */
export interface HeroCombatStats {
	armor: number;
	dodge: number;
	critMult: number;
	/** Fraction of damage dealt returned as HP (0.02 = 2%). */
	lifeSteal: number;
	/** Extra damage fraction against bosses (`boss_damage`). */
	bossDamage?: number;
}

export interface DamageSystemDeps {
	config: DamageConfig;
	rng: { dodge: { next(): number }; combat: { next(): number } };
	events: EventBuffer;
	hero: number;
	stats: HeroCombatStats;
	/** Item effects; optional so systems can run without items. */
	effects?: ItemEffects | undefined;
	/** Run tallies (damage dealt, killer); optional. */
	runStats?: RunStats | undefined;
	/** Called when the hero takes a hit that passed dodge and i-frames (`source` is 0 for non-enemy sources). */
	onHeroHit?: ((source: number, taken: number) => void) | undefined;
}

export interface DamageSystem {
	readonly queue: DamageQueue;
	run(world: GameWorld): void;
	/**
	 * Damage that ignores armor, dodge and i-frames (the leech leak). It still counts as damage taken: PlayerHit is
	 * emitted per whole HP and the killer is recorded when it is the one that kills the hero.
	 */
	drain(world: GameWorld, amount: number, by: number): void;
}

export function createDamageSystem(deps: DamageSystemDeps): DamageSystem {
	const { config, rng, events, hero, stats, effects, runStats, onHeroHit } = deps;
	const target = new Uint16Array(DAMAGE_QUEUE_CAPACITY);
	const amount = new Float32Array(DAMAGE_QUEUE_CAPACITY);
	const critChance = new Float32Array(DAMAGE_QUEUE_CAPACITY);
	const source = new Uint16Array(DAMAGE_QUEUE_CAPACITY);
	const kbX = new Float32Array(DAMAGE_QUEUE_CAPACITY);
	const kbZ = new Float32Array(DAMAGE_QUEUE_CAPACITY);
	let size = 0;
	let dropped = 0;

	const iFrameTicks = Math.round(config.iFramesOnHitSeconds / STEP);
	const knockbackTicks = Math.round(config.knockbackDurationSeconds / STEP);
	const lifeSteal = createLifeStealLimiter(config, STEP);

	const queue: DamageQueue = {
		push(t, a, s, c, x, z): boolean {
			if (size === DAMAGE_QUEUE_CAPACITY) {
				dropped++;
				return false;
			}
			target[size] = t;
			source[size] = s;
			amount[size] = a;
			critChance[size] = c;
			kbX[size] = x;
			kbZ[size] = z;
			size++;
			return true;
		},
		get size(): number {
			return size;
		},
		get dropped(): number {
			return dropped;
		},
	};

	function recordKiller(world: GameWorld, by: number): void {
		if (!runStats) return;
		if (by === hero) runStats.killer = { kind: "self", type: -1 };
		else if (by > 0 && hasComponent(world, by, EnemyFaction))
			runStats.killer = { kind: "enemy", type: EnemyType.id[by] ?? -1 };
	}

	function hitHero(world: GameWorld, i: number): void {
		// A dead hero takes no more hits: a second Died event or killer would overwrite the real ones.
		if ((Health.hp[hero] ?? 0) <= 0) return;
		if ((Invulnerable.ticks[hero] ?? 0) > 0) return;
		if (rng.dodge.next() < effectiveDodge(stats.dodge, config.dodgeCap)) {
			events.push(EventType.Dodged, 0, 0, 0, hero);
			return;
		}
		const taken = (amount[i] ?? 0) * armorMultiplier(stats.armor, config.armorConstant);
		Health.hp[hero] = (Health.hp[hero] ?? 0) - taken;
		Invulnerable.ticks[hero] = iFrameTicks;
		events.push(EventType.PlayerHit, taken, 0, 0, hero);
		onHeroHit?.(source[i] ?? 0, taken);
		if (runStats && (Health.hp[hero] ?? 0) <= 0) recordKiller(world, source[i] ?? 0);
		if ((Health.hp[hero] ?? 0) <= 0) events.push(EventType.Died, 0, 0, 0, hero);
	}

	function hitEnemy(world: GameWorld, i: number, eid: number): void {
		if ((Health.hp[eid] ?? 0) <= 0) return;
		const crit = rng.combat.next() < (critChance[i] ?? 0);
		const raw = (amount[i] ?? 0) * (crit ? stats.critMult : 1);
		const isBoss = hasComponent(world, eid, Boss);
		const isElite = hasComponent(world, eid, Elite);
		const bonus =
			(isBoss ? (stats.bossDamage ?? 0) : 0) + (isElite ? (effects?.bonusDamageVsElites ?? 0) : 0);
		const dealt = raw * (1 + bonus) * armorMultiplier(Armor.value[eid] ?? 0, config.armorConstant);
		Health.hp[eid] = (Health.hp[eid] ?? 0) - dealt;
		if (runStats) runStats.damageDealt += dealt;
		HitFlash.ticks[eid] = 2;
		if (crit && effects && effects.bleedFraction > 0) {
			// A fresh crit restarts the bleed with the larger of the two remaining amounts.
			const ticks = Math.max(1, Math.round(effects.bleedSeconds / STEP));
			const perStep = (dealt * effects.bleedFraction) / ticks;
			addComponent(world, eid, Bleed);
			if (perStep * ticks >= (Bleed.perStep[eid] ?? 0) * (Bleed.ticks[eid] ?? 0)) {
				Bleed.perStep[eid] = perStep;
				Bleed.ticks[eid] = ticks;
			}
		}

		const scale = knockbackScale(config, hasComponent(world, eid, Boss), hasComponent(world, eid, Elite));
		const resist = 1 - (KnockbackResist.value[eid] ?? 0);
		// A hit with no push (aura, thorns, bleed-like ticks) must not cancel the knockback a weapon just gave.
		if ((kbX[i] ?? 0) !== 0 || (kbZ[i] ?? 0) !== 0) {
			Knockback.x[eid] = (kbX[i] ?? 0) * scale * resist;
			Knockback.z[eid] = (kbZ[i] ?? 0) * scale * resist;
			Knockback.ticks[eid] = knockbackTicks;
		}

		lifeSteal.add(dealt * stats.lifeSteal);
		events.push(EventType.Damaged, dealt, crit ? 1 : 0, 0, eid);
		if ((Health.hp[eid] ?? 0) <= 0) events.push(EventType.Died, 0, 0, 0, eid);
	}

	let drained = 0;

	return {
		queue,
		drain(world: GameWorld, amountHp: number, by: number): void {
			const before = Health.hp[hero] ?? 0;
			if (before <= 0) return;
			Health.hp[hero] = before - amountHp;
			drained += amountHp;
			const dead = (Health.hp[hero] ?? 0) <= 0;
			if (drained >= 1 || dead) {
				// c = 1: a leak, not a blow, so the render skips the hit pulse and the shake.
				events.push(EventType.PlayerHit, drained, 0, 1, hero);
				drained = 0;
			}
			if (dead) {
				recordKiller(world, by);
				events.push(EventType.Died, 0, 0, 0, hero);
			}
		},
		run(world: GameWorld): void {
			const ticks = Invulnerable.ticks[hero] ?? 0;
			if (ticks > 0) Invulnerable.ticks[hero] = ticks - 1;

			for (let i = 0; i < size; i++) {
				const eid = target[i] ?? 0;
				if (eid === hero) hitHero(world, i);
				else hitEnemy(world, i, eid);
			}
			size = 0;

			const heal = lifeSteal.step();
			if (heal > 0 && (Health.hp[hero] ?? 0) > 0) {
				Health.hp[hero] = Math.min((Health.hp[hero] ?? 0) + heal, Health.max[hero] ?? 0);
			}
		},
	};
}
