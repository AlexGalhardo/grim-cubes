import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { elitesData, enemiesData, roundsData, toEnemyDefs } from "../data";
import { Armor, Elite, EnemyFaction, Health, Position, Radius, Speed } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createDamageSystem } from "./damage";
import { createEliteSystem } from "./elite";
import { createDeathSystem, createProgress } from "./loot";
import { createMaterials } from "./materials";
import { createRunSystem } from "./round";
import { createSpawnSystem } from "./spawn";

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

function setup(alwaysElite = true) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, Radius);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = 50;
	Health.max[hero] = 100;
	const events = createEventBuffer(256);
	const rng = mulberry32(5);
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
	spawn.startRound(10, { pool: [{ type: 0, weight: 1 }], difficultyMult: 1 });
	const progress = createProgress();
	const elite = createEliteSystem({
		config: elitesData,
		spawn,
		events,
		queue: damage.queue,
		rng: alwaysElite ? { ...rng, chance: () => true, float: rng.float, int: rng.int } : rng,
		pool: () => [{ type: 0, weight: 1 }],
		ring: { min: roundsData.spawn.ringMin, max: roundsData.spawn.ringMax },
		hero,
		materials: createMaterials(progress, events),
	});
	return { world, hero, events, damage, spawn, elite, progress };
}

test("an elite enters 10 s after the round starts with the modifier numbers applied", () => {
	const { world, elite, hero, events } = setup();
	elite.onRoundStart(5, false);
	expect(elite.pending).toBe(true);
	for (let i = 0; i < 599; i++) elite.run(world);
	expect(query(world, [Elite]).length).toBe(0);
	elite.run(world);
	const [e] = [...query(world, [Elite])];
	expect(e).toBeDefined();
	const modifier = elitesData.modifiers[(Elite.modifier[e as number] ?? 1) - 1];
	const def = enemiesData[0];
	expect(Health.max[e as number]).toBeCloseTo(
		((def?.hpBase ?? 0) + 9 * (def?.hpPerRound ?? 0)) * (modifier?.hpMult ?? 1),
	);
	expect(Radius.r[e as number]).toBeCloseTo((def?.radius ?? 0) * 1.6);
	expect(Math.hypot(Position.x[e as number] ?? 0, Position.z[hero] ?? 0)).toBeGreaterThan(0);
	if (modifier?.armorAdd) expect(Armor.value[e as number]).toBeGreaterThanOrEqual(modifier.armorAdd);
	let incoming = 0;
	let spawned = 0;
	events.consume((type) => {
		if (type === EventType.EliteIncoming) incoming++;
		if (type === EventType.EliteSpawned) spawned++;
	});
	expect([incoming, spawned]).toEqual([1, 1]);
});

test("each modifier scales HP, speed and armor as the data says", () => {
	for (const [index, modifier] of elitesData.modifiers.entries()) {
		const { world, elite } = setup();
		elite.onRoundStart(5, false);
		const plainHp = (enemiesData[0]?.hpBase ?? 0) + 9 * (enemiesData[0]?.hpPerRound ?? 0);
		const e = elite.spawnNow(world, 5, 5, index);
		expect(Health.max[e]).toBeCloseTo(plainHp * modifier.hpMult);
		expect(Speed.value[e]).toBeCloseTo((enemiesData[0]?.speed ?? 0) * (modifier.speedMult ?? 1));
		expect(Armor.value[e]).toBe(modifier.armorAdd ?? 0);
		expect(Elite.modifier[e]).toBe(index + 1);
	}
});

test("no elite is armed when the roll fails or on a boss round", () => {
	const { elite } = setup(false);
	elite.onRoundStart(1, false);
	expect(elite.pending).toBe(false);
	const forced = setup(true);
	forced.elite.onRoundStart(10, true);
	expect(forced.elite.pending).toBe(false);
});

test("every dead elite drops exactly one fragment, heals the hero and tells the render", () => {
	for (const [index, modifier] of elitesData.modifiers.entries()) {
		const { world, hero, elite, damage, events, progress } = setup();
		elite.onRoundStart(5, false);
		const e = elite.spawnNow(world, 30, 0, index);
		Health.hp[hero] = 50;
		const death = createDeathSystem({
			fragments: roundsData.fragments,
			fragmentsPerType: [0],
			rng: mulberry32(1),
			round: () => 5,
			onDeath: (w, id, x, z) => elite.handleDeath(w, id, x, z),
		});
		Health.hp[e] = 0;
		death.run(world);
		damage.run(world);
		expect(progress.eliteFragments, modifier.id).toBe(elitesData.reward.fragments);
		expect(progress.eliteFragments).toBe(1);
		expect(Health.hp[hero], modifier.id).toBe(50 + elitesData.reward.healHp);
		const dropped: number[] = [];
		events.consume((type, a, b, c) => {
			if (type === EventType.MaterialDropped) dropped.push(a, b, c);
		});
		expect(dropped).toEqual([30, 0, 1]);
	}
});

test("the explosive elite hurts the hero in range when it dies", () => {
	const { world, hero, elite, damage } = setup();
	elite.onRoundStart(5, false);
	const boom = elitesData.modifiers.findIndex((m) => m.onDeathExplosion);
	const e = elite.spawnNow(world, 1, 0, boom);
	Health.hp[hero] = 100;
	const death = createDeathSystem({
		fragments: roundsData.fragments,
		fragmentsPerType: [0],
		rng: mulberry32(1),
		round: () => 5,
		onDeath: (w, id, x, z) => elite.handleDeath(w, id, x, z),
	});
	Health.hp[e] = 0;
	death.run(world);
	damage.run(world);
	expect(100 - (Health.hp[hero] ?? 0)).toBeCloseTo(15 + 2 * 5, 3);
});

test("a vampiric elite heals for 10% of what it deals", () => {
	const { world, elite } = setup();
	elite.onRoundStart(5, false);
	const vamp = elitesData.modifiers.findIndex((m) => m.lifestealOfDamage);
	const e = elite.spawnNow(world, 3, 0, vamp);
	Health.hp[e] = 10;
	elite.handleHeroHit(e, 20);
	expect(Health.hp[e]).toBeCloseTo(12);
	void EnemyFaction;
});

test("an elite still alive at round end is reported as escaped and drops nothing", () => {
	const { world, hero, elite, events, progress } = setup();
	elite.onRoundStart(5, false);
	const e = elite.spawnNow(world, 6, 0, 0);
	void hero;
	const run = createRunSystem({
		config: { flow: roundsData.flow, duration: roundsData.duration, boss: roundsData.boss },
		spawn: setupSpawn(),
		events,
		poolFor: () => [{ type: 0, weight: 1 }],
		difficultyMult: 1,
	});
	run.newRun();
	for (let i = 0; i < 400 && run.state !== "Round"; i++) run.run(world, 1);
	run.forceEnd(world);
	let escaped = 0;
	events.consume((type, _a, _b, _c, entity) => {
		if (type === EventType.EliteEscaped && entity === e) escaped++;
	});
	expect(escaped).toBe(1);
	expect(progress.eliteFragments).toBe(0);
});

function setupSpawn() {
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: mulberry32(9),
	});
	spawn.startRound(5, { pool: [{ type: 0, weight: 1 }], difficultyMult: 1 });
	return spawn;
}
