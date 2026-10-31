import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent, hasComponent } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, enemiesData, heroData, roundsData, toEnemyDefs } from "../data";
import type { BossData } from "../data/types";
import {
	Boss,
	Egg,
	EnemyType,
	Health,
	IgnoresProps,
	Position,
	Radius,
	Stealth,
	Velocity,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { computeStats, createPlayerStats } from "../rules/stats";
import { bossMaxHp, createBossSystem } from "./boss";
import { createDamageSystem } from "./damage";
import { movementSystem } from "./movement";
import { createSpawnSystem } from "./spawn";
import { createTargetingSystem } from "./targeting";

const ids = enemiesData.map((e) => e.id);
const husk = ids.indexOf("husk");
const hunter = ids.indexOf("hunter");

function find(id: string): BossData {
	const def = bossesData.find((b) => b.id === id);
	if (!def) throw new Error(`${id} is not in bosses.json`);
	return def;
}

/** A boss with only the listed pattern ids, so a test can force the pattern it checks. */
function only(id: string, ...patternIds: string[]): BossData {
	const def = find(id);
	return { ...def, patterns: def.patterns.filter((p) => patternIds.includes(p.id)) };
}

interface Seen {
	type: number;
	a: number;
	b: number;
	c: number;
	entity: number;
}

function setup(def: BossData, round: number, heroX = 0) {
	const world = createGameWorld();
	const hero = spawnBody(world, heroX, 0);
	addComponent(world, hero, Radius);
	addComponent(world, hero, Velocity);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = Health.max[hero] = 1e6;
	const events = createEventBuffer(1024);
	const stats = createPlayerStats();
	computeStats(heroData, [], stats);
	const damage = createDamageSystem({
		config: {
			armorConstant: 6.66,
			dodgeCap: 0.6,
			lifeStealHpPerSecond: 10,
			lifeStealTriggerSeconds: 0.1,
			iFramesOnHitSeconds: 0.3,
			knockbackDurationSeconds: 0.1,
			bossKnockbackMult: 0.1,
			eliteKnockbackMult: 0.5,
		},
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events,
		hero,
		stats,
	});
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: mulberry32(3),
	});
	spawn.startRound(round, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	const boss = createBossSystem({
		def,
		rounds: roundsData.boss,
		spawn,
		events,
		queue: damage.queue,
		hero,
		rng: mulberry32(4),
		summonType: husk,
		enemyIndex: (id) => ids.indexOf(id),
		difficulty: () => 1,
		onDefeated: () => undefined,
	});
	const seen: Seen[] = [];
	const e = boss.start(world, round);
	Position.x[e] = 0;
	Position.z[e] = 0;
	const step = (): void => {
		boss.run(world);
		movementSystem(world);
		damage.run(world);
		events.consume((type, a, b, c, entity) => seen.push({ type, a, b, c, entity }));
	};
	const count = (type: number): number => seen.filter((s) => s.type === type).length;
	const first = (type: number): Seen | undefined => seen.find((s) => s.type === type);
	return { world, hero, boss, e, spawn, step, seen, count, first, events };
}

/** Runs until `done()` or `seconds` pass; returns the step it stopped on (-1 on timeout). */
function runUntil(step: () => void, done: () => boolean, seconds = 20): number {
	for (let i = 0; i < seconds * 60; i++) {
		step();
		if (done()) return i;
	}
	return -1;
}

test("the Alpha Hunter has its data HP in round 40", () => {
	const def = find("alpha_hunter");
	expect(bossMaxHp(def, roundsData.boss, 40, 1)).toBe(def.hpBaseRound10);
	const { e } = setup(def, 40);
	expect(Health.max[e]).toBe(def.hpBaseRound10);
	expect(Boss.id[e]).toBe(4);
});

