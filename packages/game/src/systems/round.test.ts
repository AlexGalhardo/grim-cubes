import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent, query } from "bitecs";
import { expect, test } from "vitest";
import { EnemyFaction, Fragment, PlayerFaction, Position } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { dropFragment } from "../ecs/fragments";
import { createGameWorld, spawnBody } from "../ecs/world";
import { STEP } from "../loop";
import { createRunSystem, isBossRound, type RunConfig, roundDurationSeconds } from "./round";
import { createSpawnSystem, type EnemyDef, type SpawnConfig } from "./spawn";

const rounds = JSON.parse(readFileSync(new URL("../../../../data/rounds.json", import.meta.url), "utf8")) as {
	flow: RunConfig["flow"];
	duration: RunConfig["duration"];
	boss: RunConfig["boss"];
	spawn: SpawnConfig;
};
const runConfig: RunConfig = { flow: rounds.flow, duration: rounds.duration, boss: rounds.boss };
const enemies = (
	JSON.parse(readFileSync(new URL("../../../../data/enemies.json", import.meta.url), "utf8")) as EnemyDef[]
).map((e) => ({ ...e, armor: 0, behavior: 0 }));

function setup(autoShop = true) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	const events = createEventBuffer(8192);
	const holder: { run?: ReturnType<typeof createRunSystem> } = {};
	const spawn = createSpawnSystem({
		config: rounds.spawn,
		enemies,
		rng: mulberry32(9),
		onSpawn: (w, x, z) => holder.run?.releaseFromBag(w, x, z),
	});
	const run = createRunSystem({
		config: runConfig,
		spawn,
		events,
		poolFor: () => [{ type: 0, weight: 1 }],
		difficultyMult: 1,
		autoShop: () => autoShop,
	});
	holder.run = run;
	const step = (): void => run.run(world, hero);
	const until = (state: string, limit = 100_000): number => {
		let n = 0;
		while (run.state !== state && n++ < limit) step();
		return n;
	};
	return { world, hero, events, spawn, run, step, until };
}

test("round durations 1-12 follow the GDD ramp, bosses have no timer", () => {
	const seconds = Array.from({ length: 12 }, (_, i) =>
		isBossRound(runConfig, i + 1) ? null : roundDurationSeconds(runConfig, i + 1),
	);
	expect(seconds).toEqual([20, 25, 30, 35, 40, 45, 50, 55, 60, null, 60, 60]);
	const { run, step, until } = setup();
	run.newRun();
	until("Round");
	expect(run.ticksLeft).toBe(20 / STEP);
	step();
	expect(run.ticksLeft).toBe(20 / STEP - 1);
});

test("run flows intro -> round -> outro -> shop -> next intro", () => {
	const { run, step, until } = setup();
	expect(run.state).toBe("Idle");
	run.newRun();
	expect(run.state).toBe("RoundIntro");
	expect(until("Round")).toBe(2 / STEP);
	expect(until("RoundOutro")).toBe(20 / STEP);
	expect(until("Shop")).toBe(1 / STEP);
	step();
	expect(run.state).toBe("Shop");
	run.closeShop();
	expect(run.round).toBe(2);
	expect(run.state).toBe("RoundIntro");
});

test("round end purges enemies without drops and conserves fragments through the bag", () => {
	const { world, events, run, step, until } = setup();
	run.newRun();
	until("Round");
	for (let i = 0; i < 300; i++) step();
	expect(query(world, [EnemyFaction]).length).toBeGreaterThan(0);
	for (const v of [1, 2, 3, 4]) dropFragment(world, v, 0, v);
	events.consume(() => {});

	until("RoundOutro");
	expect(query(world, [EnemyFaction]).length).toBe(0);
	expect(query(world, [Fragment]).length).toBe(0);
	expect(run.bag.value).toBe(10);
	let purged = 0;
	events.consume((type, _a, b) => {
		if (type === EventType.Died && b === 1) purged++;
	});
	expect(purged).toBeGreaterThan(0);

	until("Shop");
	run.closeShop();
	until("Round");
	for (let i = 0; i < 400; i++) step();
	let floor = 0;
	for (const e of query(world, [Fragment])) floor += Fragment.value[e] ?? 0;
	expect(floor + run.bag.value).toBe(10);
	expect(floor).toBeGreaterThan(0);
});

test("boss round has no timer, spawns 30% of the horde and ends on bossDied", () => {
	const { run, spawn, step, until } = setup();
	run.newRun();
	for (let r = 1; r < 10; r++) {
		until("Shop");
		run.closeShop();
	}
	expect(run.round).toBe(10);
	expect(run.state).toBe("BossIntro");
	expect(until("BossRound")).toBe(3 / STEP);
	for (let i = 0; i < 4000; i++) step();
	expect(run.state).toBe("BossRound");
	expect(spawn.spawned).toBe(Math.round(140 * rounds.boss.remainingHordeFraction));
	run.bossDied();
	step();
	expect(run.state).toBe("RoundOutro");
});

test("pause freezes the timer; hero death goes Dying -> Results -> new run", () => {
	const { run, step, until } = setup();
	run.newRun();
	until("Round");
	const left = run.ticksLeft;
	run.pause();
	for (let i = 0; i < 100; i++) step();
	expect(run.state).toBe("Paused");
	expect(run.ticksLeft).toBe(left);
	run.resume();
	expect(run.state).toBe("Round");

	run.heroDied();
	expect(run.state).toBe("Dying");
	expect(until("Results")).toBe(1.5 / STEP);
	run.newRun();
	expect(run.round).toBe(1);
	expect(run.state).toBe("RoundIntro");
});

test("without autoShop the outro leads to MerchantWait, the shop opens on enterShop or after the wait", () => {
	const walk = setup(false);
	walk.run.newRun();
	walk.until("RoundOutro");
	expect(walk.until("MerchantWait")).toBe(1 / STEP);
	expect(walk.run.ticksLeft).toBe(rounds.flow.merchantWaitSeconds / STEP);
	walk.run.enterShop();
	expect(walk.run.state).toBe("Shop");
	walk.run.closeShop();
	expect(walk.run.state).toBe("RoundIntro");
	walk.run.enterShop();
	expect(walk.run.state).toBe("RoundIntro");

	const idle = setup(false);
	idle.run.newRun();
	idle.until("MerchantWait");
	expect(idle.until("Shop")).toBe(rounds.flow.merchantWaitSeconds / STEP);
});

test("the round end remembers where the enemies were on average", () => {
	const { world, run, step, until } = setup(false);
	run.newRun();
	until("Round");
	for (let i = 0; i < 300; i++) step();
	const live = [...query(world, [EnemyFaction])];
	let x = 0;
	let z = 0;
	for (const e of live) {
		x += Position.x[e] ?? 0;
		z += Position.z[e] ?? 0;
	}
	run.forceEnd(world);
	expect(run.lastEnemies.count).toBe(live.length);
	expect(run.lastEnemies.x).toBeCloseTo(x / live.length);
	expect(run.lastEnemies.z).toBeCloseTo(z / live.length);
});
