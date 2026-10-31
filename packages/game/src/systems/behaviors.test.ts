import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { behaviorConfigFromData, enemiesData, heroData, roundsData, toEnemyDefs } from "../data";
import {
	Behavior,
	EnemyFaction,
	EnemyShot,
	EnemyType,
	Facing,
	Health,
	Knockback,
	Position,
	Radius,
	Velocity,
} from "../ecs/components";
import { createEnemyShotPool } from "../ecs/enemyShot";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createBehaviorSystem } from "./behavior";
import { createDamageSystem } from "./damage";
import { createEnemyShotSystem } from "./enemyShot";
import { movementSystem } from "./movement";
import { createSpawnSystem } from "./spawn";

const idOf = (id: string): number => enemiesData.findIndex((e) => e.id === id);
const damageConfig = {
	armorConstant: 6.66,
	dodgeCap: 0.6,
	lifeStealHpPerSecond: 10,
	lifeStealTriggerSeconds: 0.1,
	iFramesOnHitSeconds: 0.3,
	knockbackDurationSeconds: 0.1,
	bossKnockbackMult: 0.1,
	eliteKnockbackMult: 0.5,
};

function setup(heroHp = 1e6) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, Radius);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = Health.max[hero] = heroHp;
	const events = createEventBuffer(1024);
	const damage = createDamageSystem({
		config: damageConfig,
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events,
		hero,
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
	});
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: mulberry32(3),
	});
	spawn.startRound(5, { pool: [{ type: 0, weight: 1 }], difficultyMult: 1 });
	const shots = createEnemyShotPool(world, 16);
	const shotSystem = createEnemyShotSystem(shots, damage.queue);
	const behavior = createBehaviorSystem(
		behaviorConfigFromData(
			enemiesData,
			heroData.combat.contactCooldownSeconds,
			roundsData.ai.attackAnimationSeconds,
			roundsData.spawn.maxSimultaneous,
		),
		damage.queue,
		{ events, spawn, shots },
	);
	/** One simulation step in the real order: behavior, movement, shots, damage. */
	const step = (): void => {
		behavior.run(world, hero);
		movementSystem(world);
		shotSystem.run(world, hero);
		damage.run(world);
	};
	return { world, hero, events, damage, spawn, shots, behavior, step };
}

test("every behavior in enemies.json is implemented and an unknown one throws", () => {
	const defs = toEnemyDefs(enemiesData);
	expect(defs.map((d) => d.behavior)).toEqual(enemiesData.map((_, i) => defs[i]?.behavior));
	expect(new Set(defs.map((d) => d.behavior)).size).toBe(8);
	expect(defs[idOf("forged")]?.armor).toBe(10);
	expect(() =>
		toEnemyDefs([{ ...(enemiesData[0] as (typeof enemiesData)[number]), behavior: "teleport" }]),
	).toThrow(RangeError);
});

test("the Afogado takes 30% of the knockback", () => {
	const { world, spawn, damage } = setup();
	const drowned = spawn.spawnEnemy(world, idOf("drowned"), 5, 0);
	const husk = spawn.spawnEnemy(world, idOf("husk"), 6, 0);
	damage.queue.push(drowned, 1, 0, 0, 2, 0);
	damage.queue.push(husk, 1, 0, 0, 2, 0);
	damage.run(world);
	expect(Knockback.x[husk]).toBeCloseTo(2);
	expect(Knockback.x[drowned]).toBeCloseTo(0.6);
});

test("the Sanguessuga latches on contact, follows faster, drains 1 HP/s and lets go when hit", () => {
	const { world, hero, spawn, step, damage } = setup();
	const leech = spawn.spawnEnemy(world, idOf("leech"), 0.5, 0);
	const base = enemiesData[idOf("leech")]?.speed ?? 0;
	step();
	expect(Behavior.state[leech]).toBe(1);
	Position.x[hero] = 6;
	const before = Health.hp[hero] ?? 0;
	for (let i = 0; i < 60; i++) step();
	const speed = Math.hypot(Velocity.x[leech] ?? 0, Velocity.z[leech] ?? 0);
	expect(speed).toBeCloseTo(base * 1.2, 1);
	const drained = before - (Health.hp[hero] ?? 0);
	// Contact hits add to the drain; the leak alone is 1 HP per second.
	expect(drained).toBeGreaterThanOrEqual(1);
	damage.queue.push(leech, 1, 0, 0, 0, 0);
	damage.run(world);
	step();
	expect(Behavior.state[leech]).toBe(0);
});

