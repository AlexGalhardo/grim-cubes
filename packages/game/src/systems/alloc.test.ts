import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test, vi } from "vitest";
import { EnemyFaction, PlayerFaction, Radius, Velocity } from "../ecs/components";
import { createGameWorld, spawnBody } from "../ecs/world";
import { BehaviorKind, createBehaviorSystem } from "./behavior";
import { createDamageSystem } from "./damage";
import { createSeparationSystem } from "./separation";
import { createSpawnSystem, type EnemyDef, type SpawnConfig } from "./spawn";

const data = (file: string): unknown =>
	JSON.parse(readFileSync(new URL(`../../../../data/${file}`, import.meta.url), "utf8"));
const spawnConfig = (data("rounds.json") as { spawn: SpawnConfig }).spawn;
const enemies = (data("enemies.json") as EnemyDef[]).map((e) => ({ ...e, armor: 0, behavior: 0 }));

/** Counts the array helpers and constructors that per-step code must not reach once warm. */
function countAllocations(fn: () => void): number {
	const spies = [
		vi.spyOn(Array.prototype, "filter"),
		vi.spyOn(Array.prototype, "map"),
		vi.spyOn(Array.prototype, "join"),
		vi.spyOn(Array.prototype, "slice"),
		vi.spyOn(globalThis, "Array"),
		vi.spyOn(globalThis, "Float32Array"),
		vi.spyOn(globalThis, "Uint16Array"),
		vi.spyOn(globalThis, "Map"),
		vi.spyOn(globalThis, "Set"),
	];
	fn();
	const calls = spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
	for (const spy of spies) spy.mockRestore();
	return calls;
}

function crowd() {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	addComponent(world, hero, Radius);
	Radius.r[hero] = 0.5;
	for (let i = 0; i < 50; i++) {
		const e = spawnBody(world, (i % 10) * 0.4, Math.floor(i / 10) * 0.4);
		for (const c of [EnemyFaction, Radius, Velocity]) addComponent(world, e, c);
		Radius.r[e] = 0.4;
		Velocity.x[e] = 1;
	}
	return { world, hero };
}

test("separationSystem allocates nothing per step once warm", () => {
	const { world } = crowd();
	const system = createSeparationSystem({ weight: 0.6, maxRadius: 1 });
	system.run(world);
	expect(
		countAllocations(() => {
			for (let i = 0; i < 100; i++) system.run(world);
		}),
	).toBe(0);
});

test("behaviorSystem allocates nothing per step once warm", () => {
	const { world, hero } = crowd();
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
		events: { push() {}, consume() {}, size: 0, dropped: 0 },
		hero,
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
	});
	const system = createBehaviorSystem(
		{ zigzag: { amplitude: 1.5, periodSeconds: 0.8 }, contactCooldownSeconds: 0.5 },
		damage.queue,
	);
	void BehaviorKind;
	system.run(world, hero);
	expect(
		countAllocations(() => {
			for (let i = 0; i < 100; i++) system.run(world, hero);
		}),
	).toBe(0);
});

test("spawnSystem allocates nothing per step while waiting between bursts", () => {
	const { world, hero } = crowd();
	const system = createSpawnSystem({ config: spawnConfig, enemies, rng: mulberry32(4) });
	system.startRound(1, { pool: [{ type: 0, weight: 1 }], difficultyMult: 1 });
	system.run(world, hero);
	expect(
		countAllocations(() => {
			for (let i = 0; i < 50; i++) system.run(world, hero);
		}),
	).toBe(0);
});
