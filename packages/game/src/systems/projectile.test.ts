import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import {
	EnemyFaction,
	Health,
	PlayerFaction,
	Position,
	Projectile,
	Radius,
	Velocity,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createProjectilePool, PROJECTILE_POOL_SIZE, type ProjectileSpec } from "../ecs/projectile";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createDamageSystem } from "./damage";
import { createProjectileSystem } from "./projectile";

function setup() {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	const events = createEventBuffer(1024);
	const pool = createProjectilePool(world, events);
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
	const system = createProjectileSystem({ pool, queue: damage.queue, enemies: hash, maxEnemyRadius: 1 });
	const enemy = (x: number, z: number): number => {
		const e = spawnBody(world, x, z);
		for (const c of [EnemyFaction, Radius, Health]) addComponent(world, e, c);
		Radius.r[e] = 0.3;
		Health.hp[e] = Health.max[e] = 1000;
		return e;
	};
	const rebuild = (): void => {
		hash.clear();
		for (const e of query(world, [EnemyFaction])) hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
	};
	const shot = (over: Partial<ProjectileSpec> = {}): ProjectileSpec => ({
		x: 0,
		z: 0,
		vx: 28,
		vz: 0,
		damage: 10,
		critChance: 0,
		knockback: 0.5,
		pierce: 0,
		lifeSteps: 120,
		radius: 0.15,
		...over,
	});
	/** Stands in for movementSystem + the per-step order: move, rebuild hash, projectiles, damage. */
	const step = (): void => {
		for (const p of query(world, [Projectile])) {
			if ((Projectile.life[p] ?? 0) === 0) continue;
			Position.x[p] = (Position.x[p] ?? 0) + (Velocity.x[p] ?? 0) / 60;
		}
		rebuild();
		system.run(world);
		damage.run(world);
	};
	return { world, events, pool, enemy, shot, step };
}

test("a pierce 2 projectile crosses 3 enemies in a line, damages each once and disappears", () => {
	const { pool, enemy, shot, step } = setup();
	const a = enemy(3, 0);
	const b = enemy(4, 0);
	const c = enemy(5, 0);
	const d = enemy(6, 0);
	const p = pool.acquire(shot({ pierce: 2 }));
	for (let i = 0; i < 60; i++) step();
	for (const e of [a, b, c]) expect(Health.hp[e]).toBe(990);
	expect(Health.hp[d]).toBe(1000);
	expect(Projectile.life[p]).toBe(0);
	expect(pool.active).toBe(0);
});

test("a pierce 0 pistol shot hits exactly one enemy", () => {
	const { pool, enemy, shot, step } = setup();
	const a = enemy(3, 0);
	const b = enemy(4, 0);
	pool.acquire(shot());
	for (let i = 0; i < 60; i++) step();
	expect(Health.hp[a]).toBe(990);
	expect(Health.hp[b]).toBe(1000);
});

test("a slow piercing projectile never hits the same enemy twice", () => {
	const { pool, enemy, shot, step } = setup();
	const a = enemy(3, 0);
	pool.acquire(shot({ pierce: 5, vx: 0.1, x: 2.7 }));
	for (let i = 0; i < 30; i++) {
		step();
	}
	expect(Health.hp[a]).toBe(990);
});

test("lifetime runs out and the slot returns to the pool", () => {
	const { pool, shot, step } = setup();
	const p = pool.acquire(shot({ lifeSteps: 5 }));
	for (let i = 0; i < 4; i++) step();
	expect(Projectile.life[p]).toBeGreaterThan(0);
	for (let i = 0; i < 3; i++) step();
	expect(Projectile.life[p]).toBe(0);
	expect(pool.active).toBe(0);
});

test("600 simultaneous shots never exceed the pool and extra shots raise PoolExhausted", () => {
	const { pool, events, shot } = setup();
	events.consume(() => {});
	let accepted = 0;
	for (let i = 0; i < 600; i++) {
		if (pool.acquire(shot()) !== -1) accepted++;
		expect(pool.active).toBeLessThanOrEqual(PROJECTILE_POOL_SIZE);
	}
	expect(accepted).toBe(PROJECTILE_POOL_SIZE);
	expect(pool.exhausted).toBe(600 - PROJECTILE_POOL_SIZE);
	let exhaustedEvents = 0;
	events.consume((type) => {
		if (type === EventType.PoolExhausted) exhaustedEvents++;
	});
	expect(exhaustedEvents).toBe(600 - PROJECTILE_POOL_SIZE);
});

test("acquiring never creates entities after the pool exists", () => {
	const { world, pool, shot } = setup();
	const before = query(world, [Projectile]).length;
	for (let i = 0; i < 300; i++) pool.release(pool.acquire(shot()));
	expect(query(world, [Projectile]).length).toBe(before);
});
