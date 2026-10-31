import { readFileSync } from "node:fs";
import { createSpatialHash, mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import {
	Boss,
	EnemyFaction,
	Health,
	Knockback,
	PlayerFaction,
	Position,
	Projectile,
	Radius,
	Velocity,
} from "../ecs/components";
import { createEventBuffer } from "../ecs/events";
import { createProjectilePool } from "../ecs/projectile";
import { createGameWorld, type GameWorld, spawnBody } from "../ecs/world";
import { createDamageSystem } from "./damage";
import { createTargetingSystem } from "./targeting";
import { createWeaponSystem, type WeaponDef, type WeaponStats } from "./weapon";

const weapons = JSON.parse(
	readFileSync(new URL("../../../../data/weapons.json", import.meta.url), "utf8"),
) as Array<WeaponDef & { id: string }>;
const hero = JSON.parse(readFileSync(new URL("../../../../data/hero.json", import.meta.url), "utf8")) as {
	caps: { attackSpeedPerSecond: number };
	combat: { targetPriorityDistanceMult: number };
};
const def = (id: string): WeaponDef => weapons.find((w) => w.id === id) as WeaponDef;

function setup(id: string, tier = 0, stats: Partial<WeaponStats> = {}) {
	const world = createGameWorld();
	const h = spawnBody(world, 0, 0);
	addComponent(world, h, PlayerFaction);
	const hash = createSpatialHash();
	const events = createEventBuffer(256);
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
		hero: h,
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
	});
	const pool = createProjectilePool(world, events);
	const targeting = createTargetingSystem(
		{ priorityDistanceMult: hero.combat.targetPriorityDistanceMult, retargetEvery: 3 },
		hash,
	);
	const full: WeaponStats = { damage: 0, attackSpeed: 0, critChance: 0.05, range: 0, ...stats };
	const weapon = createWeaponSystem({
		weapon: def(id),
		tier,
		stats: full,
		attackSpeedCap: hero.caps.attackSpeedPerSecond,
		queue: damage.queue,
		events,
		targeting,
		enemies: hash,
		rng: mulberry32(3),
		projectiles: pool,
	});
	const add = (x: number, z: number): number => {
		const e = spawnBody(world, x, z);
		for (const c of [EnemyFaction, Radius, Health]) addComponent(world, e, c);
		Radius.r[e] = 0.3;
		Health.hp[e] = Health.max[e] = 100;
		hash.insert(e, x, z);
		return e;
	};
	const tick = (): void => {
		targeting.run(world, h, weapon.range);
		weapon.run(world, h);
	};
	return { world, h, hash, damage, targeting, weapon, add, tick, pool, events };
}

test("sword hits the 3 enemies inside the 120 degree arc and skips the one behind", () => {
	const { add, tick, damage } = setup("sword");
	add(1.2, 0);
	add(1.5, 0.9);
	add(1.0, -1.2);
	add(-2, 0);
	tick();
	expect(damage.queue.size).toBe(3);
});

test("pistol with attacksPerSecond 2 fires 120 times in 60 simulated seconds", () => {
	const { add, tick, weapon } = setup("pistol");
	add(8, 0);
	for (let i = 0; i < 3600; i++) tick();
	expect(Math.abs(weapon.attacks - 120)).toBeLessThanOrEqual(1);
});

test("pistol projectile carries speed, pierce 0, range-based life and the crit bonus", () => {
	const { world, add, tick } = setup("pistol", 0, { damage: 0.1 });
	add(6, 0);
	tick();
	const found = query(world, [Projectile]).find((e) => (Projectile.life[e] ?? 0) > 0) ?? -1;
	expect(found).toBeGreaterThan(0);
	expect(Velocity.x[found]).toBeCloseTo(28);
	expect(Velocity.z[found]).toBeCloseTo(0);
	expect(Projectile.pierce[found]).toBe(0);
	expect(Projectile.life[found]).toBe(Math.ceil(12 / 28 / (1 / 60)));
	expect(Projectile.critChance[found]).toBeCloseTo(0.05 + 0.15);
	expect(Projectile.damage[found]).toBeCloseTo(10 * 1.1);
});

test("tier and stats scale damage, range and attack speed", () => {
	const { add, tick, damage, weapon } = setup("sword", 1, { damage: 0.2 });
	expect(weapon.range).toBeCloseTo(2.5 + 0.5);
	add(1, 0);
	tick();
	expect(damage.queue.size).toBe(1);
});

