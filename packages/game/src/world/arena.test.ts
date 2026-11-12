import { createInputState, createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { roundsData, worldData } from "../data";
import { Position, Radius } from "../ecs/components";
import { difficultyData } from "../rules/difficulty";
import { createGameSession } from "../session";
import { arenaHalfSize } from "./arena";
import { queryEnemies } from "./queries";

const cfg = worldData.arena;

test("the arena grows by growPerRound from round 1 and stops at maxHalfSize", () => {
	expect(arenaHalfSize(cfg, 1)).toBe(cfg.startHalfSize);
	expect(arenaHalfSize(cfg, 2)).toBe(cfg.startHalfSize + cfg.growPerRound);
	expect(arenaHalfSize(cfg, 20)).toBe(cfg.startHalfSize + 19 * cfg.growPerRound);
	expect(arenaHalfSize(cfg, 5000)).toBe(cfg.maxHalfSize);
	for (let r = 1; r < 200; r++)
		expect(arenaHalfSize(cfg, r + 1)).toBeGreaterThanOrEqual(arenaHalfSize(cfg, r));
});

test("the arena never gets near an origin shift, so relative and absolute coordinates stay the same", () => {
	expect(cfg.maxHalfSize).toBeLessThan(worldData.originShiftThreshold);
});

test("the hero and every enemy stay inside the border while the hero runs into it", () => {
	const session = createGameSession({
		seed: 7,
		difficulty: difficultyData(roundsData.difficulties, "normal"),
		meta: createMetaState(),
		autoShop: true,
	});
	session.run.newRun();
	const heroRadius = Radius.r[session.hero] ?? 0;
	const input = createInputState();
	input.moveX = 1;
	input.moveZ = 1;
	let enemiesSeen = 0;
	let reachedWall = false;
	for (let step = 0; step < 2400; step++) {
		session.step(input);
		const half = session.arena.half;
		expect(Math.abs(Position.x[session.hero] ?? 0)).toBeLessThanOrEqual(half - heroRadius + 1e-4);
		expect(Math.abs(Position.z[session.hero] ?? 0)).toBeLessThanOrEqual(half - heroRadius + 1e-4);
		if ((Position.x[session.hero] ?? 0) >= half - heroRadius - 1e-3) reachedWall = true;
		for (const e of queryEnemies(session.world)) {
			enemiesSeen++;
			const limit = half - (Radius.r[e] ?? 0) + 1e-4;
			expect(Math.abs(Position.x[e] ?? 0), `enemy ${e}`).toBeLessThanOrEqual(limit);
			expect(Math.abs(Position.z[e] ?? 0), `enemy ${e}`).toBeLessThanOrEqual(limit);
		}
		session.events.consume(() => undefined);
		if (session.levelUp.offer) session.levelUp.choose(0);
	}
	expect(reachedWall).toBe(true);
	expect(enemiesSeen).toBeGreaterThan(0);
});
