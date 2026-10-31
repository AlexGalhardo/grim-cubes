import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { elitesData, enemiesData, heroData, itemsData, roundsData, toEnemyDefs } from "../data";
import { dropChest } from "../ecs/chest";
import { Armor, Chest, Elite, EnemyFaction, Health, Position, Radius, Speed } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createPlayerStats } from "../rules/stats";
import { createChestSystem } from "./chest";
import { createDamageSystem } from "./damage";
import { createEliteSystem } from "./elite";
import { createDeathSystem } from "./loot";
import type { RunSystem } from "./round";
import { createRunSystem } from "./round";
import { createSpawnSystem } from "./spawn";
import { createStatsSystem } from "./stats";

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
	const elite = createEliteSystem({
		config: elitesData,
		spawn,
		events,
		queue: damage.queue,
		rng: alwaysElite ? { ...rng, chance: () => true, float: rng.float, int: rng.int } : rng,
		pool: () => [{ type: 0, weight: 1 }],
		ring: { min: roundsData.spawn.ringMin, max: roundsData.spawn.ringMax },
		hero,
	});
	return { world, hero, events, damage, spawn, elite };
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

test("a dead elite drops a legendary chest and the explosive one hurts the hero in range", () => {
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
	const chest = [...query(world, [Chest])];
	expect(chest).toHaveLength(1);
	expect(Chest.tier[chest[0] as number]).toBe(4);
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

test("opening a chest heals 25 HP, pauses the run and offers 2 distinct tier 4 items", () => {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	Health.hp[hero] = 50;
	Health.max[hero] = 100;
	const run = {
		state: "Round",
		pause: () => {
			run.state = "Paused";
		},
		resume: () => {
			run.state = "Round";
		},
	};
	const stats = createStatsSystem(heroData, createPlayerStats());
	const owned = new Map<string, number>();
	let taken = 0;
	const chest = createChestSystem({
		reward: elitesData.reward,
		items: itemsData,
		rng: mulberry32(8),
		run: run as unknown as RunSystem,
		stats,
		owned,
		onItemTaken: () => taken++,
		events: createEventBuffer(8),
		blocked: () => false,
		pickupRadius: () => 2.5,
	});
	// Out of reach first, then in reach.
	dropChest(world, 10, 0, 4, 2, 1);
	chest.run(world, hero);
	expect(chest.offer).toBeNull();
	dropChest(world, 1, 0, 4, 2, 1, true);
	chest.run(world, hero);
	expect(run.state).toBe("Paused");
	expect(chest.offer).toHaveLength(2);
	const [a, b] = chest.offer ?? [];
	expect(a?.id).not.toBe(b?.id);
	expect(a?.tier).toBe(4);
	expect(b?.tier).toBe(4);
	expect(Health.hp[hero]).toBe(75);
	expect(chest.choose(5)).toBe(false);
	expect(chest.choose(0)).toBe(true);
	expect(run.state).toBe("Round");
	expect(owned.get(a?.id ?? "")).toBe(1);
	expect(taken).toBe(1);
});

test("an elite still alive at round end is reported as escaped and no chest drops", () => {
	const { world, hero, elite, events } = setup();
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
	expect(query(world, [Chest])).toHaveLength(0);
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

test("chest offers never include items whose effect is not implemented", () => {
	const alpha = new Set(itemsData.filter((i) => i.status === "alpha").map((i) => i.id));
	for (let seed = 1; seed <= 200; seed++) {
		const world = createGameWorld();
		const hero = spawnBody(world, 0, 0);
		Health.hp[hero] = Health.max[hero] = 100;
		const run = { state: "Round", pause: () => {}, resume: () => {} };
		const chest = createChestSystem({
			reward: elitesData.reward,
			items: itemsData,
			rng: mulberry32(seed),
			run: run as unknown as RunSystem,
			stats: createStatsSystem(heroData, createPlayerStats()),
			owned: new Map(),
			onItemTaken: () => {},
			events: createEventBuffer(8),
			blocked: () => false,
			pickupRadius: () => 2.5,
		});
		dropChest(world, 1, 0, 4, 2, 1);
		chest.run(world, hero);
		for (const offer of chest.offer ?? []) expect(alpha.has(offer.id)).toBe(false);
	}
});

test("a chest that does not heal (the boss chest) leaves the HP alone", () => {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	Health.hp[hero] = 50;
	Health.max[hero] = 100;
	const run = { state: "Round", pause: () => undefined, resume: () => undefined };
	const chest = createChestSystem({
		reward: elitesData.reward,
		items: itemsData,
		rng: mulberry32(8),
		run: run as unknown as RunSystem,
		stats: createStatsSystem(heroData, createPlayerStats()),
		owned: new Map<string, number>(),
		onItemTaken: () => undefined,
		events: createEventBuffer(8),
		blocked: () => false,
		pickupRadius: () => 2.5,
	});
	dropChest(world, 1, 0, 4, 3, 2);
	chest.run(world, hero);
	expect(chest.offer).toHaveLength(3);
	expect(Health.hp[hero]).toBe(50);
});
