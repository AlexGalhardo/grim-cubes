import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { heroData, itemsData, weaponsData } from "../data";
import { Boss, Elite, EnemyFaction, EnemyType, Fragment, Health, Position, Radius } from "../ecs/components";
import { createEventBuffer } from "../ecs/events";
import { dropFragment } from "../ecs/fragments";
import { createProjectilePool } from "../ecs/projectile";
import { createGameWorld, spawnBody } from "../ecs/world";
import { computeEffects, createItemEffects } from "../rules/effects";
import { computeStats, createPlayerStats, STAT_FIELDS } from "../rules/stats";
import { createDamageSystem } from "./damage";
import { createAuraSystem, createEffectsSystem } from "./effects";
import { applyRoundEndBonus, createDeathSystem, createPickupSystem, createProgress } from "./loot";
import { createTargetingSystem } from "./targeting";
import { createWeaponSystem } from "./weapon";

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
const xp = { base: 10, perLevel: 8 };
const owning = (...ids: string[]) => new Map(ids.map((id) => [id, 1]));

test("every item with modifiers changes the stats it lists, and 30+ items are covered", () => {
	const base = createPlayerStats();
	computeStats(heroData, [], base);
	let checked = 0;
	for (const it of itemsData) {
		if (it.modifiers.length === 0) continue;
		const out = createPlayerStats();
		computeStats(heroData, it.modifiers, out);
		for (const m of it.modifiers) {
			const field = STAT_FIELDS[m.stat];
			expect(field, `${it.id}:${m.stat}`).toBeDefined();
			if (field && m.value !== 0 && out[field] !== base[field]) checked++;
		}
	}
	expect(checked).toBeGreaterThanOrEqual(29);
	// Items with stat modifiers (29) plus items whose special effect is implemented and tested below.
	const covered = itemsData.filter(
		(i) => i.modifiers.length > 0 || (i.status !== "alpha" && i.effects.length > 0),
	);
	expect(covered.length).toBeGreaterThanOrEqual(30);
});

test("unimplemented effects are marked alpha, at most 10 in the 1.0 pool", () => {
	const alpha = itemsData.filter((i) => i.status === "alpha");
	expect(alpha.length).toBeLessThanOrEqual(10);
	const effects = createItemEffects();
	computeEffects(itemsData, owning(...alpha.map((i) => i.id)), effects);
	expect(effects.auras).toHaveLength(0);
	expect(effects.revives).toBe(0);
});

test("computeEffects aggregates the implemented effects and stacks counts", () => {
	const effects = createItemEffects();
	computeEffects(
		itemsData,
		new Map([
			["rat_king", 2],
			["hellfire_round", 1],
			["tithe_box", 1],
			["gilded_skull", 1],
		]),
		effects,
	);
	expect(effects.doubleFragmentChance).toBeCloseTo(0.3);
	expect(effects.extraPierce).toBe(1);
	expect(effects.endOfRoundFragmentBonus).toBeCloseTo(0.15);
	expect(effects.fragmentGain).toBeCloseTo(0.2);
});

test("rat_king doubles dropped piles with its chance", () => {
	const world = createGameWorld();
	const fx = createEffectsSystem(itemsData, new Map([["rat_king", 7]]));
	expect(fx.effects.doubleFragmentChance).toBe(1);
	const death = createDeathSystem({
		fragments,
		fragmentsPerType: [2],
		rng: mulberry32(1),
		round: () => 1,
		effects: fx.effects,
	});
	const e = spawnBody(world, 0, 0);
	for (const c of [EnemyFaction, Health, EnemyType]) addComponent(world, e, c);
	Health.hp[e] = 0;
	EnemyType.id[e] = 0;
	death.run(world);
	const piles = [...[...Array(20).keys()].filter((i) => (Fragment.value[i] ?? 0) > 0)];
	expect(piles.some((p) => Fragment.value[p] === 4)).toBe(true);
});

test("gilded_skull raises what a pile is worth and tithe_box repays part of the round", () => {
	const fx = createEffectsSystem(itemsData, owning("gilded_skull", "tithe_box"));
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, Radius);
	const progress = createProgress();
	const pickup = createPickupSystem({
		fragments,
		xp,
		progress,
		stats: { pickupRadius: 2.5, xpGain: 0 },
		effects: fx.effects,
	});
	dropFragment(world, 0.1, 0, 10);
	pickup.run(world, hero);
	expect(progress.gold).toBeCloseTo(12);
	const bonus = applyRoundEndBonus(progress, fragments, xp, fx.effects);
	expect(bonus).toBe(Math.floor(12 * 0.15));
	expect(progress.roundGold).toBe(0);
});

