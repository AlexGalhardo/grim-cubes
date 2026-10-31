import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, enemiesData, heroData, roundsData, toEnemyDefs } from "../data";
import { Boss, EnemyFaction, EnemyType, Health, Position, Radius, Velocity } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { computeStats, createPlayerStats } from "../rules/stats";
import { bossMaxHp, createBossRoster, createBossSystem } from "./boss";
import { createDamageSystem } from "./damage";
import { createHeroStatus } from "./heroStatus";
import { movementSystem } from "./movement";
import { createSpawnSystem } from "./spawn";

const def = bossesData.find((b) => b.id === "swamp_matriarch");
if (!def) throw new Error("the Matriarch is not in bosses.json");
const ids = enemiesData.map((e) => e.id);
const husk = ids.indexOf("husk");
const leech = ids.indexOf("leech");

function setup(heroX = 0) {
	const world = createGameWorld();
	const hero = spawnBody(world, heroX, 0);
	addComponent(world, hero, Radius);
	addComponent(world, hero, Velocity);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = Health.max[hero] = 1e6;
	const events = createEventBuffer(512);
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
	spawn.startRound(20, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	const heroStatus = createHeroStatus();
	const boss = createBossSystem({
		def: def as NonNullable<typeof def>,
		rounds: roundsData.boss,
		spawn,
		events,
		queue: damage.queue,
		hero,
		rng: mulberry32(4),
		summonType: husk,
		enemyIndex: (id) => ids.indexOf(id),
		heroStatus,
		difficulty: () => 1,
		onDefeated: () => undefined,
	});
	const step = (): void => {
		boss.run(world);
		heroStatus.run(hero);
		movementSystem(world);
		damage.run(world);
	};
	return { world, hero, events, damage, spawn, boss, heroStatus, step };
}

test("the Matriarch has 2,800 HP in round 20 and 3,780 in round 30", () => {
	expect(bossMaxHp(def, roundsData.boss, 20, 1)).toBe(2800);
	expect(bossMaxHp(def, roundsData.boss, 30, 1)).toBeCloseTo(2800 * 1.35);
	const { world, boss } = setup();
	const e = boss.start(world, 20);
	expect(Health.max[e]).toBe(2800);
	expect(Boss.id[e]).toBe(1);
});

test("every 8 s she calls 3 Leeches around her, regardless of what else she is doing", () => {
	const { world, boss, step, events } = setup(60);
	boss.start(world, 20);
	let summons = 0;
	let leeches = 0;
	for (let i = 0; i < 60 * 25; i++) {
		step();
		events.consume((type, _a, _b, c) => {
			if (type === EventType.BossSummon) {
				summons++;
				expect(c).toBe(3);
			}
		});
	}
	for (const e of query(world, [EnemyFaction])) if (EnemyType.id[e] === leech) leeches++;
	expect(summons).toBe(3);
	expect(leeches).toBe(9);
});

test("the mud pool slows the hero by 50% while inside and for 3 s after leaving", () => {
	const { world, hero, boss, heroStatus, step, events } = setup(8);
	const e = boss.start(world, 20);
	Position.x[e] = 0;
	Position.z[e] = 0;
	let pool: { x: number; z: number; r: number } | null = null;
	for (let i = 0; i < 60 * 6 && !pool; i++) {
		step();
		events.consume((type, a, b, c) => {
			if (type === EventType.BossPool) pool = { x: a, z: b, r: c };
		});
	}
	expect(pool).not.toBeNull();
	const placed = pool as unknown as { x: number; z: number; r: number };
	expect(placed.x).toBeCloseTo(8, 0);
	expect(placed.r).toBe(2.5);
	step();
	expect(heroStatus.speedMultiplier).toBe(0.5);
	// Walk out of the pool: the slow outlasts it by 3 s (180 steps).
	Position.x[hero] = 40;
	Position.x[e] = 80;
	let slowedAfter = 0;
	while (heroStatus.speedMultiplier === 0.5 && slowedAfter < 400) {
		step();
		slowedAfter++;
	}
	expect(slowedAfter).toBeGreaterThanOrEqual(175);
	expect(slowedAfter).toBeLessThanOrEqual(185);
});

test("the scream shoves a hero standing next to her away and hurts it, after a telegraph", () => {
	const { world, hero, boss, step, events } = setup(2);
	const e = boss.start(world, 20);
	Position.x[e] = 0;
	Position.z[e] = 0;
	let telegraph = -1;
	let screamed = -1;
	for (let i = 0; i < 60 * 8 && screamed < 0; i++) {
		step();
		events.consume((type, _a, _b, c) => {
			if (type === EventType.BossTelegraph && c < 0.9 && telegraph < 0) telegraph = i;
			if (type === EventType.BossScream) screamed = i;
		});
		Position.x[e] = 0;
		Position.z[e] = 0;
	}
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect(screamed).toBeGreaterThan(telegraph);
	const before = Position.x[hero] ?? 0;
	for (let i = 0; i < 20; i++) step();
	expect((Position.x[hero] ?? 0) - before).toBeGreaterThan(4);
	expect(Health.hp[hero]).toBeLessThan(1e6);
});

test("the roster fights the Gravedigger in round 10, the Matriarch from 20 and the Forgemaster from 30", () => {
	const { spawn, events, damage } = setup();
	const hero = spawnBody(createGameWorld(), 0, 0);
	const roster = createBossRoster(
		{
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
		},
		bossesData,
	);
	expect(roster.defFor(10).id).toBe("gravedigger");
	expect(roster.defFor(20).id).toBe("swamp_matriarch");
	expect(roster.defFor(29).id).toBe("swamp_matriarch");
	expect(roster.defFor(30).id).toBe("forgemaster");
});
