import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { heroData, itemsData } from "../data";
import { EnemyFaction, Health, Projectile, Radius, Velocity } from "../ecs/components";
import { createEventBuffer, EventType, SpellVfx } from "../ecs/events";
import { createProjectilePool } from "../ecs/projectile";
import { createGameWorld, spawnBody } from "../ecs/world";
import { STEP } from "../loop";
import { computeEffects, createItemEffects } from "../rules/effects";
import { computeStats, createPlayerStats } from "../rules/stats";
import { queryProjectiles } from "../world/queries";
import { createDamageSystem } from "./damage";
import { createEffectsSystem } from "./effects";
import { movementSystem } from "./movement";
import { createProjectileSystem } from "./projectile";
import { createSpellSystem, type SpellSystem } from "./spells";

const ROUND = 3;

const num = (id: string, key: string): number => {
	const item = itemsData.find((entry) => entry.id === id);
	const value = item?.effects[0]?.params[key];
	if (typeof value !== "number") throw new Error(`${id} has no numeric ${key}`);
	return value;
};

const periodOf = (id: string): number => Math.max(1, Math.round(num(id, "intervalSeconds") / STEP));

const damageOf = (id: string): number => num(id, "damageBase") + num(id, "damagePerRound") * ROUND;

function liveShots(world: ReturnType<typeof createGameWorld>): number[] {
	return queryProjectiles(world).filter((e) => (Projectile.life[e] ?? 0) > 0);
}

function rig(id: string, copies = 1) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	Health.hp[hero] = Health.max[hero] = 100;
	const events = createEventBuffer(256);
	const hash = createSpatialHash();
	const fx = createEffectsSystem(itemsData, new Map([[id, copies]]));
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
	const pool = createProjectilePool(world, events, 8);
	const spells = createSpellSystem({
		effects: fx.effects,
		queue: damage.queue,
		enemies: hash,
		projectiles: pool,
		events,
		round: () => ROUND,
	});
	const shots = createProjectileSystem({
		pool,
		queue: damage.queue,
		enemies: hash,
		maxEnemyRadius: 1,
		hero,
		events,
	});
	const enemy = (x: number, z: number, hp = 100): number => {
		const e = spawnBody(world, x, z);
		for (const c of [EnemyFaction, Radius, Health]) addComponent(world, e, c);
		Radius.r[e] = 0.3;
		Health.hp[e] = Health.max[e] = hp;
		hash.insert(e, x, z);
		return e;
	};
	const tally = (): { mines: number; booms: number; novas: number; novaRadius: number } => {
		let mines = 0;
		let booms = 0;
		let novas = 0;
		let novaRadius = 0;
		events.consume((type, _a, _b, c, entity) => {
			if (type === EventType.SpellCast && entity === SpellVfx.Mine) mines++;
			if (type === EventType.SpellCast && entity === SpellVfx.Nova) {
				novas++;
				novaRadius = c;
			}
			if (type === EventType.Exploded) booms++;
		});
		return { mines, booms, novas, novaRadius };
	};
	return { world, hero, events, spells, shots, damage, enemy, tally };
}

const step = (
	spells: SpellSystem,
	world: ReturnType<typeof createGameWorld>,
	hero: number,
	n: number,
): void => {
	for (let i = 0; i < n; i++) spells.run(world, hero);
};

test("computeEffects keeps one spell spec per owned copy", () => {
	const effects = createItemEffects();
	computeEffects(
		itemsData,
		new Map([
			["ossuary_bolt", 1],
			["bone_orbit", 2],
			["soul_chain", 1],
			["grave_mine", 1],
			["ash_nova", 1],
		]),
		effects,
	);
	const kinds = effects.spells.map((spell) => spell.kind);
	expect(kinds.filter((kind) => kind === SpellVfx.Bolt)).toHaveLength(1);
	expect(kinds.filter((kind) => kind === SpellVfx.Orbit)).toHaveLength(2);
	expect(kinds.filter((kind) => kind === SpellVfx.Chain)).toHaveLength(1);
	expect(kinds.filter((kind) => kind === SpellVfx.Mine)).toHaveLength(1);
	expect(kinds.filter((kind) => kind === SpellVfx.Nova)).toHaveLength(1);
	const empty = createItemEffects();
	computeEffects(itemsData, new Map(), empty);
	expect(empty.spells).toHaveLength(0);
});

test("ossuary_bolt waits out its interval, then the shot flies into the nearest enemy", () => {
	const { world, hero, spells, shots, damage, enemy } = rig("ossuary_bolt");
	const target = enemy(4, 0);
	const far = enemy(20, 0);
	const period = periodOf("ossuary_bolt");
	step(spells, world, hero, period - 1);
	expect(liveShots(world)).toHaveLength(0);
	spells.run(world, hero);
	const live = liveShots(world);
	expect(live).toHaveLength(1);
	const shot = live[0] ?? 0;
	expect(Velocity.x[shot] ?? 0).toBeGreaterThan(0);
	expect(Velocity.z[shot] ?? 0).toBeCloseTo(0);
	for (let i = 0; i < 30; i++) {
		movementSystem(world);
		shots.run(world);
		damage.run(world);
	}
	expect(100 - (Health.hp[target] ?? 0)).toBeCloseTo(damageOf("ossuary_bolt"));
	expect(Health.hp[far]).toBe(100);
});

