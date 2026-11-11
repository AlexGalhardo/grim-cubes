import { createInputState, createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { heroesData, roundsData } from "./data";
import { Health } from "./ecs/components";
import { difficultyData } from "./rules/difficulty";
import { regenPerSecond } from "./rules/stats";
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

test("hp_regen heals the hero during a round by the GDD formula and never above max HP", () => {
	expect(regenPerSecond(0, 0.2, 0.09)).toBe(0);
	expect(regenPerSecond(1, 0.2, 0.09)).toBeCloseTo(0.2);
	expect(regenPerSecond(5, 0.2, 0.09)).toBeCloseTo(0.56);
	expect(regenPerSecond(0.5, 0.2, 0.09)).toBeCloseTo(0.1);
	expect(regenPerSecond(1.5, 0.2, 0.09)).toBeCloseTo(0.245);

	const session = createGameSession({ seed: 7, difficulty, meta: createMetaState() });
	session.stats.add([{ stat: "hp_regen", op: "add", value: 5 }]);
	session.run.newRun();
	const input = createInputState();
	while (!session.fighting()) session.step(input);
	const hero = session.hero;
	Health.hp[hero] = 10;
	for (let i = 0; i < 60; i++) {
		session.step(input);
		session.events.consume(() => undefined);
	}
	// One second at 0.56 HP/s, minus whatever the first enemies managed to hit.
	expect(Health.hp[hero] ?? 0).toBeGreaterThan(10);
	Health.hp[hero] = (Health.max[hero] ?? 0) - 0.001;
	session.step(input);
	expect(Health.hp[hero] ?? 0).toBeLessThanOrEqual(Health.max[hero] ?? 0);
});

test("buying an item moves its tag progress through the session", () => {
	const session = createGameSession({ seed: 5, difficulty, meta: createMetaState() });
	session.run.newRun();
	session.progress.gold = 1_000_000;
	session.shop.open();
	for (let i = 0; i < 6; i++) session.shop.buy(i);
	const bought = [...session.owned.keys()];
	expect(bought.length).toBeGreaterThan(0);
	expect(session.synergies.states.reduce((sum, s) => sum + s.count, 0)).toBeGreaterThanOrEqual(
		bought.length,
	);
});

test("every hero starts the run with its own weapon, base stats and passive", () => {
	for (const def of heroesData) {
		const session = createGameSession({
			seed: 5,
			difficulty,
			meta: createMetaState(),
			hero: def.id,
		});
		expect(session.heroDef.id).toBe(def.id);
		expect(session.weapon.weapon.id).toBe(def.startingWeapon);
		session.stats.run(session.hero);
		expect(Health.max[session.hero]).toBe(def.base.maxHp ?? 100);
		for (const m of def.passive.modifiers) expect(session.stats.modifiers).toContainEqual(m);
	}
});

test("a session without a hero plays the first one, and an unknown hero is refused", () => {
	const session = createGameSession({ seed: 5, difficulty, meta: createMetaState() });
	expect(session.heroDef.id).toBe(heroesData[0]?.id);
	expect(() => createGameSession({ seed: 5, difficulty, meta: createMetaState(), hero: "nobody" })).toThrow(
		"Unknown hero",
	);
});

test("the passive shows up in the stats: the Fuzilado crits more than the Carrasco", () => {
	const crit = (hero: string): number => {
		const session = createGameSession({ seed: 5, difficulty, meta: createMetaState(), hero });
		session.stats.run(session.hero);
		return session.stats.stats.critChance;
	};
	expect(crit("riddled")).toBeGreaterThan(crit("executioner"));
});
