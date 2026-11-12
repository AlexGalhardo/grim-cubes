import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { Boss, Elite, EnemyFaction, EnemyType, Health, Radius } from "../ecs/components";
import { createEventBuffer } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createRunStats, DamageOrigin } from "../rules/runstats";
import { createDamageSystem } from "./damage";
import { createDeathSystem } from "./loot";

const fragments = {
	guaranteedDropUntilRound: 4,
	dropPercentBase: 100,
	dropPercentPerRound: 1.5,
	dropPercentMin: 50,
	goldPerFragment: 1,
	xpPerFragment: 1,
	groundPileCap: 50,
	harvestPerRound: 0.05,
	magnetSpeed: 14,
	collectRadius: 0.6,
};
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

function setup() {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	Health.hp[hero] = Health.max[hero] = 10;
	const runStats = createRunStats();
	const damage = createDamageSystem({
		config: damageConfig,
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events: createEventBuffer(64),
		hero,
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
		runStats,
	});
	const enemy = (type = 0): number => {
		const e = spawnBody(world, 5, 0);
		for (const c of [EnemyFaction, Radius, Health, EnemyType]) addComponent(world, e, c);
		Health.hp[e] = Health.max[e] = 100;
		EnemyType.id[e] = type;
		return e;
	};
	return { world, hero, runStats, damage, enemy };
}

test("damage dealt to enemies is tallied", () => {
	const { world, damage, enemy, runStats } = setup();
	const e = enemy();
	damage.queue.push(e, 30, 0, 0, 0, 0);
	damage.run(world);
	expect(runStats.damageDealt).toBeCloseTo(30);
});

test("the killing blow names the enemy type or the hero itself", () => {
	const a = setup();
	const killer = a.enemy(3);
	a.damage.queue.push(a.hero, 50, killer, 0, 0, 0);
	a.damage.run(a.world);
	expect(a.runStats.killer).toEqual({ kind: "enemy", type: 3 });

	const b = setup();
	b.damage.queue.push(b.hero, 50, b.hero, 0, 0, 0);
	b.damage.run(b.world);
	expect(b.runStats.killer).toEqual({ kind: "self", type: -1 });

	const c = setup();
	c.damage.queue.push(c.hero, 5, 0, 0, 0, 0);
	c.damage.run(c.world);
	expect(c.runStats.killer.kind).toBe("none");
});

test("kills, elites and bosses are counted when enemies die, with the boss round", () => {
	const { world, runStats, enemy } = setup();
	const death = createDeathSystem({
		fragments,
		fragmentsPerType: [1],
		rng: mulberry32(1),
		round: () => 10,
		runStats,
	});
	const common = enemy();
	const elite = enemy();
	const boss = enemy();
	addComponent(world, elite, Elite);
	addComponent(world, boss, Boss);
	for (const e of [common, elite, boss]) Health.hp[e] = 0;
	death.run(world);
	expect(runStats.kills).toBe(3);
	expect(runStats.elitesKilled).toBe(1);
	expect(runStats.bossRounds).toEqual([10]);
});

test("an elite, a boss, an enemy projectile and the hero's own blast are all named as the killer", () => {
	const elite = setup();
	const e = elite.enemy(2);
	addComponent(elite.world, e, Elite);
	elite.damage.queue.push(elite.hero, 50, e, 0, 0, 0);
	elite.damage.run(elite.world);
	expect(elite.runStats.killer).toEqual({ kind: "elite", type: 2 });

	const boss = setup();
	const b = boss.enemy(0);
	addComponent(boss.world, b, Boss);
	Boss.id[b] = 2;
	boss.damage.queue.push(boss.hero, 50, b, 0, 0, 0);
	boss.damage.run(boss.world);
	expect(boss.runStats.killer).toEqual({ kind: "boss", type: 1 });

	const shot = setup();
	shot.damage.queue.push(shot.hero, 50, 0, 0, 0, 0);
	shot.damage.run(shot.world);
	expect(shot.runStats.killer).toEqual({ kind: "shot", type: -1 });
});

test("damage dealt is tallied by origin", () => {
	const { world, damage, runStats, enemy } = setup();
	const e = enemy();
	damage.queue.push(e, 10, 0, 0, 0, 0);
	damage.queue.push(e, 20, 0, 0, 0, 0, DamageOrigin.Spell);
	damage.run(world);
	expect(runStats.damageBySource).toEqual([10, 20]);
	expect(runStats.damageDealt).toBeCloseTo(30);
});