test("stealth: the boss vanishes for 3 s, weapons cannot target it, then it shows itself and strikes from behind", () => {
	const { world, hero, e, step, count, first, seen } = setup(only("alpha_hunter", "stealth"), 40, 10);
	const hash = createSpatialHash();
	const targeting = createTargetingSystem({ priorityDistanceMult: 0.8, retargetEvery: 1 }, hash);
	// The hero walks toward +x, so "behind" is on its -x side.
	Velocity.x[hero] = 3;
	const begun = runUntil(step, () => count(EventType.BossStealth) > 0);
	expect(begun).toBeGreaterThanOrEqual(0);
	expect(first(EventType.BossStealth)).toMatchObject({ a: 1, c: 3, entity: e });
	expect(first(EventType.BossStealth)?.b).toBeCloseTo(0.15);
	expect(hasComponent(world, e, Stealth)).toBe(true);
	expect(Stealth.alpha[e]).toBeCloseTo(0.15);

	hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
	targeting.run(world, hero, 50);
	expect(targeting.target).toBe(-1);

	const hpBefore = Health.hp[hero] ?? 0;
	const revealed = runUntil(step, () => count(EventType.BossStealth) === 2);
	expect(revealed / 60).toBeCloseTo(3, 0);
	expect(first(EventType.BossStealth)).toBeDefined();
	expect(seen.filter((s) => s.type === EventType.BossStealth)[1]).toMatchObject({ a: 0, entity: e });
	expect(hasComponent(world, e, Stealth)).toBe(false);
	// Coming out of stealth, the boss sits behind the hero's heading (smaller x than the hero).
	expect(Position.x[e] ?? 0).toBeLessThan(Position.x[hero] ?? 0);

	hash.clear();
	hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
	targeting.run(world, hero, 50);
	expect(targeting.target).toBe(e);

	Velocity.x[hero] = 0;
	const struck = runUntil(step, () => count(EventType.BossShockwave) > 0);
	expect(struck).toBeGreaterThanOrEqual(0);
	expect(Health.hp[hero]).toBeLessThan(hpBefore);
});

test("leap: telegraphed on the hero's spot, flies there in the air time and lands with an area hit", () => {
	const { hero, e, step, count, first } = setup(only("alpha_hunter", "leap"), 40, 10);
	const landing = { x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 };
	const telegraph = runUntil(step, () => count(EventType.BossTelegraph) > 0);
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect(first(EventType.BossTelegraph)).toMatchObject({ a: landing.x, b: landing.z, entity: e });
	expect(first(EventType.BossTelegraph)?.c).toBeCloseTo(0.8);
	// The hero steps out of the way after the telegraph; the boss still lands on the marked spot.
	Position.x[hero] = 30;
	const took = runUntil(step, () => count(EventType.BossLeap) > 0);
	expect(took).toBeGreaterThanOrEqual(0);
	expect(first(EventType.BossLeap)).toMatchObject({ a: landing.x, b: landing.z, entity: e });
	expect(first(EventType.BossLeap)?.c).toBeCloseTo(0.5);
	const landed = runUntil(step, () => count(EventType.BossShockwave) > 0);
	expect(landed / 60).toBeCloseTo(0.5, 0);
	expect(Position.x[e]).toBeCloseTo(landing.x, 0);
	expect(first(EventType.BossShockwave)).toMatchObject({ a: landing.x, c: 3.5 });
});

test("leap: a hero still on the spot is hurt by the landing", () => {
	const { hero, step, count } = setup(only("alpha_hunter", "leap"), 40, 10);
	const before = Health.hp[hero] ?? 0;
	runUntil(step, () => count(EventType.BossShockwave) > 0);
	expect(Health.hp[hero]).toBeLessThan(before);
});

test("thermal vision: the boss walks through props", () => {
	const { world, e, step } = setup(only("alpha_hunter", "thermal_vision"), 40);
	expect(hasComponent(world, e, IgnoresProps)).toBe(false);
	step();
	expect(hasComponent(world, e, IgnoresProps)).toBe(true);
});

test("the Nest Queen has its data HP in round 50", () => {
	const def = find("nest_queen");
	const { e } = setup(def, 50);
	expect(Health.max[e]).toBe(def.hpBaseRound10);
	expect(Boss.id[e]).toBe(5);
});

test("eggs: telegraphed, laid in a ring, broken eggs do not hatch and the rest become hunters after 6 s", () => {
	const { world, hero, e, spawn, step, count, first, seen } = setup(only("nest_queen", "eggs"), 50, 20);
	const telegraph = runUntil(step, () => count(EventType.BossTelegraph) > 0);
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect(first(EventType.BossTelegraph)?.c).toBeCloseTo(0.8);
	const laid = runUntil(step, () => count(EventType.BossEggLaid) === 3);
	expect(laid / 60).toBeCloseTo(0.8, 0);
	const eggs = seen.filter((s) => s.type === EventType.BossEggLaid);
	expect(eggs.every((egg) => Math.abs(egg.c - 6) < 1e-6 && hasComponent(world, egg.entity, Egg))).toBe(
		true,
	);
	for (const egg of eggs) {
		expect(Math.hypot(egg.a - (Position.x[e] ?? 0), egg.b - (Position.z[e] ?? 0))).toBeCloseTo(5);
		expect(Health.hp[egg.entity]).toBeCloseTo(find("nest_queen").hpBaseRound10 * 0.03, 0);
	}

	const victim = eggs[0]?.entity ?? -1;
	Health.hp[victim] = 0;
	step();
	expect(count(EventType.BossEggBroken)).toBe(1);
	expect(hasComponent(world, victim, Egg)).toBe(false);

	Position.x[hero] = 1000;
	const hatched = runUntil(step, () => count(EventType.BossEggHatched) === 2, 7);
	expect(hatched / 60).toBeCloseTo(6, 0);
	const born = seen.filter((s) => s.type === EventType.BossEggHatched).map((s) => s.c);
	expect(born).toHaveLength(2);
	for (const id of born) expect(EnemyType.id[id]).toBe(hunter);
	expect(spawn.hasRoom(world)).toBe(true);
});

