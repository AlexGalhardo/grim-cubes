import { createInputState, createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { roundsData } from "../data";
import { Position, PrevPosition } from "../ecs/components";
import { difficultyData } from "../rules/difficulty";
import { createGameSession } from "../session";
import { createBot } from "./bot";

function stuckHero(unstick: boolean): { first: [number, number]; later: [number, number] } {
	const session = createGameSession({
		seed: 3,
		difficulty: difficultyData(roundsData.difficulties, "normal"),
		meta: createMetaState(),
	});
	const bot = createBot(session, "greedy", { unstick });
	const input = createInputState();
	session.run.newRun();
	while (session.run.state !== "Round") session.step(input);
	// One enemy straight ahead and far, and a hero that a wall of props never lets move.
	const spawnX = (Position.x[session.hero] ?? 0) + 30;
	const spawnZ = Position.z[session.hero] ?? 0;
	const enemy = session.spawn.spawnEnemy(session.world, 0, spawnX, spawnZ);
	const x = Position.x[session.hero] ?? 0;
	const z = Position.z[session.hero] ?? 0;
	let first: [number, number] = [0, 0];
	let later: [number, number] = [0, 0];
	for (let step = 0; step < 60; step++) {
		Position.x[session.hero] = x;
		Position.z[session.hero] = z;
		PrevPosition.x[session.hero] = x;
		PrevPosition.z[session.hero] = z;
		Position.x[enemy] = spawnX;
		Position.z[enemy] = spawnZ;
		bot.prepare(input);
		if (step === 1) first = [input.moveX, input.moveZ];
		if (step === 55) later = [input.moveX, input.moveZ];
	}
	return { first, later };
}

test("a bot stuck against a wall sidesteps it, but only when it was told to", () => {
	const off = stuckHero(false);
	expect(off.first[0]).toBeGreaterThan(0.9);
	expect(off.later).toEqual(off.first);
	const on = stuckHero(true);
	expect(on.first[0]).toBeGreaterThan(0.9);
	// Perpendicular to the walk: no longer along x.
	expect(Math.abs(on.later[0])).toBeLessThan(0.1);
	expect(Math.abs(on.later[1])).toBeGreaterThan(0.9);
});
