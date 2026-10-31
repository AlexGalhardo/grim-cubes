import { mulberry32 } from "@gc/core";
import { addComponent, query, removeEntity } from "bitecs";
import { expect, test } from "vitest";
import {
	EnemyFaction,
	EnemyType,
	Fragment,
	Health,
	PlayerFaction,
	Position,
	Radius,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { dropFragment } from "../ecs/fragments";
import { createGameWorld, spawnBody } from "../ecs/world";
import {
	dropChance,
	type FragmentsConfig,
	harvestCount,
	type XpConfig,
	xpForLevel,
} from "../rules/fragments";
import { applyHarvest, createDeathSystem, createPickupSystem, createProgress } from "./loot";

const fragments: FragmentsConfig = {
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
const xp: XpConfig = { base: 10, perLevel: 8 };

function dyingEnemy(world: ReturnType<typeof createGameWorld>, x: number, z: number, type = 0): number {
	const e = spawnBody(world, x, z);
	for (const c of [EnemyFaction, Health, EnemyType]) addComponent(world, e, c);
	Health.hp[e] = 0;
	EnemyType.id[e] = type;
	return e;
}

function heroAt(world: ReturnType<typeof createGameWorld>): number {
	const h = spawnBody(world, 0, 0);
	addComponent(world, h, PlayerFaction);
	addComponent(world, h, Radius);
	Radius.r[h] = 0.45;
	return h;
}

test("drop chance: 100% through round 4, 85% at round 10, floor 50%", () => {
	expect(dropChance(fragments, 4)).toBe(1);
	expect(dropChance(fragments, 10)).toBeCloseTo(0.85);
	expect(dropChance(fragments, 100)).toBe(0.5);
});

test("round 10 drops piles for 85% of 10,000 kills (+-1%)", () => {
	const world = createGameWorld();
	const system = createDeathSystem({
		fragments: { ...fragments, groundPileCap: 1_000_000 },
		fragmentsPerType: [1],
		rng: mulberry32(11),
		round: () => 10,
	});
	let drops = 0;
	for (let batch = 0; batch < 10; batch++) {
		for (let i = 0; i < 1000; i++) dyingEnemy(world, i, 0);
		system.run(world);
		const piles = [...query(world, [Fragment])];
		drops += piles.length;
		for (const p of piles) removeEntity(world, p);
	}
	expect(Math.abs(drops / 10_000 - 0.85)).toBeLessThan(0.01);
});

test("drops use the type's fragment count and dead enemies are recycled", () => {
	const world = createGameWorld();
	const system = createDeathSystem({
		fragments,
		fragmentsPerType: [1, 3],
		rng: mulberry32(1),
		round: () => 1,
	});
	const e = dyingEnemy(world, 4, 5, 1);
	system.run(world);
	expect(query(world, [EnemyFaction]).includes(e)).toBe(false);
	const [pile] = [...query(world, [Fragment])];
	expect(Fragment.value[pile as number]).toBe(3);
	expect(Position.x[pile as number]).toBe(4);
});

test("60 drops on the floor become 50 piles with the value conserved", () => {
	const world = createGameWorld();
	const system = createDeathSystem({
		fragments,
		fragmentsPerType: [2],
		rng: mulberry32(2),
		round: () => 1,
	});
	for (let i = 0; i < 60; i++) dyingEnemy(world, i, 0);
	system.run(world);
	const piles = [...query(world, [Fragment])];
	expect(piles.length).toBe(50);
	expect(piles.reduce((sum, p) => sum + (Fragment.value[p] ?? 0), 0)).toBe(120);
});

test("pickup magnetises piles inside the radius and credits gold and XP on arrival", () => {
	const world = createGameWorld();
	const hero = heroAt(world);
	const near = dropFragment(world, 2, 0, 3);
	const far = dropFragment(world, 20, 0, 5);
	const progress = createProgress();
	const system = createPickupSystem({ fragments, xp, progress, stats: { pickupRadius: 2.5, xpGain: 0 } });

	system.run(world, hero);
	expect(Position.x[near]).toBeLessThan(2);
	expect(Position.x[far]).toBe(20);
	for (let i = 0; i < 30; i++) system.run(world, hero);
	expect(progress.gold).toBe(3);
	expect(progress.xp).toBe(3);
	expect(query(world, [Fragment]).includes(near)).toBe(false);
	expect(query(world, [Fragment]).includes(far)).toBe(true);
});

test("pickup announces the piles it collected once per step", () => {
	const world = createGameWorld();
	const hero = heroAt(world);
	dropFragment(world, 0.1, 0, 1);
	dropFragment(world, 0.2, 0, 1);
	const events = createEventBuffer(16);
	const seen: number[][] = [];
	const system = createPickupSystem({
		fragments,
		xp,
		progress: createProgress(),
		stats: { pickupRadius: 2.5, xpGain: 0 },
		events,
	});
	system.run(world, hero);
	system.run(world, hero);
	events.consume((type, a, _b, _c, entity) => seen.push([type, a, entity]));
	expect(seen).toEqual([[EventType.FragmentPicked, 2, hero]]);
});

test("xp curve levels up with carry-over and the xp gain multiplier", () => {
	expect(xpForLevel(xp, 2)).toBe(18);
	const world = createGameWorld();
	const hero = heroAt(world);
	for (let i = 0; i < 12; i++) dropFragment(world, 0.1, 0, 1);
	const progress = createProgress();
	createPickupSystem({ fragments, xp, progress, stats: { pickupRadius: 2.5, xpGain: 0.5 } }).run(
		world,
		hero,
	);
	expect(progress.level).toBe(2);
	expect(progress.pendingLevelUps).toBe(1);
	expect(progress.xp).toBeCloseTo(12 * 1.5 - 10);
});

test("harvest 4 at round 5 gives ceil(4 x 1.25) = 5 extra fragments", () => {
	expect(harvestCount(fragments, 5, 4)).toBe(5);
	expect(harvestCount(fragments, 5, 0)).toBe(0);
	const progress = createProgress();
	expect(applyHarvest(progress, fragments, xp, 5, 4)).toBe(5);
	expect(progress.gold).toBe(5);
	expect(progress.xp).toBe(5);
});