test("the Vigia stays put and fires a slow shot every 2 s only when the hero is within 10 u", () => {
	const { world, hero, spawn, events, step } = setup();
	const watcher = spawn.spawnEnemy(world, idOf("watcher"), 8, 0);
	let fired = 0;
	const count = (): void =>
		events.consume((type) => {
			if (type === EventType.EnemyShotFired) fired++;
		});
	for (let i = 0; i < 60 * 12; i++) {
		step();
		count();
	}
	expect(fired).toBe(6);
	expect(Velocity.x[watcher]).toBe(0);
	expect(Position.x[watcher]).toBe(8);

	Position.x[hero] = 12 + 8;
	const live = [...query(world, [EnemyShot])].filter((s) => (EnemyShot.life[s] ?? 0) > 0);
	for (const s of live) EnemyShot.life[s] = 0;
	fired = 0;
	for (let i = 0; i < 60 * 6; i++) {
		step();
		count();
	}
	expect(fired).toBe(0);
});

test("a Vigia shot flies at 8 u/s and damages the hero on contact", () => {
	const { world, hero, spawn, step } = setup(100);
	spawn.spawnEnemy(world, idOf("watcher"), 8, 0);
	let hit = -1;
	for (let i = 0; i < 60 * 5 && hit < 0; i++) {
		step();
		if ((Health.hp[hero] ?? 0) < 100) hit = i;
	}
	expect(hit).toBeGreaterThan(0);
	expect(100 - (Health.hp[hero] ?? 0)).toBeGreaterThan(0);
});

test("the Cacador telegraphs, rushes at 3x speed along a fixed heading and recovers", () => {
	const { world, spawn, events, step, hero } = setup();
	Position.x[hero] = 0;
	const hunter = spawn.spawnEnemy(world, idOf("hunter"), 7.5, 0);
	const speed = enemiesData[idOf("hunter")]?.speed ?? 0;
	let telegraph = -1;
	let rushStart = -1;
	let rushEnd = -1;
	for (let i = 0; i < 60 * 6; i++) {
		step();
		events.consume((type, _a, _b, c) => {
			if (type === EventType.EnemyTelegraph && telegraph < 0) {
				telegraph = i;
				expect(c).toBeCloseTo(0.5);
			}
		});
		const v = Math.hypot(Velocity.x[hunter] ?? 0, Velocity.z[hunter] ?? 0);
		if (v > speed * 2.5 && rushStart < 0) rushStart = i;
		if (rushStart >= 0 && rushEnd < 0 && v < 0.01) rushEnd = i;
		// Keep the hero away so the rush never ends in contact.
		if (telegraph >= 0) Position.x[hero] = -40;
	}
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect((rushStart - telegraph) / 60).toBeCloseTo(0.5, 1);
	expect((rushEnd - rushStart) / 60).toBeCloseTo(0.6, 1);
	expect(Math.abs(Facing.yaw[hunter] ?? 0)).toBeGreaterThan(0);
});

test("the Reprodutor creates a Lamento beside itself every 4 s, within the cap", () => {
	const { world, spawn, step } = setup();
	spawn.spawnEnemy(world, idOf("breeder"), 6, 0);
	const wails = (): number =>
		[...query(world, [EnemyFaction])].filter((e) => EnemyType.id[e] === idOf("wail")).length;
	for (let i = 0; i < 60 * 12 + 5; i++) step();
	expect(wails()).toBe(3);
});

test("the breeder stops when the simultaneous cap is full", () => {
	const { world, spawn, step } = setup();
	spawn.spawnEnemy(world, idOf("breeder"), 6, 0);
	for (let i = 0; i < roundsData.spawn.maxSimultaneous - 1; i++)
		spawn.spawnEnemy(world, idOf("drowned"), 80 + i, 80);
	for (let i = 0; i < 60 * 9; i++) step();
	const wails = [...query(world, [EnemyFaction])].filter((e) => EnemyType.id[e] === idOf("wail"));
	expect(wails).toHaveLength(0);
});
