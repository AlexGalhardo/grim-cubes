import { addComponent } from "bitecs";
import { bossesData } from "../data";
import type { BossData, RoundsData } from "../data/types";
import { dropChest } from "../ecs/chest";
import { Boss, ContactDamage, Health, Position, Radius, Speed, Velocity } from "../ecs/components";
import type { EnemyShotPool } from "../ecs/enemyShot";
import { type EventBuffer, EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import { buildPatterns, hasPattern, type PatternContext, type PatternHandler } from "./bossPatterns";
import type { DamageQueue } from "./damage";
import type { HeroStatus } from "./heroStatus";
import type { SpawnSystem } from "./spawn";

export interface BossSystemDeps {
	def: BossData;
	/** `rounds.json` `boss` block. */
	rounds: RoundsData["boss"];
	spawn: SpawnSystem;
	events: EventBuffer;
	queue: DamageQueue;
	hero: number;
	/** Angle source for the entry position (the `combat` stream). */
	rng: { float(a: number, b: number): number };
	/** `EnemyType` index of the summoned enemy (the Carcaça). */
	summonType: number;
	/** Difficulty multiplier on HP and damage. */
	difficulty: () => number;
	/** `EnemyType` index of an enemy id from enemies.json (summon patterns). */
	enemyIndex?: ((id: string) => number) | undefined;
	/** Pool the boss's projectiles come from (chain shot); the pattern fires nothing without it. */
	shots?: EnemyShotPool | undefined;
	/** Hero slow and push effects (mud pool, scream); patterns that need them are no-ops without it. */
	heroStatus?: Pick<HeroStatus, "slow" | "push"> | undefined;
	/** The kill was recorded: end the round, grant the free weapon upgrade, etc. */
	onDefeated: () => void;
}

export interface BossView {
	name: string;
	hp: number;
	maxHp: number;
	/** 0 before the summon, 1 after (the bar marks the 50% line). */
	phase: number;
}

export interface BossSystem {
	/** Creates the boss for `round` near the hero. Call when the boss round begins. */
	start(world: GameWorld, round: number): number;
	/** Runs the patterns and enrage; call after behaviorSystem so the pattern velocity wins. */
	run(world: GameWorld): void;
	/** Wire to the death system's `onDeath`. */
	handleDeath(world: GameWorld, enemy: number, x: number, z: number): void;
	readonly entity: number;
	view(): BossView | null;
}

/** HP of the boss at `round`: base at its own round, +35% per ten rounds after (GDD 12.1), times difficulty. */
export function bossMaxHp(
	def: BossData,
	rounds: RoundsData["boss"],
	round: number,
	difficulty: number,
): number {
	return def.hpBaseRound10 * (1 + (rounds.hpScalePerTenRounds * (round - def.round)) / 10) * difficulty;
}

/** Enrage multiplier for damage and speed: +15% per stack, cumulative. */
export const enrageMult = (rounds: RoundsData["boss"], stacks: number): number =>
	1 + rounds.enrageDamageSpeedBonus * stacks;

/**
 * Boss controller (GDD 12): spawns the boss, scales it, enrages it and dispatches the attack patterns listed in
 * its bosses.json entry to the handlers in bossPatterns.ts. Contact damage comes from the shared
 * behaviorSystem; this system overrides velocity while a pattern runs.
 */
export function createBossSystem(deps: BossSystemDeps): BossSystem {
	const { def, rounds, spawn, events, queue, hero, rng, summonType, difficulty, onDefeated, heroStatus } =
		deps;
	const patterns = buildPatterns(def.patterns);
	const steps = (seconds: number): number => Math.max(1, Math.round(seconds / STEP));
	const enrageSteps = steps(rounds.enrageEverySeconds);
	const cooldownSteps = steps(def.patternCooldownSeconds ?? 1);

	let entity = -1;
	let bossRound = def.round;
	let active: PatternHandler | null = null;
	let cooldown = 0;
	let baseContact = 0;
	let maxHp = 0;

	const ctx: PatternContext = {
		world: undefined as unknown as GameWorld,
		entity: -1,
		hero,
		dirX: 1,
		dirZ: 0,
		maxHp: 0,
		baseSpeed: 0,
		enrage: 1,
		spawn,
		events,
		queue,
		summonType,
		enemyIndex(id: string): number {
			// Without a lookup (unit tests) every minion is the boss's own base enemy.
			if (!deps.enemyIndex) return summonType;
			const index = deps.enemyIndex(id);
			if (index < 0) throw new RangeError(`boss pattern names unknown enemy "${id}"`);
			return index;
		},
		fireShot: (x, z, vx, vz, damage, lifeSteps, radius) => {
			deps.shots?.acquire(x, z, vx, vz, damage, lifeSteps, radius);
		},
		slowHero: (seconds, multiplier) => heroStatus?.slow(seconds, multiplier),
		pushHero: (dirX, dirZ, distance, seconds) => heroStatus?.push(dirX, dirZ, distance, seconds),
		aim(): number {
			const dx = (Position.x[hero] ?? 0) - (Position.x[entity] ?? 0);
			const dz = (Position.z[hero] ?? 0) - (Position.z[entity] ?? 0);
			const dist = Math.hypot(dx, dz);
			if (dist > 1e-6) {
				ctx.dirX = dx / dist;
				ctx.dirZ = dz / dist;
			}
			return dist;
		},
		stop(): void {
			Velocity.x[entity] = 0;
			Velocity.z[entity] = 0;
		},
		steps,
	};

	function applyEnrage(): void {
		ctx.enrage = enrageMult(rounds, Boss.enrageStacks[entity] ?? 0);
		Speed.value[entity] = ctx.baseSpeed * ctx.enrage;
		ContactDamage.value[entity] = baseContact * ctx.enrage;
	}

	/** Picks the pattern to start: the only one that can, or a draw among several (the draw is the only RNG use). */
	function choose(distance: number): { handler: PatternHandler; index: number } | null {
		const ready = patterns.flatMap((p, index) =>
			p.handler.start && p.handler.canStart?.(ctx, distance) !== false
				? [{ handler: p.handler, index }]
				: [],
		);
		if (ready.length === 0) return null;
		const pick =
			ready.length === 1 ? 0 : Math.min(ready.length - 1, Math.floor(rng.float(0, ready.length)));
		return ready[pick] ?? null;
	}

	function tickPattern(): void {
		if (active) {
			if (!active.update?.(ctx)) {
				active.end?.(ctx);
				active = null;
				cooldown = cooldownSteps;
			}
			return;
		}
		const dist = ctx.aim();
		if (cooldown > 0) {
			cooldown--;
			return;
		}
		const next = choose(dist);
		if (next) {
			active = next.handler;
			events.push(EventType.BossPattern, next.index, 0, 0, entity);
			next.handler.start?.(ctx);
		}
	}

	return {
		get entity(): number {
			return entity;
		},
		start(world: GameWorld, round: number): number {
			bossRound = round;
			maxHp = bossMaxHp(def, rounds, round, difficulty());
			const angle = rng.float(0, Math.PI * 2);
			const x = (Position.x[hero] ?? 0) + Math.cos(angle) * 12;
			const z = (Position.z[hero] ?? 0) + Math.sin(angle) * 12;
			entity = spawn.spawnEnemy(world, summonType, x, z);
			addComponent(world, entity, Boss);
			// 1-based index in bosses.json: the render picks the model and telegraphs from it (0 means no boss).
			Boss.id[entity] = Math.max(1, bossesData.findIndex((b) => b.id === def.id) + 1);
			Health.hp[entity] = Health.max[entity] = maxHp;
			Radius.r[entity] = def.radius ?? 1.2;
			ctx.entity = entity;
			ctx.maxHp = maxHp;
			ctx.baseSpeed = def.speed ?? 2.4;
			baseContact =
				(rounds.contactDamageBase + rounds.contactDamagePerRound * bossRound) * difficulty();
			applyEnrage();
			active = null;
			cooldown = cooldownSteps;
			ctx.dirX = 1;
			ctx.dirZ = 0;
			return entity;
		},
		run(world: GameWorld): void {
			if (entity < 0 || (Health.hp[entity] ?? 0) <= 0) return;

			const ticks = (Boss.enrageTimer[entity] ?? 0) + 1;
			if (ticks >= enrageSteps) {
				Boss.enrageTimer[entity] = 0;
				Boss.enrageStacks[entity] = (Boss.enrageStacks[entity] ?? 0) + 1;
				applyEnrage();
				events.push(EventType.BossEnraged, Boss.enrageStacks[entity] ?? 0, 0, 0, entity);
			} else {
				Boss.enrageTimer[entity] = ticks;
			}

			ctx.world = world;
			for (const p of patterns) p.handler.tick?.(ctx);
			tickPattern();
		},
		handleDeath(world: GameWorld, e: number, x: number, z: number): void {
			if (e !== entity) return;
			entity = -1;
			events.push(EventType.BossDied, x, z, 0, e);
			const chest = rounds.rewardChest;
			dropChest(world, x, z, chest.minTier, chest.offered, chest.picks);
			events.push(EventType.ChestDropped, x, z, 0, 0);
			onDefeated();
		},
		view(): BossView | null {
			if (entity < 0) return null;
			return {
				name: def.name,
				hp: Math.max(0, Math.ceil(Health.hp[entity] ?? 0)),
				maxHp: Math.ceil(maxHp),
				phase: Boss.phase[entity] ?? 0,
			};
		},
	};
}

export interface BossRoster extends BossSystem {
	/** The boss definition that fights in `round`: the latest implemented one at or before it. */
	defFor(round: number): BossData;
}

/**
 * Picks the boss of a round from the definitions whose patterns are all implemented (A-03-01 onward: a boss in
 * bosses.json without its handlers yet is skipped, not a crash). Rounds past the last boss repeat it; the scaled
 * repeats and the shuffle come with A-03-03.
 */
export function createBossRoster(base: Omit<BossSystemDeps, "def">, defs: readonly BossData[]): BossRoster {
	const playable = defs
		.filter((def) => def.patterns.every((p) => hasPattern(p.id)))
		.sort((a, b) => a.round - b.round);
	const first = playable[0];
	if (!first) throw new RangeError("no boss with implemented patterns");
	const systems = new Map(playable.map((def) => [def.id, createBossSystem({ ...base, def })]));
	let current: BossSystem | null = null;

	const defFor = (round: number): BossData => playable.filter((def) => def.round <= round).at(-1) ?? first;

	return {
		defFor,
		start(world, round): number {
			current = systems.get(defFor(round).id) ?? null;
			return current?.start(world, round) ?? -1;
		},
		run: (world) => current?.run(world),
		handleDeath: (world, enemy, x, z) => current?.handleDeath(world, enemy, x, z),
		get entity(): number {
			return current?.entity ?? -1;
		},
		view: () => current?.view() ?? null,
	};
}