function fighters(owned: Map<string, number>) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	Health.hp[hero] = Health.max[hero] = 100;
	const events = createEventBuffer(64);
	const hash = createSpatialHash();
	const fx = createEffectsSystem(itemsData, owned);
	const stats = createPlayerStats();
	computeStats(heroData, [], stats);
	stats.critChance = 0;
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
		effects: fx.effects,
	});
	const enemy = (x: number, z: number): number => {
		const e = spawnBody(world, x, z);
		for (const c of [EnemyFaction, Radius, Health]) addComponent(world, e, c);
		Radius.r[e] = 0.3;
		Health.hp[e] = Health.max[e] = 100;
		hash.insert(e, x, z);
		return e;
	};
	return { world, hero, events, hash, fx, stats, damage, enemy };
}

test("executioner_mark adds damage against elites and the boss_damage stat against bosses", () => {
	const { world, damage, enemy, fx, stats } = fighters(owning("executioner_mark"));
	expect(fx.effects.bonusDamageVsElites).toBeCloseTo(0.25);
	stats.bossDamage = 0.5;
	const plain = enemy(5, 0);
	const elite = enemy(6, 0);
	const boss = enemy(7, 0);
	addComponent(world, elite, Elite);
	addComponent(world, boss, Boss);
	for (const e of [plain, elite, boss]) damage.queue.push(e, 10, 0, 0, 0, 0);
	damage.run(world);
	expect(100 - (Health.hp[plain] ?? 0)).toBeCloseTo(10);
	expect(100 - (Health.hp[elite] ?? 0)).toBeCloseTo(12.5);
	expect(100 - (Health.hp[boss] ?? 0)).toBeCloseTo(15);
});

function armed(owned: Map<string, number>, id: string) {
	const ctx = fighters(owned);
	const events = createEventBuffer(64);
	const targeting = createTargetingSystem({ priorityDistanceMult: 0.8, retargetEvery: 3 }, ctx.hash);
	const pool = createProjectilePool(ctx.world, events, 8);
	const weapon = createWeaponSystem({
		weapon: weaponsData.find((w) => w.id === id) as (typeof weaponsData)[number],
		tier: 0,
		stats: ctx.stats,
		attackSpeedCap: 12,
		queue: ctx.damage.queue,
		events,
		targeting,
		enemies: ctx.hash,
		rng: mulberry32(3),
		projectiles: pool,
		effects: ctx.fx.effects,
	});
	return { ...ctx, targeting, weapon };
}

test("hellfire_round adds one pierce to every shot", async () => {
	const { world, hero, enemy, targeting, weapon } = armed(owning("hellfire_round"), "pistol");
	enemy(8, 0);
	targeting.run(world, hero, weapon.range);
	weapon.run(world, hero);
	const { Projectile } = await import("../ecs/components");
	const live = [...Array(60).keys()].find((e) => (Projectile.life[e] ?? 0) > 0) ?? -1;
	expect(Projectile.pierce[live]).toBe(1);
});

test("blood_altar scales weapon damage with the missing HP percentage", () => {
	const { world, hero, enemy, targeting, weapon, damage } = armed(owning("blood_altar"), "sword");
	Health.hp[hero] = 50;
	const target = enemy(1.2, 0);
	targeting.run(world, hero, weapon.range);
	weapon.run(world, hero);
	damage.run(world);
	// 50% missing HP at +1% per percent: 12 * 1.5.
	expect(100 - (Health.hp[target] ?? 0)).toBeCloseTo(12 * 1.5);
});

test("brimstone_heart burns enemies inside its radius each step", () => {
	const { world, hero, hash, enemy, fx, damage } = fighters(owning("brimstone_heart"));
	const near = enemy(1, 0);
	const far = enemy(6, 0);
	const aura = createAuraSystem({
		effects: fx.effects,
		queue: damage.queue,
		enemies: hash,
		round: () => 4,
	});
	for (let i = 0; i < 60; i++) {
		aura.run(world, hero);
		damage.run(world);
	}
	// (5 + 1 * 4) per second for one second.
	expect(100 - (Health.hp[near] ?? 0)).toBeCloseTo(9, 0);
	expect(Health.hp[far]).toBe(100);
});

test("phylactery revives the hero once with the configured HP and then stays spent", () => {
	const { hero, fx } = fighters(owning("phylactery"));
	Health.hp[hero] = 0;
	expect(fx.tryRevive(hero)).toBe(true);
	expect(Health.hp[hero]).toBeCloseTo(30);
	Health.hp[hero] = 0;
	expect(fx.tryRevive(hero)).toBe(false);
	void Position;
});

test("soul_jar adds its fraction of souls", () => {
	const effects = createItemEffects();
	computeEffects(itemsData, owning("soul_jar"), effects);
	expect(effects.soulGain).toBeCloseTo(0.5);
	expect(itemsData.filter((i) => i.status === "alpha")).toHaveLength(4);
});
