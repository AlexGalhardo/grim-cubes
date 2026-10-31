import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import {
	ContactDamage,
	Elite,
	EnemyFaction,
	Health,
	PlayerFaction,
	Position,
	Velocity,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import {
	createSpawnSystem,
	type EnemyDef,
	type SpawnConfig,
	spawnBurst,
	spawnIntervalSeconds,
	spawnTotal,
} from "./spawn";

const read = <T>(file: string): T =>
	JSON.parse(readFileSync(new URL(`../../../../data/${file}`, import.meta.url), "utf8")) as T;
const config = read<{ spawn: SpawnConfig }>("rounds.json").spawn;
const enemies: EnemyDef[] = read<Array<Omit<EnemyDef, "armor" | "behavior">>>("enemies.json").map((e) => ({
	...e,
	armor: 0,
	behavior: 0,
}));
const pool = [
	{ type: 0, weight: 6 },
	{ type: 1, weight: 4 },
];

function setup(seed = 1) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	addComponent(world, hero, Velocity);
	const system = createSpawnSystem({ config, enemies, rng: mulberry32(seed) });
	return { world, hero, system };
}

test("round formulas match the SDD", () => {
	expect(spawnTotal(config, 10)).toBe(140);
	expect(spawnIntervalSeconds(config, 10)).toBeCloseTo(1.05);
	expect(spawnIntervalSeconds(config, 100)).toBe(config.intervalMinSeconds);
	expect(spawnBurst(config, 10)).toBe(4);
});

test("round 10 spawns exactly 140 enemies with an idle hero and never exceeds the cap", () => {
	const { world, hero, system } = setup();
	system.startRound(10, { pool, difficultyMult: 1 });
	let peak = 0;
	for (let step = 0; step < 20_000 && (system.remaining > 0 || step < 10); step++) {
		system.run(world, hero);
		const alive = query(world, [EnemyFaction]).length;
		peak = Math.max(peak, alive);
		expect(alive).toBeLessThanOrEqual(config.maxSimultaneous);
	}
	expect(system.spawned).toBe(140);
	expect(system.remaining).toBe(0);
	expect(peak).toBe(config.maxSimultaneous);
});

test("at the cap the next spawn culls the farthest common enemy without drops", () => {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	const events = createEventBuffer(64);
	const system = createSpawnSystem({ config, enemies, rng: mulberry32(3), events });
	const ids: number[] = [];
	for (let i = 0; i < config.maxSimultaneous; i++) {
		const e = spawnBody(world, 5 + i * 0.1, 0);
		addComponent(world, e, EnemyFaction);
		ids.push(e);
	}
	const farthest = ids[ids.length - 1] as number;
	const elite = ids[0] as number;
	Position.x[elite] = 500;
	addComponent(world, elite, Elite);

	system.startRound(1, { pool, difficultyMult: 1 });
	for (let i = 0; i < 400 && system.spawned === 0; i++) system.run(world, hero);

	const alive = query(world, [EnemyFaction]);
	expect(system.spawned).toBeGreaterThan(0);
	expect(alive.length).toBeLessThanOrEqual(config.maxSimultaneous);
	// The recycled id now belongs to the new ring spawn, not to the old enemy at x = 14.9.
	expect(Math.hypot(Position.x[farthest] ?? 0, Position.z[farthest] ?? 0)).toBeGreaterThanOrEqual(
		config.ringMin - 0.01,
	);
	expect(alive).toContain(elite);
	let culls = 0;
	events.consume((type, _a, b, _c, entity) => {
		if (type === EventType.Died && b === 1 && entity === farthest) culls++;
	});
	expect(culls).toBe(1);
});

test("spawns land inside the ring and favour the side opposite to the hero's motion", () => {
	const { world, hero, system } = setup(5);
	Velocity.x[hero] = 6;
	Velocity.z[hero] = 0;
	system.startRound(1, { pool, difficultyMult: 1 });
	for (let i = 0; i < 4000 && system.remaining > 0; i++) system.run(world, hero);
	const alive = query(world, [EnemyFaction]);
	let behind = 0;
	for (const e of alive) {
		const d = Math.hypot(Position.x[e] ?? 0, Position.z[e] ?? 0);
		expect(d).toBeGreaterThanOrEqual(config.ringMin - 0.01);
		expect(d).toBeLessThanOrEqual(config.ringMax + 0.01);
		if ((Position.x[e] ?? 0) < 0) behind++;
	}
	expect(behind / alive.length).toBeGreaterThan(0.6);
});

test("hp and damage scale with round and difficulty", () => {
	const { world, hero, system } = setup();
	system.startRound(5, { pool: [{ type: 0, weight: 1 }], difficultyMult: 1.25 });
	for (let i = 0; i < 200; i++) system.run(world, hero);
	const first = query(world, [EnemyFaction])[0] ?? 0;
	const def = enemies[0] as EnemyDef;
	expect(Health.max[first]).toBeCloseTo((def.hpBase + 4 * def.hpPerRound) * 1.25);
	expect(ContactDamage.value[first]).toBeCloseTo((def.damageBase + 4 * def.damagePerRound) * 1.25);
});

test("an enemy never spawns where isBlocked says a prop stands", () => {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	addComponent(world, hero, Velocity);
	// Half of the ring is blocked, a harsher case than the 8 props a chunk can hold.
	const isBlocked = (x: number): boolean => x < 0;
	const system = createSpawnSystem({ config, enemies, rng: mulberry32(5), isBlocked });
	system.startRound(10, { pool, difficultyMult: 1 });
	for (let step = 0; step < 6_000 && system.remaining > 0; step++) system.run(world, hero);
	expect(system.spawned).toBe(140);
	for (const e of query(world, [EnemyFaction])) expect(Position.x[e] ?? 0).toBeGreaterThanOrEqual(0);
});