test("eggs: a hatching waits while the enemy cap is full", () => {
	const { world, spawn, step, count } = setup(only("nest_queen", "eggs"), 50, 20);
	runUntil(step, () => count(EventType.BossEggLaid) === 3);
	spawn.setCap(1);
	const filler = spawn.spawnEnemy(world, husk, 400, 400);
	expect(spawn.hasRoom(world)).toBe(false);
	runUntil(step, () => count(EventType.BossEggHatched) > 0, 8);
	expect(count(EventType.BossEggHatched)).toBe(0);
	Health.hp[filler] = 0;
	spawn.setCap(100);
	runUntil(step, () => count(EventType.BossEggHatched) === 3, 2);
	expect(count(EventType.BossEggHatched)).toBe(3);
});

test("eggs: they take weapon hits and the boss's death clears the ones left", () => {
	const { world, e, boss, step, count, seen } = setup(only("nest_queen", "eggs"), 50, 20);
	runUntil(step, () => count(EventType.BossEggLaid) === 3);
	const hash = createSpatialHash();
	boss.insertInto(hash);
	expect(hash.count).toBe(3);
	const targeting = createTargetingSystem({ priorityDistanceMult: 0.8, retargetEvery: 1 }, hash);
	targeting.run(world, 0, 50);
	const eggs = seen.filter((s) => s.type === EventType.BossEggLaid).map((s) => s.entity);
	expect(eggs).toContain(targeting.target);
	boss.handleDeath(world, e, 0, 0);
	for (const egg of eggs) expect(hasComponent(world, egg, Egg)).toBe(false);
});

test("sweep: telegraphed, then hurts a hero inside the arc and spares one behind the boss", () => {
	const front = setup(only("nest_queen", "sweep"), 50, 3);
	const telegraph = runUntil(front.step, () => front.count(EventType.BossTelegraph) > 0);
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect(front.first(EventType.BossTelegraph)?.c).toBeCloseTo(0.9);
	const before = Health.hp[front.hero] ?? 0;
	const swept = runUntil(front.step, () => front.count(EventType.BossSweep) > 0);
	expect(swept / 60).toBeCloseTo(0.9, 0);
	expect(front.first(EventType.BossSweep)).toMatchObject({ a: 1, b: 0, c: 5 });
	expect(Health.hp[front.hero]).toBeLessThan(before);

	const behind = setup(only("nest_queen", "sweep"), 50, 3);
	// The boss faces +x on its first frames; the hero is moved behind it right after the telegraph begins.
	runUntil(behind.step, () => behind.count(EventType.BossTelegraph) > 0);
	Position.x[behind.hero] = -3;
	const kept = Health.hp[behind.hero] ?? 0;
	runUntil(behind.step, () => behind.count(EventType.BossSweep) > 0);
	expect(Health.hp[behind.hero]).toBe(kept);
});

test("fly_bomb: at half HP the queen takes off, then drops a salvo that explodes after the delay", () => {
	const { world, hero, e, step, count, first, seen } = setup(find("nest_queen"), 50, 30);
	expect(hasComponent(world, e, IgnoresProps)).toBe(false);
	Health.hp[e] = find("nest_queen").hpBaseRound10 * 0.49;
	step();
	expect(Boss.phase[e]).toBe(1);
	expect(hasComponent(world, e, IgnoresProps)).toBe(true);
	expect(first(EventType.BossPhase)).toMatchObject({ a: 2, entity: e });

	const bombs = runUntil(step, () => count(EventType.BossBomb) === 4, 30);
	expect(bombs).toBeGreaterThanOrEqual(0);
	const marks = seen.filter((s) => s.type === EventType.BossBomb);
	expect(marks[0]).toMatchObject({ a: Position.x[hero], b: Position.z[hero], entity: e });
	expect(marks[0]?.c).toBeCloseTo(1.2);
	const before = Health.hp[hero] ?? 0;
	const boomed = runUntil(step, () => count(EventType.Exploded) > 0, 3);
	expect(boomed / 60).toBeCloseTo(1.2, 0);
	expect(first(EventType.Exploded)?.c).toBe(2.5);
	expect(Health.hp[hero]).toBeLessThan(before);
	runUntil(step, () => count(EventType.Exploded) === 4, 3);
	expect(count(EventType.Exploded)).toBe(4);
});
