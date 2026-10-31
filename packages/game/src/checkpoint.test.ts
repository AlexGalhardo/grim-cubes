import {
	createInputState,
	createMetaState,
	parseSave,
	RNG_STREAMS,
	type RunCheckpoint,
	serializeSave,
} from "@gc/core";
import { query } from "bitecs";
import { expect, test } from "vitest";
import { captureCheckpoint, restoreCheckpoint } from "./checkpoint";
import { roundsData } from "./data";
import { EnemyFaction, Health } from "./ecs/components";
import { difficultyData } from "./rules/difficulty";
import { createGameSession, type GameSession } from "./session";
import { hashWorld } from "./world/hash";

const difficulty = difficultyData(roundsData.difficulties, "normal");
const identity = { seed: 42, difficulty: "normal" as const };

/** The same walk for both runs, as a function of the step since the checkpoint. */
function playOn(session: GameSession, target: number): void {
	for (let step = 0; step < 200_000; step++) {
		if (session.run.state === "Shop") {
			for (let i = 0; i < 6; i++) session.shop.buy(i);
			session.run.closeShop();
		}
		if (session.run.round === target && session.run.state.endsWith("Intro")) return;
		walk(session, step);
		Health.hp[session.hero] = Health.max[session.hero] ?? 1;
	}
	throw new Error(`never reached round ${target}`);
}

function walk(session: GameSession, step: number): void {
	if (session.levelUp.offer) session.levelUp.choose(0);
	const input = createInputState();
	const leg = Math.floor(step / 90) % 4;
	input.moveX = leg === 0 ? 1 : leg === 2 ? -1 : 0;
	input.moveZ = leg === 1 ? 1 : leg === 3 ? -1 : 0;
	session.step(input);
	session.events.consume(() => undefined);
}

/** Starts a run and plays until round `target` is about to start: fights, buys what it can, leaves the shop. */
function playUntilIntroOf(session: GameSession, target: number): void {
	session.run.newRun();
	playOn(session, target);
}

const fresh = (autoShop: boolean): GameSession =>
	createGameSession({ seed: identity.seed, difficulty, meta: createMetaState(), autoShop });

function summary(session: GameSession): unknown {
	return {
		round: session.run.round,
		gold: session.progress.gold,
		xp: session.progress.xp,
		level: session.progress.level,
		hp: Health.hp[session.hero],
		kills: session.runStats.kills,
		owned: [...session.owned],
		weapon: [session.weapon.weapon.id, session.weapon.tier],
		bag: session.run.bag.value,
	};
}

/** The checkpoint as the game stores and reads it. */
async function throughTheSave(session: GameSession): Promise<RunCheckpoint> {
	const meta = createMetaState();
	meta.run = captureCheckpoint(session, identity);
	const stored = (await parseSave(await serializeSave(meta, "0.0.0"))).run;
	if (!stored) throw new Error("the checkpoint did not survive the save");
	return stored;
}

test("resuming is a pure function of the checkpoint: same save, same inputs, same world hash", async () => {
	const live = fresh(true);
	playUntilIntroOf(live, 3);
	expect(live.owned.size + live.weapon.tier).toBeGreaterThan(0);
	const checkpoint = await throughTheSave(live);

	const a = fresh(true);
	const b = fresh(true);
	restoreCheckpoint(a, checkpoint);
	restoreCheckpoint(b, structuredClone(checkpoint));
	expect(summary(a)).toEqual(summary(live));
	expect(a.run.state).toBe(live.run.state);
	for (let step = 0; step < 900; step++) {
		walk(a, step);
		walk(b, step);
		if (step % 150 === 149) expect(hashWorld(a.world), `step ${step}`).toBe(hashWorld(b.world));
	}
	expect(summary(a)).toEqual(summary(b));
	expect(hashWorld(a.world)).toBe(hashWorld(b.world));
	expect(hashWorld(a.world)).not.toBe(hashWorld(fresh(true).world));
});

test("a run interrupted at round N+1 and resumed reaches N+2 with the state of the run that never stopped", async () => {
	const start = fresh(true);
	playUntilIntroOf(start, 2);
	const checkpoint = await throughTheSave(start);

	// Continuous: from the checkpoint straight through round 2 and its shop to the start of round 3.
	const continuous = fresh(true);
	restoreCheckpoint(continuous, checkpoint);
	playOn(continuous, 3);
	const atRound3 = await throughTheSave(continuous);

	// Interrupted: the same, but the game is closed and reopened at the start of round 3.
	const reopened = fresh(true);
	restoreCheckpoint(reopened, atRound3);
	expect(summary(reopened)).toEqual(summary(continuous));
	for (const name of RNG_STREAMS)
		expect(reopened.rng[name].state(), name).toBe(continuous.rng[name].state());
	expect(Health.hp[reopened.hero]).toBe(Health.hp[continuous.hero]);
});

test("the resumed run draws the same random numbers as the original would have", () => {
	const live = fresh(true);
	playUntilIntroOf(live, 2);
	const resumed = fresh(true);
	restoreCheckpoint(resumed, captureCheckpoint(live, identity));
	for (const name of [
		"spawn",
		"shop",
		"loot",
		"cards",
		"elite",
		"weapon",
		"dodge",
		"world",
		"combat",
		"effects",
	] as const) {
		expect(resumed.rng[name].next(), name).toBe(live.rng[name].next());
	}
});

test("a checkpoint holds no enemies and the round restarts clean", () => {
	const live = fresh(true);
	playUntilIntroOf(live, 4);
	const resumed = fresh(true);
	restoreCheckpoint(resumed, captureCheckpoint(live, identity));
	expect(resumed.run.round).toBe(4);
	expect(resumed.run.state).toMatch(/Intro$/);
	expect(query(resumed.world, [EnemyFaction])).toHaveLength(0);
});

test("an unknown weapon in the save is refused instead of starting a broken run", () => {
	const live = fresh(true);
	playUntilIntroOf(live, 2);
	const cp = captureCheckpoint(live, identity);
	cp.weapon.id = "no_such_weapon";
	expect(() => restoreCheckpoint(fresh(true), cp)).toThrow("unknown weapon");
});
