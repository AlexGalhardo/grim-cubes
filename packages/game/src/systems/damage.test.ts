import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { Armor, Boss, Elite, Health, Invulnerable, Knockback } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawn } from "../ecs/world";
import {
	armorMultiplier,
	createLifeStealLimiter,
	damageConfigFromHero,
	type HeroCombatData,
} from "../rules/damage";
import { createDamageSystem, type HeroCombatStats } from "./damage";

const hero = JSON.parse(
	readFileSync(new URL("../../../../data/hero.json", import.meta.url), "utf8"),
) as HeroCombatData;
const config = damageConfigFromHero(hero);

function setup(overrides: Partial<HeroCombatStats> = {}) {
	const world = createGameWorld();
	const heroEid = spawn(world);
	Health.hp[heroEid] = 1e9;
	Health.max[heroEid] = 1e9;
	Invulnerable.ticks[heroEid] = 0;
	const stats: HeroCombatStats = { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0, ...overrides };
	const events = createEventBuffer(4096);
	const system = createDamageSystem({
		config,
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events,
		hero: heroEid,
		stats,
	});
	const enemy = spawn(world);
	Health.hp[enemy] = 100;
	Health.max[enemy] = 100;
	Armor.value[enemy] = 0;
	return { world, heroEid, stats, events, system, enemy };
}

test("armor multiplier: 10 -> x0.60, -10 -> bounded above 1", () => {
	expect(armorMultiplier(10, config.armorConstant)).toBeCloseTo(0.6, 2);
	expect(armorMultiplier(0, config.armorConstant)).toBe(1);
	const negative = armorMultiplier(-10, config.armorConstant);
	expect(negative).toBeGreaterThan(1);
	expect(armorMultiplier(-1000, config.armorConstant)).toBeLessThan(2);
});

test("hero armor 10 reduces a 100 damage hit to 60", () => {
	const { world, heroEid, system, events } = setup({ armor: 10 });
	Health.hp[heroEid] = 1000;
	system.queue.push(heroEid, 100, 0, 0, 0, 0);
	system.run(world);
	expect(1000 - (Health.hp[heroEid] ?? 0)).toBeCloseTo(60, 0);
	expect(events.size).toBe(1);
});

test("hero i-frames block the next hits for 0.3 s", () => {
	const { world, heroEid, system } = setup();
	Health.hp[heroEid] = 1000;
	system.queue.push(heroEid, 10, 0, 0, 0, 0);
	system.queue.push(heroEid, 10, 0, 0, 0, 0);
	system.run(world);
	expect(Health.hp[heroEid]).toBe(990);
	for (let i = 0; i < 17; i++) {
		system.queue.push(heroEid, 10, 0, 0, 0, 0);
		system.run(world);
	}
	expect(Health.hp[heroEid]).toBe(990);
	system.queue.push(heroEid, 10, 0, 0, 0, 0);
	system.run(world);
	expect(Health.hp[heroEid]).toBe(980);
});

test("dodge 60% over 10,000 samples is within 1%", () => {
	const { world, heroEid, system, events } = setup({ dodge: 0.6 });
	let dodged = 0;
	const n = 10_000;
	for (let i = 0; i < n; i++) {
		Invulnerable.ticks[heroEid] = 0;
		system.queue.push(heroEid, 1, 0, 0, 0, 0);
		system.run(world);
		events.consume((type) => {
			if (type === EventType.Dodged) dodged++;
		});
	}
	expect(Math.abs(dodged / n - 0.6)).toBeLessThan(0.01);
});

test("dodge above the cap is clamped to it", () => {
	const { world, heroEid, system, events } = setup({ dodge: 5 });
	let dodged = 0;
	for (let i = 0; i < 10_000; i++) {
		Invulnerable.ticks[heroEid] = 0;
		system.queue.push(heroEid, 1, 0, 0, 0, 0);
		system.run(world);
		events.consume((type) => {
			if (type === EventType.Dodged) dodged++;
		});
	}
	expect(dodged / 10_000).toBeLessThan(config.dodgeCap + 0.01);
});

test("crit multiplies damage and emits the flag", () => {
	const { world, system, enemy, events } = setup({ critMult: 3 });
	system.queue.push(enemy, 10, 0, 1, 0, 0);
	system.run(world);
	expect(Health.hp[enemy]).toBe(70);
	let flag = -1;
	events.consume((type, _a, b) => {
		if (type === EventType.Damaged) flag = b;
	});
	expect(flag).toBe(1);
});

test("enemy armor, death event and knockback scaling by elite and boss", () => {
	const { world, system, enemy, events } = setup();
	const elite = spawn(world);
	const boss = spawn(world);
	for (const e of [elite, boss]) {
		Health.hp[e] = 100;
		Armor.value[e] = 0;
	}
	addComponent(world, elite, Elite);
	addComponent(world, boss, Boss);

	Armor.value[enemy] = 10;
	system.queue.push(enemy, 100, 0, 0, 2, 0);
	system.queue.push(elite, 1, 0, 0, 2, 0);
	system.queue.push(boss, 1, 0, 0, 2, 0);
	system.run(world);
	expect(Health.hp[enemy]).toBeCloseTo(40, 0);
	expect(Knockback.x[enemy]).toBe(2);
	expect(Knockback.x[elite]).toBeCloseTo(2 * config.eliteKnockbackMult);
	expect(Knockback.x[boss]).toBeCloseTo(2 * config.bossKnockbackMult);
	expect(Knockback.ticks[enemy]).toBe(6);

	system.queue.push(enemy, 1000, 0, 0, 0, 0);
	system.run(world);
	let died = 0;
	events.consume((type, _a, _b, _c, entity) => {
		if (type === EventType.Died && entity === enemy) died++;
	});
	expect(died).toBe(1);
});

test("life steal heals the hero but never above the HP/s cap", () => {
	const { world, heroEid, system, enemy } = setup({ lifeSteal: 1 });
	Health.hp[heroEid] = 10;
	Health.max[heroEid] = 1000;
	Health.hp[enemy] = 1e9;
	for (let i = 0; i < 60; i++) {
		system.queue.push(enemy, 1000, 0, 0, 0, 0);
		system.run(world);
	}
	const healed = (Health.hp[heroEid] ?? 0) - 10;
	expect(healed).toBeGreaterThan(config.lifeStealHpPerSecond - 1);
	expect(healed).toBeLessThanOrEqual(config.lifeStealHpPerSecond + 1e-6);
});

test("life steal limiter releases once per trigger interval", () => {
	const limiter = createLifeStealLimiter(config, 1 / 60);
	limiter.add(100);
	const grants = Array.from({ length: 12 }, () => limiter.step());
	expect(grants.filter((g) => g > 0)).toEqual([1, 1]);
});

test("a full queue counts drops instead of growing", () => {
	const { system, enemy } = setup();
	for (let i = 0; i < 1030; i++) system.queue.push(enemy, 1, 0, 0, 0, 0);
	expect(system.queue.size).toBe(1024);
	expect(system.queue.dropped).toBe(6);
});

test("a hero that is already dead takes no further hits: one Died event and the first killer stays", () => {
	const { world, heroEid, system, events } = setup();
	Health.hp[heroEid] = 1;
	system.queue.push(heroEid, 5, 7, 0, 0, 0);
	system.run(world);
	Invulnerable.ticks[heroEid] = 0;
	system.queue.push(heroEid, 5, 9, 0, 0, 0);
	system.run(world);
	let died = 0;
	events.consume((type, _a, _b, _c, e) => {
		if (type === EventType.Died && e === heroEid) died++;
	});
	expect(died).toBe(1);
});
