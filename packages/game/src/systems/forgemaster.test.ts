import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, enemiesData, heroData, roundsData, toEnemyDefs } from "../data";
import { Armor, Boss, EnemyShot, Health, Position, Radius, Velocity } from "../ecs/components";
import { createEnemyShotPool } from "../ecs/enemyShot";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { computeStats, createPlayerStats } from "../rules/stats";
import { bossMaxHp, createBossSystem } from "./boss";
import { createDamageSystem } from "./damage";
import { createHeroStatus } from "./heroStatus";
import { movementSystem } from "./movement";
import { createSpawnSystem } from "./spawn";

const def = bossesData.find((b) => b.id === "forgemaster");
if (!def) throw new Error("the Forgemaster is not in bosses.json");
const ids = enemiesData.map((e) => e.id);
const husk = ids.indexOf("husk");
const _leech = ids.indexOf("leech");

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
	spawn.startRound(30, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	const heroStatus = createHeroStatus();
	const shots = createEnemyShotPool(world, 64);
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
		shots,
		difficulty: () => 1,
		onDefeated: () => undefined,
	});
	const step = (): void => {
		boss.run(world);
		heroStatus.run(hero);
		movementSystem(world);
		damage.run(world);
	};
	return { world, hero, events, damage, spawn, boss, heroStatus, shots, step };
}

test("the Forgemaster has his data HP in round 30", () => {
	const hp = def?.hpBaseRound10 ?? 0;
	expect(bossMaxHp(def, roundsData.boss, 30, 1)).toBe(hp);
	const { world, boss } = setup();
	const e = boss.start(world, 30);
	expect(Health.max[e]).toBe(hp);
	expect(Boss.id[e]).toBe(3);
});

test("the hammer is telegraphed, then throws a hero in range back and hurts it", () => {
	const { world, hero, boss, step, events } = setup(3);
	const e = boss.start(world, 30);
	let telegraph = -1;
	let slam = -1;
	for (let i = 0; i < 60 * 8 && slam < 0; i++) {
		step();
		Position.x[e] = 0;
		Position.z[e] = 0;
		events.consume((type, _a, _b, c) => {
			if (type === EventType.BossTelegraph && Math.abs(c - 1.2) < 1e-6 && telegraph < 0) telegraph = i;
			if (type === EventType.BossShockwave) slam = i;
		});
	}
	expect(telegraph).toBeGreaterThanOrEqual(0);
	expect((slam - telegraph) / 60).toBeCloseTo(1.2, 0);
	const before = Position.x[hero] ?? 0;
	for (let i = 0; i < 20; i++) step();
	expect((Position.x[hero] ?? 0) - before).toBeGreaterThan(2.5);
	expect(Health.hp[hero]).toBeLessThan(1e6);
});

test("the chain shot fires two volleys of four projectiles in four directions", () => {
	const { world, hero, boss, shots, step, events } = setup(10);
	const e = boss.start(world, 30);
	Position.x[e] = 0;
	Position.z[e] = 0;
	let telegraphs = 0;
	const directions = new Set<number>();
	for (let i = 0; i < 60 * 3; i++) {
		step();
		Position.x[hero] = 10;
		events.consume((type, _a, _b, c) => {
			if (type === EventType.BossTelegraph && Math.abs(c - 0.8) < 1e-6) telegraphs++;
		});
		if (telegraphs > 0 && directions.size === 0) {
			for (let s = 0; s < 64; s++) {
				if ((EnemyShot.life[s] ?? 0) > 0)
					directions.add(Math.round(Math.atan2(Velocity.x[s] ?? 0, Velocity.z[s] ?? 0) * 100));
			}
		}
	}
	expect(telegraphs).toBeGreaterThanOrEqual(1);
	let live = 0;
	for (let s = 0; s < 64; s++) if ((EnemyShot.life[s] ?? 0) > 0) live++;
	expect(live).toBeGreaterThanOrEqual(4);
	expect(shots).toBeDefined();
});

test("at half HP the armour phase hardens him to 30 armour: he takes about a third of the damage", () => {
	const { world, damage, boss, events } = setup(60);
	const e = boss.start(world, 30);
	const hit = (): number => {
		const before = Health.hp[e] ?? 0;
		damage.queue.push(e, 100, 0, 0, 0, 0);
		damage.run(world);
		return before - (Health.hp[e] ?? 0);
	};
	const soft = hit();
	expect(soft).toBeCloseTo(100);
	Health.hp[e] = 2500;
	boss.run(world);
	expect(Boss.phase[e]).toBe(1);
	expect(Armor.value[e]).toBe(30);
	const hard = hit();
	expect(hard / soft).toBeCloseTo(0.334, 2);
	let phase = 0;
	events.consume((type, a) => {
		if (type === EventType.BossPhase) phase = a;
	});
	expect(phase).toBe(2);
});
