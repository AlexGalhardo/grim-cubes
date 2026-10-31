import { hasComponent, removeEntity } from "bitecs";
import { Boss, Elite, EnemyFaction, EnemyType, Fragment, Health, Position, Radius } from "../ecs/components";
import { dropFragment } from "../ecs/fragments";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { ItemEffects } from "../rules/effects";
import {
	dropChance,
	type FragmentsConfig,
	harvestCount,
	type XpConfig,
	xpForLevel,
} from "../rules/fragments";
import type { RunStats } from "../rules/runstats";

/** Run-wide currency and experience. The UI reads it through the store snapshot. */
export interface Progress {
	gold: number;
	/** Fragment value collected since the round began; `tithe_box` adds a fraction of it at round end. */
	roundGold: number;
	xp: number;
	level: number;
	/** Level-ups earned and not yet resolved by the card screen (P-05-03). */
	pendingLevelUps: number;
}

export function createProgress(): Progress {
	return { gold: 0, roundGold: 0, xp: 0, level: 1, pendingLevelUps: 0 };
}

// shortcut: cap de 65.535 por pilha (u16); revisar se a economia passar disso.
const MAX_PILE_VALUE = 0xffff;

export function addFragmentValue(
	progress: Progress,
	fragments: FragmentsConfig,
	xp: XpConfig,
	value: number,
	xpGain = 0,
): void {
	progress.gold += value * fragments.goldPerFragment;
	progress.roundGold += value * fragments.goldPerFragment;
	progress.xp += value * fragments.xpPerFragment * (1 + xpGain);
	let need = xpForLevel(xp, progress.level);
	while (progress.xp >= need) {
		progress.xp -= need;
		progress.level++;
		progress.pendingLevelUps++;
		need = xpForLevel(xp, progress.level);
	}
}

/** Round-end harvest: `harvest * (1 + 0.05 * N)` extra fragments, credited straight to gold and XP. */
export function applyHarvest(
	progress: Progress,
	fragments: FragmentsConfig,
	xp: XpConfig,
	round: number,
	harvest: number,
	xpGain = 0,
): number {
	const count = harvestCount(fragments, round, harvest);
	if (count > 0) addFragmentValue(progress, fragments, xp, count, xpGain);
	return count;
}

export interface DeathSystemDeps {
	fragments: FragmentsConfig;
	/** `fragments` count per enemy type index (`data/enemies.json`). */
	fragmentsPerType: readonly number[];
	rng: { chance(p: number): boolean };
	round: () => number;
	/** Item effects (`double_fragment_chance`); optional. */
	effects?: ItemEffects | undefined;
	/** Run tallies (kills, elites, bosses); optional. */
	runStats?: RunStats | undefined;
}

export interface DeathSystem {
	run(world: GameWorld): void;
}

const enemyList = createQueryCache([EnemyFaction, Health, Position, EnemyType]);
const pileList = createQueryCache([Fragment, Position]);

/**
 * SDD 02 section 2.3 step 11: enemies at 0 HP drop one pile (value = the type's fragment count) with the
 * round's drop chance, then are recycled. Over the pile cap the drop merges into the nearest pile, value kept.
 */
