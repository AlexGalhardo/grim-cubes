import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, enemiesData, roundsData, toEnemyDefs } from "../data";
import { ContactDamage, Health, Radius, Velocity } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { STEP } from "../loop";
import { createBossSystem } from "./boss";
import { buildPatterns, type PatternContext } from "./bossPatterns";
import type { DamageQueue } from "./damage";
import { createSpawnSystem, type SpawnSystem } from "./spawn";

/** Passive patterns (no hit of their own) and the one gated behind the second phase. */
const NOT_ATTACKS = new Set(["summon", "phase_armor", "thermal_vision", "eggs", "fly_bomb"]);
const attacksOf = (patterns: readonly { id: string }[]): number[] =>
	patterns.flatMap((pattern, index) => (NOT_ATTACKS.has(pattern.id) ? [] : [index]));
const husk = enemiesData.findIndex((e) => e.id === "husk");
const MIN_REACTION_SECONDS = 0.3;

/** Plays one attack alone against a hero standing still and returns when the warning and the first hit came. */
function playAttack(
	boss: (typeof bossesData)[number],
	index: number,
	telegraphMult: number,
): { warnedAt: number; hitAt: number } | null {
	const world = createGameWorld();
	const entity = spawnBody(world, 0, 0);
	const hero = spawnBody(world, 0, 0);
	for (const e of [entity, hero]) {
		addComponent(world, e, Velocity);
		addComponent(world, e, Radius);
		addComponent(world, e, Health);
	}
	addComponent(world, entity, ContactDamage);
	ContactDamage.value[entity] = 10;
	Radius.r[entity] = boss.radius ?? 1;
	Radius.r[hero] = 0.45;
	Health.hp[entity] = Health.max[entity] = 1000;
	Health.hp[hero] = Health.max[hero] = 1000;
	const events = createEventBuffer(256);
	let step = 0;
	let hitAt = -1;
	let warnedAt = -1;
	const queue = {
		push: () => {
			if (hitAt < 0) hitAt = step;
			return true;
		},
	} as unknown as DamageQueue;
	const spawn = { spawnEnemy: () => 0, hasRoom: () => true } as unknown as SpawnSystem;
	const ctx: PatternContext = {
		world,
		entity,
		hero,
		dirX: 1,
		dirZ: 0,
		maxHp: 1000,
		baseSpeed: boss.speed ?? 2,
		enrage: 1,
		spawn,
		events,
		queue,
		summonType: husk,
		enemyIndex: () => husk,
		// A slow or a shove is a hit too (the mud pool does no damage).
		slowHero: () => {
			if (hitAt < 0) hitAt = step;
		},
		fireShot: () => {
			if (hitAt < 0) hitAt = step;
		},
		pushHero: () => {
			if (hitAt < 0) hitAt = step;
		},
		aim: () => 1,
		stop: () => undefined,
		steps: (seconds) => Math.max(1, Math.round(seconds / STEP)),
	};
	const pattern = boss.patterns[index];
	if (!pattern) return null;
	const handler = buildPatterns([pattern], telegraphMult)[0]?.handler;
	if (!handler?.start) return null;
	for (const distance of [1.5, 3, 4.5, 6, 9, 12]) {
		if (handler.canStart?.(ctx, distance) === false) continue;
		handler.start(ctx);
		for (step = 0; step < 2400; step++) {
			const running = handler.update?.(ctx) ?? false;
			handler.tick?.(ctx);
			// The charge hurts through the body (contact damage), not the queue: it starts hurting when it moves.
			if (pattern.id === "line_charge" && hitAt < 0 && (Velocity.x[entity] ?? 0) !== 0) hitAt = step;
			events.consume((type) => {
				if ((type === EventType.BossTelegraph || type === EventType.BossBomb) && warnedAt < 0)
					warnedAt = step;
			});
			if (!running && step > 0 && hitAt >= 0) break;
			if (!running && step > 600) break;
		}
		return hitAt < 0 ? null : { warnedAt: warnedAt < 0 ? Number.POSITIVE_INFINITY : warnedAt, hitAt };
	}
	return null;
}

test("every boss has five attacks, ten bosses in all", () => {
	expect(bossesData).toHaveLength(10);
	for (const boss of bossesData) expect(attacksOf(boss.patterns), boss.id).toHaveLength(5);
});

test("every attack of every boss warns on the ground before it hurts, with time to react on every difficulty", () => {
	for (const boss of bossesData) {
		for (const index of attacksOf(boss.patterns)) {
			for (const { telegraphMult } of roundsData.difficulties) {
				const played = playAttack(boss, index, telegraphMult);
				const label = `${boss.id} ${boss.patterns[index]?.id} x${telegraphMult}`;
				// Stealth and the charges move the boss around the origin: a hit can only come after the warning.
				expect(played, label).not.toBeNull();
				if (!played) continue;
				expect(played.warnedAt, label).toBeLessThanOrEqual(played.hitAt);
				expect((played.hitAt - played.warnedAt) * STEP, label).toBeGreaterThanOrEqual(
					MIN_REACTION_SECONDS - 1e-6,
				);
			}
		}
	}
});

test("the warning time follows the difficulty: longer on Easy, shorter on Nightmare", () => {
	const gap = (mult: number): number => {
		const played = playAttack(bossesData[0] as (typeof bossesData)[number], 0, mult);
		return played ? played.hitAt - played.warnedAt : 0;
	};
	expect(gap(1.25)).toBeGreaterThan(gap(1));
	expect(gap(1)).toBeGreaterThan(gap(0.7));
});

function fight(seed: number, steps: number): number[] {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	for (const c of [Velocity, Radius, Health]) addComponent(world, hero, c);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = Health.max[hero] = 1e9;
	const events = createEventBuffer(1024);
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: mulberry32(3),
	});
	spawn.startRound(10, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	const def = bossesData[0] as (typeof bossesData)[number];
	const queue = { push: () => true } as unknown as DamageQueue;
	const boss = createBossSystem({
		def,
		rounds: roundsData.boss,
		spawn,
		events,
		queue,
		hero,
		rng: mulberry32(seed),
		summonType: husk,
		difficulty: () => 1,
		onDefeated: () => undefined,
	});
	boss.start(world, 10);
	const started: number[] = [];
	for (let i = 0; i < steps; i++) {
		boss.run(world);
		events.consume((type, a) => {
			if (type === EventType.BossPattern) started.push(a);
		});
	}
	return started;
}

test("the attack drawn is fixed by the seed and varies with it", () => {
	const a = fight(7, 6000);
	expect(fight(7, 6000)).toEqual(a);
	expect(new Set(a).size).toBeGreaterThan(1);
	expect(fight(8, 6000)).not.toEqual(a);
});
