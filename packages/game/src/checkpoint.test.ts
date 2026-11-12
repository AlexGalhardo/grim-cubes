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

const fresh = (): GameSession =>
	createGameSession({ seed: identity.seed, difficulty, meta: createMetaState() });

function summary(session: GameSession): unknown {
	return {
		round: session.run.round,
		gold: session.progress.gold,
		xp: session.progress.xp,
		level: session.progress.level,
		hp: Health.hp[session.hero],
		kills: session.runStats.kills,
		owned: [...session.owned],
		equipment: [...session.shop.levels],
		materials: [session.progress.eliteFragments, session.progress.relics],
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
	const live = fresh();
	playUntilIntroOf(live, 3);
	expect(live.shop.levels.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
	live.progress.eliteFragments = 5;
	live.progress.relics = 2;
	const checkpoint = await throughTheSave(live);

	// Component arrays are module-global and entity ids repeat across worlds, so two live sessions would step on each
	// other's bodies: replay one after the other and compare the recorded hashes.
	const replay = (cp: RunCheckpoint): { hashes: number[]; end: unknown } => {
		const session = fresh();
		restoreCheckpoint(session, cp);
		if (cp === checkpoint) {
			expect(summary(session)).toEqual(summary(live));
			expect(session.run.state).toBe(live.run.state);
		}
		const hashes: number[] = [];
		for (let step = 0; step < 900; step++) {
			walk(session, step);
			if (step % 150 === 149) hashes.push(hashWorld(session.world));
		}
		return { hashes, end: summary(session) };
	};
	const a = replay(checkpoint);
	const b = replay(structuredClone(checkpoint));
	expect(b.hashes).toEqual(a.hashes);
	expect(b.end).toEqual(a.end);
	expect(a.hashes[5]).not.toBe(hashWorld(fresh().world));
});

test("a run interrupted at round N+1 and resumed reaches N+2 with the state of the run that never stopped", async () => {
	const start = fresh();
	playUntilIntroOf(start, 2);
	const checkpoint = await throughTheSave(start);

	// Continuous: from the checkpoint straight through round 2 and its shop to the start of round 3.
	const continuous = fresh();
	restoreCheckpoint(continuous, checkpoint);
	playOn(continuous, 3);
	const atRound3 = await throughTheSave(continuous);

	// Interrupted: the same, but the game is closed and reopened at the start of round 3.
	const reopened = fresh();
	restoreCheckpoint(reopened, atRound3);
	expect(summary(reopened)).toEqual(summary(continuous));
	for (const name of RNG_STREAMS)
		expect(reopened.rng[name].state(), name).toBe(continuous.rng[name].state());
	expect(Health.hp[reopened.hero]).toBe(Health.hp[continuous.hero]);
});

test("the resumed run draws the same random numbers as the original would have", () => {
	const live = fresh();
	playUntilIntroOf(live, 2);
	const resumed = fresh();
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
	const live = fresh();
	playUntilIntroOf(live, 4);
	const resumed = fresh();
	restoreCheckpoint(resumed, captureCheckpoint(live, identity));
	expect(resumed.run.round).toBe(4);
	expect(resumed.run.state).toMatch(/Intro$/);
	expect(query(resumed.world, [EnemyFaction])).toHaveLength(0);
});

test("an unknown weapon in the save is refused instead of starting a broken run", () => {
	const live = fresh();
	playUntilIntroOf(live, 2);
	const cp = captureCheckpoint(live, identity);
	cp.weapon.id = "no_such_weapon";
	expect(() => restoreCheckpoint(fresh(), cp)).toThrow("unknown weapon");
});

test("the checkpoint keeps the hero: the passive is not saved as a pick, and another hero's save is refused", async () => {
	const live = createGameSession({
		seed: identity.seed,
		difficulty,
		meta: createMetaState(),
		hero: "ranged",
	});
	playUntilIntroOf(live, 2);
	const checkpoint = await throughTheSave(live);
	expect(checkpoint.hero).toBe("ranged");
	const passive = live.heroDef.passive.modifiers;
	for (const m of passive) expect(checkpoint.modifiers).not.toContainEqual(m);

	const again = createGameSession({
		seed: identity.seed,
		difficulty,
		meta: createMetaState(),
		hero: "ranged",
	});
	restoreCheckpoint(again, checkpoint);
	expect(again.weapon.weapon.id).toBe(live.weapon.weapon.id);
	for (const m of passive)
		expect(again.stats.modifiers.filter((x) => x.stat === m.stat)).toHaveLength(
			live.stats.modifiers.filter((x) => x.stat === m.stat).length,
		);
	expect(() => restoreCheckpoint(fresh(), checkpoint)).toThrow("hero ranged");
});

test("the checkpoint keeps the combat clock and the daily date, and a resumed run keeps counting", async () => {
	const live = fresh();
	playUntilIntroOf(live, 2);
	expect(live.runStats.seconds).toBeGreaterThan(0);
	const meta = createMetaState();
	meta.run = captureCheckpoint(live, { ...identity, daily: "2026-11-11" });
	const stored = (await parseSave(await serializeSave(meta, "0.0.0"))).run;
	expect(stored?.daily).toBe("2026-11-11");
	expect(stored?.seconds).toBe(Math.round(live.runStats.seconds));
	const again = fresh();
	if (!stored) throw new Error("the checkpoint did not survive the save");
	restoreCheckpoint(again, stored);
	expect(again.runStats.seconds).toBe(stored.seconds);
	expect(captureCheckpoint(live, identity).daily).toBeNull();
});