export function createDeathSystem(deps: DeathSystemDeps): DeathSystem {
	const { fragments, fragmentsPerType, rng, round, effects, runStats } = deps;
	const dead = new Uint16Array(4096);

	function drop(world: GameWorld, x: number, z: number, value: number): void {
		const piles = pileList(world);
		if (piles.length < fragments.groundPileCap) {
			dropFragment(world, x, z, value);
			return;
		}
		let nearest = -1;
		let best = Number.POSITIVE_INFINITY;
		for (let i = 0; i < piles.length; i++) {
			const p = piles[i] ?? 0;
			const d = ((Position.x[p] ?? 0) - x) ** 2 + ((Position.z[p] ?? 0) - z) ** 2;
			if (d < best) {
				best = d;
				nearest = p;
			}
		}
		if (nearest >= 0)
			Fragment.value[nearest] = Math.min((Fragment.value[nearest] ?? 0) + value, MAX_PILE_VALUE);
	}

	return {
		run(world: GameWorld): void {
			const list = enemyList(world);
			let count = 0;
			for (let i = 0; i < list.length && count < dead.length; i++) {
				const e = list[i] ?? 0;
				if ((Health.hp[e] ?? 0) <= 0) dead[count++] = e;
			}
			const chance = dropChance(fragments, round());
			for (let i = 0; i < count; i++) {
				const e = dead[i] ?? 0;
				const base = fragmentsPerType[EnemyType.id[e] ?? 0] ?? 0;
				const value = effects && rng.chance(effects.doubleFragmentChance) ? base * 2 : base;
				if (value > 0 && rng.chance(chance))
					drop(world, Position.x[e] ?? 0, Position.z[e] ?? 0, value);
				if (runStats) {
					runStats.kills++;
					if (hasComponent(world, e, Elite)) runStats.elitesKilled++;
					if (hasComponent(world, e, Boss)) runStats.bossRounds.push(round());
				}
				removeEntity(world, e);
			}
		},
	};
}

export interface PickupSystemDeps {
	fragments: FragmentsConfig;
	xp: XpConfig;
	progress: Progress;
	/** Live hero stats: `pickupRadius` in u and `xpGain` as a fraction. */
	stats: { pickupRadius: number; xpGain: number };
	/** Item effects (`fragment_gain`); optional. */
	effects?: ItemEffects | undefined;
}

export interface PickupSystem {
	run(world: GameWorld, hero: number): void;
}

/** SDD 02 section 2.3 step 12: piles inside the pickup radius fly to the hero and are collected on arrival. */
export function createPickupSystem(deps: PickupSystemDeps): PickupSystem {
	const { fragments, xp, progress, stats, effects } = deps;
	const magnetStep = fragments.magnetSpeed * STEP;
	const taken = new Uint16Array(4096);

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const reach = fragments.collectRadius + (Radius.r[hero] ?? 0);
			const piles = pileList(world);
			let collected = 0;
			for (let i = 0; i < piles.length; i++) {
				const p = piles[i] ?? 0;
				const dx = hx - (Position.x[p] ?? 0);
				const dz = hz - (Position.z[p] ?? 0);
				const dist = Math.hypot(dx, dz);
				if ((Fragment.magnetTimer[p] ?? 0) === 0 && dist > stats.pickupRadius) continue;
				Fragment.magnetTimer[p] = 1;
				if (dist <= reach || dist <= magnetStep) {
					if (collected < taken.length) taken[collected++] = p;
					continue;
				}
				Position.x[p] = (Position.x[p] ?? 0) + (dx / dist) * magnetStep;
				Position.z[p] = (Position.z[p] ?? 0) + (dz / dist) * magnetStep;
			}
			for (let i = 0; i < collected; i++) {
				const p = taken[i] ?? 0;
				addFragmentValue(
					progress,
					fragments,
					xp,
					(Fragment.value[p] ?? 0) * (1 + (effects?.fragmentGain ?? 0)),
					stats.xpGain,
				);
				removeEntity(world, p);
			}
		},
	};
}

/** `end_of_round_fragment_bonus` (`tithe_box`): adds a fraction of the round's fragments again, then resets the tally. */
export function applyRoundEndBonus(
	progress: Progress,
	fragments: FragmentsConfig,
	xp: XpConfig,
	effects: ItemEffects,
	xpGain = 0,
): number {
	const bonus = Math.floor(progress.roundGold * effects.endOfRoundFragmentBonus);
	progress.roundGold = 0;
	if (bonus > 0) addFragmentValue(progress, fragments, xp, bonus, xpGain);
	progress.roundGold = 0;
	return bonus;
}
