import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { bossesData, elitesData, enemiesData, roundsData, toEnemyDefs } from "../data";
import { Armor, Health, Radius, Velocity } from "../ecs/components";
import { createEnemyShotPool } from "../ecs/enemyShot";
import { createEventBuffer } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { bossMaxHp, createBossRoster } from "./boss";
import { createSpawnSystem } from "./spawn";

const ids = enemiesData.map((e) => e.id);
const husk = ids.indexOf("husk");

function roster(seed: number) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, Radius);
	addComponent(world, hero, Velocity);
	Health.hp[hero] = Health.max[hero] = 1e6;
	const events = createEventBuffer(256);
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: mulberry32(3),
	});
	spawn.startRound(40, { pool: [{ type: husk, weight: 1 }], difficultyMult: 1 });
	const boss = createBossRoster(
		{
			rounds: roundsData.boss,
			spawn,
			events,
			queue: { push: () => true, size: 0, dropped: 0 },
			hero,
			rng: mulberry32(4),
			summonType: husk,
			enemyIndex: (id) => ids.indexOf(id),
			shots: createEnemyShotPool(world, 16),
			eliteModifiers: elitesData.modifiers,
			seed,
			difficulty: () => 1,
			onDefeated: () => undefined,
		},
		bossesData,
	);
	return { world, boss };
}

test("rounds 10, 20 and 30 follow the fixed order", () => {
	const { boss } = roster(1);
	expect([10, 20, 30].map((r) => boss.defFor(r).id)).toEqual([
		"gravedigger",
		"swamp_matriarch",
		"forgemaster",
	]);
});

test("from round 40 the boss is drawn from the roster, repeatably, and its HP scales 35% per ten rounds since its own", () => {
	const seen = new Set<string>();
	for (let seed = 1; seed <= 40; seed++) {
		const { world, boss } = roster(seed);
		const def = boss.defFor(40);
		expect(boss.defFor(40).id).toBe(def.id);
		seen.add(def.id);
		const e = boss.start(world, 40);
		const expected = def.hpBaseRound10 * (1 + (0.35 * (40 - def.round)) / 10);
		expect(Health.max[e]).toBeCloseTo(expected, 0);
		expect(bossMaxHp(def, roundsData.boss, 40, 1)).toBeCloseTo(expected);
	}
	expect(seen.size).toBe(3);
});

test("round 60 adds one elite modifier to the boss and round 100 adds two, applied to its armour and speed", () => {
	const counts = new Map<number, number>();
	for (const round of [50, 60, 100]) {
		const { world, boss } = roster(7);
		const e = boss.start(world, round);
		counts.set(round, boss.view()?.modifiers.length ?? -1);
		if (round === 50) expect(Armor.value[e] ?? 0).toBe(0);
	}
	expect(counts.get(50)).toBe(0);
	expect(counts.get(60)).toBe(1);
	expect(counts.get(100)).toBe(2);
});

test("a boss with the armored modifier gets +20 armour, a swift one 1.6x speed", () => {
	const armored = elitesData.modifiers.find((m) => m.id === "armored");
	const swift = elitesData.modifiers.find((m) => m.id === "swift");
	expect(armored?.armorAdd).toBe(20);
	expect(swift?.speedMult).toBe(1.6);
	let sawArmor = false;
	for (let seed = 1; seed <= 30 && !sawArmor; seed++) {
		const { world, boss } = roster(seed);
		const e = boss.start(world, 60);
		if (boss.view()?.modifiers.includes("Blindado")) {
			expect(Armor.value[e]).toBeGreaterThanOrEqual(20);
			sawArmor = true;
		}
	}
	expect(sawArmor).toBe(true);
});
