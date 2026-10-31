import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { cardsData, heroData } from "../data";
import { Health, Speed } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { spawnHero } from "../ecs/hero";
import { createGameWorld } from "../ecs/world";
import { drawCards } from "../rules/cards";
import { xpForLevel } from "../rules/fragments";
import { computeStats, createPlayerStats, STAT_FIELDS } from "../rules/stats";
import { createLevelUpSystem } from "./levelup";
import { addFragmentValue, createProgress } from "./loot";
import type { RunSystem } from "./round";
import { createStatsSystem } from "./stats";

const fragments = { goldPerFragment: 1, xpPerFragment: 1 } as Parameters<typeof addFragmentValue>[1];
const xp = { base: 10, perLevel: 8 };

function fakeRun(): RunSystem & { state: string } {
	const run = {
		state: "Round",
		pause() {
			run.state = "Paused";
		},
		resume() {
			run.state = "Round";
		},
	};
	return run as unknown as RunSystem & { state: string };
}

function setup() {
	const world = createGameWorld();
	const hero = spawnHero(world, { speed: 6, maxHp: 100, radius: 0.45 });
	const stats = createStatsSystem(heroData, createPlayerStats());
	const progress = createProgress();
	const run = fakeRun();
	const events = createEventBuffer(64);
	const levelUp = createLevelUpSystem({
		progress,
		run,
		cards: cardsData,
		rng: mulberry32(5),
		stats,
		events,
	});
	return { world, hero, stats, progress, run, events, levelUp };
}

test("xp needed for level 10 is 82", () => {
	expect(xpForLevel(xp, 10)).toBe(82);
});

test("an offer has 3 distinct cards", () => {
	const rng = mulberry32(1);
	for (let i = 0; i < 200; i++) {
		const offer = drawCards(rng, cardsData, 1);
		expect(offer).toHaveLength(3);
		expect(new Set(offer.map((c) => c.id)).size).toBe(3);
		expect(offer.every((c) => !c.double)).toBe(true);
	}
});

test("double cards appear from level 10 at about 10% and merge two bonuses at half value", () => {
	const rng = mulberry32(2);
	let doubles = 0;
	let total = 0;
	for (let i = 0; i < 2000; i++) {
		for (const card of drawCards(rng, cardsData, 10)) {
			total++;
			if (card.double) {
				doubles++;
				expect(card.modifiers).toHaveLength(2);
				expect(card.id.split("+")).toHaveLength(2);
			}
		}
	}
	expect(doubles / total).toBeGreaterThan(0.07);
	expect(doubles / total).toBeLessThan(0.13);
});

test("leveling up pauses the run, choosing a card applies the stat, marks dirty and resumes", () => {
	const { world, hero, stats, progress, run, events, levelUp } = setup();
	void world;
	addFragmentValue(progress, fragments, xp, 10);
	expect(progress.pendingLevelUps).toBe(1);

	levelUp.run();
	expect(run.state).toBe("Paused");
	expect(levelUp.offer).toHaveLength(3);
	let seen = 0;
	events.consume((type) => {
		if (type === EventType.LevelUp) seen++;
	});
	expect(seen).toBe(1);

	const picked = [...(levelUp.offer ?? [])][0];
	expect(picked).toBeDefined();
	expect(levelUp.choose(0)).toBe(true);
	expect(stats.stats.dirty).toBe(true);
	expect(run.state).toBe("Round");
	expect(levelUp.offer).toBeNull();

	stats.run(hero);
	expect(stats.stats.dirty).toBe(false);
	const expected = createPlayerStats();
	computeStats(heroData, picked?.modifiers ?? [], expected);
	expect(stats.stats).toEqual({ ...expected, dirty: false });
});

test("several pending level-ups come back to back and out of range indices are refused", () => {
	const { progress, run, levelUp } = setup();
	progress.pendingLevelUps = 2;
	progress.level = 3;
	levelUp.run();
	expect(levelUp.choose(7)).toBe(false);
	expect(levelUp.choose(1)).toBe(true);
	expect(run.state).toBe("Paused");
	expect(levelUp.offer).toHaveLength(3);
	expect(levelUp.choose(2)).toBe(true);
	expect(run.state).toBe("Round");
});

test("max HP cards raise max and heal by the gain; speed cards scale the base speed", () => {
	const { hero, stats } = setup();
	stats.add([
		{ stat: "max_hp", op: "add", value: 5 },
		{ stat: "speed", op: "add", value: 0.1 },
	]);
	Health.hp[hero] = 50;
	stats.run(hero);
	expect(Health.max[hero]).toBe(105);
	expect(Health.hp[hero]).toBe(55);
	expect(Speed.value[hero]).toBeCloseTo(6.6);
});

test("computeStats applies add, then mul, then caps", () => {
	const out = createPlayerStats();
	computeStats(
		heroData,
		[
			{ stat: "armor", op: "add", value: 3 },
			{ stat: "armor", op: "mul", value: 2 },
			{ stat: "dodge", op: "add", value: 5 },
			{ stat: "max_hp", op: "mul", value: 0.7 },
		],
		out,
	);
	expect(out.armor).toBe(6);
	expect(out.dodge).toBe(heroData.caps.dodge);
	expect(out.maxHp).toBeCloseTo(70);
});

test("pickup range modifiers are percentages of the base radius", () => {
	const out = createPlayerStats();
	computeStats(heroData, [{ stat: "pickup_range", op: "add", value: 0.25 }], out);
	expect(out.pickupRadius).toBeCloseTo(heroData.base.pickupRadius * 1.25);
	expect(out.pickupRadius).toBeCloseTo(3.125);
});

test("an unknown stat in a modifier throws instead of being dropped", () => {
	expect(() =>
		computeStats(heroData, [{ stat: "nope", op: "add", value: 1 }], createPlayerStats()),
	).toThrow(RangeError);
});

test("every stat in the schema enum maps to a player stat field", async () => {
	const { readFileSync } = await import("node:fs");
	const schema = JSON.parse(
		readFileSync(new URL("../../../../data/schema/common.schema.json", import.meta.url), "utf8"),
	) as {
		$defs: { stat: { enum: string[] } };
	};
	for (const stat of schema.$defs.stat.enum) expect(STAT_FIELDS[stat], stat).toBeDefined();
	for (const stat of Object.keys(STAT_FIELDS)) expect(schema.$defs.stat.enum).toContain(stat);
});

test("speed bonuses are capped at x2 and floored at x0.5", () => {
	const fast = createPlayerStats();
	computeStats(heroData, [{ stat: "speed", op: "add", value: 1.5 }], fast);
	expect(fast.speed).toBeCloseTo(heroData.base.speed * 2);
	const slow = createPlayerStats();
	computeStats(heroData, [{ stat: "speed", op: "add", value: -0.8 }], slow);
	expect(slow.speed).toBeCloseTo(heroData.base.speed * 0.5);
});
