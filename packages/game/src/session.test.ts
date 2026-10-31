import { createInputState, createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { roundsData } from "./data";
import { difficultyData } from "./rules/difficulty";
import { createGameSession } from "./session";
import { hashWorld } from "./world/hash";

const difficulty = difficultyData(roundsData.difficulties, "normal");

/** A fixed script: walk in a square for 20 s; no policy, just input. */
function play(seed: number, steps: number): number {
	const session = createGameSession({ seed, difficulty, meta: createMetaState() });
	const input = createInputState();
	session.run.newRun();
	for (let i = 0; i < steps; i++) {
		const leg = Math.floor(i / 120) % 4;
		input.moveX = leg === 0 ? 1 : leg === 2 ? -1 : 0;
		input.moveZ = leg === 1 ? 1 : leg === 3 ? -1 : 0;
		session.step(input);
		session.events.consume(() => undefined);
	}
	return hashWorld(session.world);
}

test("the same seed and the same input give the same world hash through the session", () => {
	expect(play(42, 420)).toBe(play(42, 420));
});

test("another seed, or one more step, changes the world", () => {
	const base = play(42, 420);
	expect(play(43, 420)).not.toBe(base);
	expect(play(42, 421)).not.toBe(base);
});

test("a fresh session starts idle and opens the shop by itself once a round is won", () => {
	const session = createGameSession({ seed: 5, difficulty, meta: createMetaState() });
	expect(session.run.state).toBe("Idle");
	expect(session.fighting()).toBe(false);
	session.run.newRun();
	const input = createInputState();
	let sawShop = false;
	for (let i = 0; i < 60 * 40 && !sawShop; i++) {
		session.step(input);
		session.events.consume(() => undefined);
		// Enemies are cleared by the debug-style kill so the round can end quickly.
		if (session.run.state === "Round") session.run.forceEnd(session.world);
		if (session.run.state === "Shop") sawShop = session.shop.slots.length > 0;
	}
	expect(sawShop).toBe(true);
});
