import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, enemiesData, heroData, roundsData, toEnemyDefs, weaponsData } from "../data";
import {
	Boss,
	Chest,
	ContactDamage,
	EnemyFaction,
	EnemyType,
	Health,
	Position,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createProjectilePool } from "../ecs/projectile";
import { createGameWorld, spawnBody } from "../ecs/world";
import { computeStats, createPlayerStats } from "../rules/stats";
import { createBehaviorSystem } from "./behavior";
import { bossMaxHp, createBossSystem, enrageMult } from "./boss";
import { createDamageSystem } from "./damage";
import { createDeathSystem } from "./loot";
import { movementSystem } from "./movement";
import { createSeparationSystem } from "./separation";
import { createSpawnSystem } from "./spawn";
import { createTargetingSystem } from "./targeting";
import { createWeaponSystem } from "./weapon";

const def = bossesData[0];
if (!def) throw new Error("bosses.json is empty");
const husk = enemiesData.findIndex((e) => e.id === "husk");
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

function setup(heroHp = 100) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, Radius);
	addComponent(world, hero, Velocity);
	Radius.r[hero] = 0.45;
	Health.hp[hero] = Health.max[hero] = heroHp;
	const events = createEventBuffer(512);
	const stats = createPlayerStats();
	computeStats(heroData, [], stats);
	const damage = createDamageSystem({
		config: damageConfig,
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
	spawn.startRound(10, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	let defeated = 0;
	const boss = createBossSystem({
		def: def as NonNullable<typeof def>,
		rounds: roundsData.boss,
		spawn,
		events,
		queue: damage.queue,
		hero,
		rng: mulberry32(4),
		summonType: husk,
		difficulty: () => 1,
		onDefeated: () => {
			defeated++;
		},
	});
	return { world, hero, events, damage, spawn, boss, stats, defeated: () => defeated };
}

test("the Gravedigger has 1,200 HP in round 10 on Normal and scales 35% per ten rounds", () => {
	expect(bossMaxHp(def, roundsData.boss, 10, 1)).toBe(1200);
	expect(bossMaxHp(def, roundsData.boss, 20, 1)).toBeCloseTo(1200 * 1.35);
	expect(bossMaxHp(def, roundsData.boss, 10, 1.25)).toBe(1500);
	const { world, boss } = setup();
	const e = boss.start(world, 10);
	expect(Health.max[e]).toBe(1200);
	expect(Boss.id[e]).toBe(1);
	expect(Radius.r[e]).toBeCloseTo(def.radius ?? 0);
	expect(ContactDamage.value[e]).toBeCloseTo(25 + 1.5 * 10);
});

test("enrage adds a stack every 60 s, +15% damage and speed each", () => {
	const { world, boss } = setup(1e9);
	const e = boss.start(world, 10);
	const baseSpeed = Speed.value[e] ?? 0;
	const baseDamage = ContactDamage.value[e] ?? 0;
	for (let i = 0; i < 60 * 120; i++) boss.run(world);
	expect(Boss.enrageStacks[e]).toBe(2);
	expect(Speed.value[e]).toBeCloseTo(baseSpeed * enrageMult(roundsData.boss, 2));
	expect(ContactDamage.value[e]).toBeCloseTo(baseDamage * 1.3);
});

test("at 50% HP the boss summons six Carcaças, once", () => {
	const { world, boss, events } = setup();
	const e = boss.start(world, 10);
	const before = query(world, [EnemyFaction]).length;
	boss.run(world);
	expect(query(world, [EnemyFaction]).length).toBe(before);
	Health.hp[e] = 599;
	boss.run(world);
	const added = [...query(world, [EnemyFaction])].filter((id) => id !== e);
	expect(added).toHaveLength(6);
	expect(added.every((id) => EnemyType.id[id] === husk)).toBe(true);
	boss.run(world);
	expect(query(world, [EnemyFaction]).length).toBe(before + 6);
	let summons = 0;
	events.consume((type) => {
		if (type === EventType.BossSummon) summons++;
	});
	expect(summons).toBe(1);
});

test("the line charge is telegraphed for 1 s, then the boss rushes the hero", () => {
	const { world, hero, boss, events } = setup();
	const e = boss.start(world, 10);
	Position.x[e] = 12;
	Position.z[e] = 0;
	let telegraphStep = -1;
	let rushStep = -1;
	for (let step = 0; step < 600 && rushStep < 0; step++) {
		boss.run(world);
		events.consume((type, _a, _b, c) => {
			if (type === EventType.BossTelegraph && telegraphStep < 0) {
				telegraphStep = step;
				expect(c).toBeCloseTo(1);
			}
		});
		if (telegraphStep >= 0 && Math.abs(Velocity.x[e] ?? 0) > 5) rushStep = step;
	}
	expect(telegraphStep).toBeGreaterThanOrEqual(0);
	expect((rushStep - telegraphStep) / 60).toBeCloseTo(1, 0);
	expect(Velocity.x[e]).toBeLessThan(0);
	void hero;
});

test("the shovel arc hurts the hero in front of the boss and misses one that moved behind it", () => {
	for (const hit of [true, false]) {
		const { world, hero, boss, damage, events } = setup();
		const e = boss.start(world, 10);
		Position.x[e] = 0;
		Position.z[e] = 0;
		Position.x[hero] = 2;
		Position.z[hero] = 0;
		Health.hp[hero] = 500;
		let windup = false;
		for (let step = 0; step < 300 && !windup; step++) {
			boss.run(world);
			events.consume((type) => {
				if (type === EventType.BossTelegraph) windup = true;
			});
		}
		expect(windup).toBe(true);
		// The aim was fixed when the windup began; stepping to the far side leaves the arc.
		if (!hit) Position.x[hero] = -2;
		for (let step = 0; step < 60; step++) boss.run(world);
		damage.run(world);
		const lost = 500 - (Health.hp[hero] ?? 0);
		if (hit) expect(lost).toBeCloseTo((ContactDamage.value[e] ?? 0) * 1.5, 3);
		else expect(lost).toBe(0);
	}
});

test("killing the boss drops a chest for 3 items (keep 2), reports the defeat and records the event", () => {
	const { world, boss, events, defeated } = setup();
	const e = boss.start(world, 10);
	const death = createDeathSystem({
		fragments: roundsData.fragments,
		fragmentsPerType: [0],
		rng: mulberry32(1),
		round: () => 10,
		onDeath: (w, id, x, z) => boss.handleDeath(w, id, x, z),
	});
	Health.hp[e] = 0;
	death.run(world);
	const [chest] = [...query(world, [Chest])];
	expect(Chest.tier[chest as number]).toBe(3);
	expect(Chest.choices[chest as number]).toBe(3);
	expect(Chest.picks[chest as number]).toBe(2);
	expect(defeated()).toBe(1);
	expect(boss.entity).toBe(-1);
	let died = 0;
	events.consume((type) => {
		if (type === EventType.BossDied) died++;
	});
	expect(died).toBe(1);
});

test("a greedy melee hero with a median build kills the Gravedigger in 45 to 90 seconds", () => {
	const ctx = setup(1e9);
	const { world, hero, boss, damage, events, stats } = ctx;
	stats.damage = 0.1;
	const hash = createSpatialHash();
	const separation = createSeparationSystem({ weight: 0.6, maxRadius: 1.5 });
	const targeting = createTargetingSystem({ priorityDistanceMult: 0.8, retargetEvery: 3 }, separation.hash);
	const weapon = createWeaponSystem({
		weapon: weaponsData.find((w) => w.id === "sword") as (typeof weaponsData)[number],
		tier: 0,
		stats,
		attackSpeedCap: 12,
		queue: damage.queue,
		events,
		targeting,
		enemies: separation.hash,
		rng: mulberry32(5),
		projectiles: createProjectilePool(world, events, 4),
	});
	void hash;
	const behavior = createBehaviorSystem(
		{
			zigzag: { amplitude: 1.5, periodSeconds: 0.8 },
			contactCooldownSeconds: heroData.combat.contactCooldownSeconds,
			attackAnimationSeconds: 0.4,
		},
		damage.queue,
	);
	let defeated = false;
	const death = createDeathSystem({
		fragments: roundsData.fragments,
		fragmentsPerType: [0],
		rng: mulberry32(1),
		round: () => 10,
		onDeath: (w, id, x, z) => {
			boss.handleDeath(w, id, x, z);
			if (id === boss.entity) defeated = true;
		},
	});
	const e = boss.start(world, 10);
	let steps = 0;
	for (; steps < 60 * 200 && Health.hp[e] !== undefined && (Health.hp[e] ?? 0) > 0; steps++) {
		behavior.run(world, hero);
		boss.run(world);
		separation.run(world);
		// Greedy: close the distance to the boss, then stand next to it.
		const dx = (Position.x[e] ?? 0) - (Position.x[hero] ?? 0);
		const dz = (Position.z[e] ?? 0) - (Position.z[hero] ?? 0);
		const dist = Math.hypot(dx, dz);
		const go = dist > 2.2 ? 1 : 0;
		Velocity.x[hero] = (dx / (dist || 1)) * 6 * go;
		Velocity.z[hero] = (dz / (dist || 1)) * 6 * go;
		movementSystem(world);
		targeting.run(world, hero, weapon.range);
		weapon.run(world, hero);
		damage.run(world);
		death.run(world);
	}
	void defeated;
	const seconds = steps / 60;
	expect(seconds).toBeGreaterThanOrEqual(45);
	expect(seconds).toBeLessThanOrEqual(90);
});
