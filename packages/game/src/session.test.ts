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

test("a won round opens the shop by itself, closing it starts the next round, and nobody walks to anything", () => {
	const session = createGameSession({ seed: 5, difficulty, meta: createMetaState() });
	expect(session.run.state).toBe("Idle");
	expect(session.fighting()).toBe(false);
	session.run.newRun();
	const input = createInputState();
	const seen = new Set<string>();
	const stepOnce = (): void => {
		session.step(input);
		session.events.consume(() => undefined);
		seen.add(session.run.state);
	};
	for (let i = 0; i < 60 * 10 && session.run.state !== "Round"; i++) stepOnce();
	expect(session.run.state).toBe("Round");
	session.run.forceEnd(session.world);
	for (let i = 0; i < 60 * 5 && session.run.state !== "Shop"; i++) stepOnce();
	expect(session.run.state).toBe("Shop");
	expect(session.run.round).toBe(1);
	expect(session.shop.slots.length).toBeGreaterThan(0);
	// The outro leads straight to the shop: no state in between, and no Merchant system left to wait for.
	expect(seen.has("RoundOutro")).toBe(true);
	expect(seen).not.toContain("MerchantWait");
	session.run.closeShop();
	expect(session.run.round).toBe(2);
	expect(session.run.state).toBe("RoundIntro");
	for (let i = 0; i < 60 * 10 && session.run.state !== "Round"; i++) stepOnce();
	expect(session.run.state).toBe("Round");
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

test("buying equipment in the session raises the hero's stats and survives a restart of the stats pass", () => {
	const session = createGameSession({ seed: 5, difficulty, meta: createMetaState() });
	session.run.newRun();
	session.progress.gold = 1_000_000;
	session.shop.open();
	const armorBefore = session.stats.stats.armor;
	const maxHpBefore = session.stats.stats.maxHp;
	for (let i = 0; i < session.shop.slots.length; i++) session.shop.buy(i);
	session.stats.run(session.hero);
	expect(session.shop.levels.every((level) => level > 0)).toBe(true);
	expect(session.stats.stats.armor).toBeGreaterThan(armorBefore);
	expect(session.stats.stats.maxHp).toBeGreaterThan(maxHpBefore);
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

test("the passive shows up in the stats: the Ranged crits more than the Warrior", () => {
	const crit = (hero: string): number => {
		const session = createGameSession({ seed: 5, difficulty, meta: createMetaState(), hero });
		session.stats.run(session.hero);
		return session.stats.stats.critChance;
	};
	expect(crit("ranged")).toBeGreaterThan(crit("warrior"));
});

test("the weapon level follows the hero level up to 10, for every class", () => {
	for (const def of heroesData) {
		const session = createGameSession({ seed: 5, difficulty, meta: createMetaState(), hero: def.id });
		session.run.newRun();
		const input = createInputState();
		while (!session.fighting()) session.step(input);
		expect(session.weapon.tier).toBe(0);
		session.progress.level = 4;
		session.step(input);
		expect(session.weapon.tier).toBe(3);
		session.progress.level = 25;
		session.step(input);
		expect(session.weapon.tier).toBe(9);
	}
});