test("bone_orbit cuts an enemy standing on the ring and misses one outside it", () => {
	const { world, hero, spells, damage, enemy } = rig("bone_orbit");
	const onRing = enemy(num("bone_orbit", "radius"), 0);
	const far = enemy(8, 0);
	spells.run(world, hero);
	damage.run(world);
	expect(100 - (Health.hp[onRing] ?? 0)).toBeCloseTo(damageOf("bone_orbit"));
	expect(Health.hp[far]).toBe(100);
});

test("soul_chain hits the nearest enemy and one neighbor, not a far one still in range", () => {
	const { world, hero, spells, damage, enemy } = rig("soul_chain");
	const first = enemy(3, 0);
	const neighbor = enemy(3, 2);
	const skipped = enemy(8, 0);
	step(spells, world, hero, periodOf("soul_chain"));
	damage.run(world);
	const dealt = damageOf("soul_chain");
	expect(100 - (Health.hp[first] ?? 0)).toBeCloseTo(dealt);
	expect(100 - (Health.hp[neighbor] ?? 0)).toBeCloseTo(dealt);
	expect(Health.hp[skipped]).toBe(100);
});

test("soul_chain counts the first target inside jumps, so the next enemy stays safe", () => {
	const { world, hero, spells, damage, enemy } = rig("soul_chain");
	const jumps = num("soul_chain", "jumps");
	const gap = num("soul_chain", "jumpRadius") / 2;
	const ids: number[] = [];
	for (let i = 0; i < jumps + 1; i++) ids.push(enemy(gap * (i + 1), 0));
	step(spells, world, hero, periodOf("soul_chain"));
	damage.run(world);
	const dealt = damageOf("soul_chain");
	for (let i = 0; i < jumps; i++) {
		expect(100 - (Health.hp[ids[i] ?? 0] ?? 0)).toBeCloseTo(dealt);
	}
	expect(Health.hp[ids[jumps] ?? 0]).toBe(100);
});

test("two bone_orbit copies share one spin instead of doubling it", () => {
	const { world, hero, spells, events } = rig("bone_orbit", 2);
	const frames = 4;
	step(spells, world, hero, frames);
	const spin = num("bone_orbit", "spin");
	const radius = num("bone_orbit", "radius");
	const angle = frames * spin * STEP;
	const doubled = angle * 2;
	const at = (turn: number): { x: number; z: number } => ({
		x: Math.cos(turn) * radius,
		z: Math.sin(turn) * radius,
	});
	const once = at(angle);
	const twice = at(doubled);
	let matched = 0;
	let doubledHits = 0;
	events.consume((type, a, b, _c, entity) => {
		if (type !== EventType.SpellCast || entity !== SpellVfx.Orbit) return;
		if (Math.abs(a - once.x) < 1e-4 && Math.abs(b - once.z) < 1e-4) matched++;
		if (Math.abs(a - twice.x) < 1e-4 && Math.abs(b - twice.z) < 1e-4) doubledHits++;
	});
	expect(matched).toBeGreaterThan(0);
	expect(doubledHits).toBe(0);
});

test("grave_mine arms, explodes on contact, and can be placed again after the slot frees", () => {
	const { world, hero, spells, damage, enemy, tally } = rig("grave_mine");
	const near = enemy(1, 0, 10_000);
	const far = enemy(10, 0, 10_000);
	const period = periodOf("grave_mine");
	step(spells, world, hero, period);
	expect(tally()).toMatchObject({ mines: 1, booms: 0 });
	expect(Health.hp[near]).toBe(10_000);
	const cycles = 9;
	let mines = 1;
	let booms = 0;
	for (let i = 0; i < period * (cycles - 1) + 1; i++) {
		spells.run(world, hero);
		damage.run(world);
		const seen = tally();
		mines += seen.mines;
		booms += seen.booms;
	}
	expect(mines).toBe(cycles);
	expect(booms).toBe(cycles);
	expect(10_000 - (Health.hp[near] ?? 0)).toBeCloseTo(damageOf("grave_mine") * cycles);
	expect(Health.hp[far]).toBe(10_000);
});

test("ash_nova hurts enemies inside its radius, misses the ones outside, and reports the radius", () => {
	const { world, hero, spells, damage, enemy, tally } = rig("ash_nova");
	const inside = enemy(2, 0);
	const outside = enemy(8, 0);
	step(spells, world, hero, periodOf("ash_nova"));
	damage.run(world);
	expect(100 - (Health.hp[inside] ?? 0)).toBeCloseTo(damageOf("ash_nova"));
	expect(Health.hp[outside]).toBe(100);
	const seen = tally();
	expect(seen.novas).toBe(1);
	// `c` is stored as f32, so the radius comes back one ulp off the JSON number.
	expect(seen.novaRadius).toBeCloseTo(num("ash_nova", "radius"));
});