test("targeting picks the nearest, prefers bosses by the distance multiplier, and re-picks on death", () => {
	const { world, h, add, targeting, hash } = setup("sword");
	const common = add(1.0, 0);
	const boss = add(0, 1.2);
	addComponent(world, boss, Boss);
	targeting.run(world as GameWorld, h, 5);
	expect(targeting.target).toBe(boss);
	Health.hp[boss] = 0;
	for (let i = 0; i < 3; i++) targeting.run(world, h, 5);
	expect(targeting.target).toBe(common);
	void hash;
	void Position;
});

test("fractional cooldown keeps an 8 per second weapon at exactly 480 shots in 60 s", () => {
	const base = def("pistol");
	weapons.push({ ...base, id: "rapid", attacksPerSecond: 8 });
	const { add, tick, weapon } = setup("rapid");
	add(8, 0);
	for (let i = 0; i < 3600; i++) tick();
	expect(weapon.attacks).toBe(480);
});

test("melee knockback is radial per enemy, not along the target direction", () => {
	const { world, add, tick, damage } = setup("sword");
	const front = add(1.2, 0);
	const side = add(1.0, 1.0);
	tick();
	damage.run(world);
	expect(Knockback.x[front]).toBeGreaterThan(0);
	expect(Math.abs(Knockback.z[front] ?? 0)).toBeLessThan(1e-6);
	expect(Knockback.z[side]).toBeCloseTo(Knockback.x[side] ?? 0, 3);
	expect(Knockback.z[side]).toBeGreaterThan(0.5);
});

test("T4 sword deals 3.2x damage with the data tiers", () => {
	const { world, add, tick, damage, weapon } = setup("sword", 3, { critChance: 0 });
	expect(weapon.tier).toBe(3);
	const e = add(1.2, 0);
	tick();
	damage.run(world);
	expect(Health.hp[e]).toBeCloseTo(100 - 12 * 3.2, 3);
});

test("upgrade climbs the tiers up to the maximum and swapping weapons resets the tier", () => {
	const { weapon } = setup("sword");
	expect(weapon.maxTier).toBe(3);
	expect([weapon.upgrade(), weapon.upgrade(), weapon.upgrade(), weapon.upgrade()]).toEqual([
		true,
		true,
		true,
		false,
	]);
	expect(weapon.tier).toBe(3);
	weapon.setWeapon(def("pistol"));
	expect(weapon.tier).toBe(0);
	expect(weapon.weapon.kind).toBe("single_shot");
});

test("smg fires exactly 8 per second inside its spread and gets the close-range bonus", () => {
	const { world, add, tick, weapon } = setup("smg");
	add(3, 0);
	let maxAngle = 0;
	let close = 0;
	for (let i = 0; i < 3600; i++) {
		tick();
		for (const p of query(world, [Projectile])) {
			if ((Projectile.life[p] ?? 0) <= 0 || Position.x[p] !== 0) continue;
			maxAngle = Math.max(maxAngle, Math.abs(Math.atan2(Velocity.z[p] ?? 0, Velocity.x[p] ?? 1)));
			close = Projectile.damage[p] ?? 0;
			Projectile.life[p] = 0;
		}
	}
	expect(weapon.attacks).toBe(480);
	expect(maxAngle).toBeLessThanOrEqual((3 * Math.PI) / 180 + 1e-6);
	expect(maxAngle).toBeGreaterThan(0.02);
	expect(close).toBeCloseTo(4 * 1.3);
});

test("smg beyond the close-range distance deals base damage", () => {
	const { world, add, tick } = setup("smg");
	add(8, 0);
	tick();
	const fired = query(world, [Projectile]).find((e) => (Projectile.life[e] ?? 0) > 0) ?? -1;
	expect(Projectile.damage[fired]).toBeCloseTo(4);
});

test("mg slows the hero while firing and recovers shortly after", () => {
	const { add, tick, weapon, hash, h } = setup("mg");
	void hash;
	void h;
	expect(weapon.speedMultiplier).toBe(1);
	const e = add(8, 0);
	tick();
	expect(weapon.speedMultiplier).toBeCloseTo(0.8);
	Health.hp[e] = 0;
	for (let i = 0; i < 8; i++) tick();
	expect(weapon.speedMultiplier).toBe(1);
});

test("bazooka shells carry the explosion radius from the data", () => {
	const { world, add, tick } = setup("bazooka", 0, { explosionSize: 0.5 });
	add(8, 0);
	tick();
	const p = query(world, [Projectile]).find((e) => (Projectile.life[e] ?? 0) > 0) ?? -1;
	expect(Projectile.explosionRadius[p]).toBeCloseTo(3 * 1.5);
	expect(Projectile.selfFraction[p]).toBe(0.5);
	expect(Projectile.damage[p]).toBeCloseTo(45);
});
