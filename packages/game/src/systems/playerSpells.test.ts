import { createInputState, createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { spellsData } from "../data";
import { EnemyFaction, Health, PlayerFaction, Radius } from "../ecs/components";
import { createEventBuffer, EventType, SpellVfx } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { STEP } from "../loop";
import { buildClassSpells } from "../rules/spells";
import { createDamageSystem } from "./damage";
import { createPlayerSpells } from "./playerSpells";

const ROUND = 4;
const { super: config } = spellsData;

function rig(classId = "warrior") {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	Health.hp[hero] = Health.max[hero] = 100;
	const events = createEventBuffer(256);
	const hash = createSpatialHash();
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
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
	});
	let kills = 0;
	const set = buildClassSpells(spellsData, classId, () => 1);
	const spells = createPlayerSpells({
		heal: set.heal,
		super: set.super,
		config,
		queue: damage.queue,
		enemies: hash,
		events,
		round: () => ROUND,
		kills: () => kills,
	});
	const input = createInputState();
	const enemy = (x: number, z: number): number => {
		const e = spawnBody(world, x, z);
		for (const c of [EnemyFaction, Radius, Health]) addComponent(world, e, c);
		Radius.r[e] = 0.3;
		Health.hp[e] = Health.max[e] = 1000;
		hash.insert(e, x, z);
		return e;
	};
	/** Holds `button` for one step, then releases it for another (a press is the edge, not the hold). */
	const press = (button: "heal" | "super"): void => {
		input[button] = true;
		spells.run(world, hero, input);
		input[button] = false;
		spells.run(world, hero, input);
	};
	const idle = (steps: number): void => {
		for (let i = 0; i < steps; i++) spells.run(world, hero, input);
	};
	return {
		world,
		hero,
		spells,
		damage,
		events,
		set,
		enemy,
		press,
		idle,
		addKills: (n: number): void => {
			kills += n;
		},
	};
}

test("the super needs 100 kills in the round, then 105, then 110", () => {
	const { spells, press, idle, addKills } = rig();
	expect(spells.superNeeded).toBe(100);
	addKills(99);
	press("super");
	expect(spells.superUses).toBe(0);
	addKills(1);
	press("super");
	expect(spells.superUses).toBe(1);
	expect(spells.superNeeded).toBe(105);
	// The charge restarts from the cast: the 100 kills already spent do not count again.
	expect(spells.superKills).toBe(0);
	idle(Math.round(config.durationSeconds / STEP) + 2);
	addKills(104);
	press("super");
	expect(spells.superUses).toBe(1);
	addKills(1);
	press("super");
	expect(spells.superUses).toBe(2);
	expect(spells.superNeeded).toBe(110);
});

test("a new round starts the charge and the cost again from 100", () => {
	const { spells, press, idle, addKills } = rig();
	addKills(100);
	press("super");
	idle(Math.round(config.durationSeconds / STEP) + 2);
	expect(spells.superNeeded).toBe(105);
	addKills(30);
	spells.onRoundStart();
	expect(spells.superNeeded).toBe(100);
	expect(spells.superKills).toBe(0);
});

test("the super lasts 5 seconds, ticks around the hero and ignores a second press while it runs", () => {
	const { world, spells, press, idle, addKills, enemy, damage, events } = rig();
	const near = enemy(2, 0);
	const far = enemy(30, 0);
	addKills(300);
	press("super");
	expect(spells.superActive).toBeCloseTo(config.durationSeconds - 2 * STEP, 5);
	let ticks = 0;
	events.consume((type, _a, _b, _c, entity) => {
		if (type === EventType.SpellCast && entity === SpellVfx.Super) ticks++;
	});
	expect(ticks).toBe(1);
	// A held button or a second press does not restart it.
	press("super");
	expect(spells.superUses).toBe(1);
	idle(Math.round(config.durationSeconds / STEP));
	expect(spells.superActive).toBe(0);
	events.consume((type, _a, _b, _c, entity) => {
		if (type === EventType.SpellCast && entity === SpellVfx.Super) ticks++;
	});
	expect(ticks).toBe(Math.round(config.durationSeconds / config.tickSeconds));
	damage.run(world);
	expect(Health.hp[near]).toBeLessThan(1000);
	expect(Health.hp[far]).toBe(1000);
});

test("the heal restores a fraction of the max HP, respects its cooldown and is not wasted at full HP", () => {
	const { spells, hero, set, press, idle } = rig();
	press("heal");
	expect(spells.healCooldown).toBe(0);
	Health.hp[hero] = 10;
	press("heal");
	expect(Health.hp[hero]).toBeCloseTo(10 + 100 * set.heal.healFraction);
	expect(spells.healCooldown).toBeGreaterThan(set.heal.cooldownSeconds - 0.1);
	const healed = Health.hp[hero] ?? 0;
	press("heal");
	expect(Health.hp[hero]).toBe(healed);
	idle(Math.round(set.heal.cooldownSeconds / STEP));
	expect(spells.healCooldown).toBe(0);
	Health.hp[hero] = 10;
	press("heal");
	expect(Health.hp[hero]).toBeGreaterThan(10);
});

test("the heal does not revive a dead hero", () => {
	const { hero, press } = rig();
	Health.hp[hero] = 0;
	press("heal");
	expect(Health.hp[hero]).toBe(0);
});
