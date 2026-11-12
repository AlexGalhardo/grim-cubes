import { describe, expect, it } from "vitest";
import { createInputState, createMetaState } from "../../packages/core/src/index";
import {
	cardsData,
	createBot,
	createGameSession,
	difficultyData,
	Health,
	kiteSteer,
	type Modifier,
	parsePolicy,
	policyFor,
	policyForHero,
	roundsData,
	TANK_WEIGHTS,
	tankSteer,
} from "../../packages/game/src/index";
import { runSim } from "./lib";

const add = (stat: string, value: number): Modifier => ({ stat, op: "add", value });
const DEFENSIVE = new Set(["max_hp", "armor", "hp_regen", "life_steal", "dodge"]);

function best<T>(list: readonly T[], score: (item: T) => number): T {
	return list.reduce((a, b) => (score(b) > score(a) ? b : a));
}

describe("what each policy picks", () => {
	const greedy = policyFor("greedy");
	const tank = policyFor("tank");

	it("the tank takes armor, regeneration, life steal and max HP over a damage card; the greedy bot takes the damage", () => {
		const damage = [add("damage", 0.2)];
		const defences = [
			[add("armor", 1)],
			[add("hp_regen", 0.25)],
			[add("life_steal", 0.03)],
			[add("max_hp", 20)],
		];
		for (const defence of defences) {
			expect(tank.modifierValue(defence)).toBeGreaterThan(tank.modifierValue(damage));
		}
		// The greedy bot rates the same armor and regeneration below that damage.
		expect(greedy.modifierValue(damage)).toBeGreaterThan(greedy.modifierValue([add("armor", 1)]));
		expect(greedy.modifierValue(damage)).toBeGreaterThan(greedy.modifierValue([add("hp_regen", 0.25)]));
		// And the tank rates armor and regeneration higher than the greedy bot does, damage lower.
		expect(tank.modifierValue([add("armor", 1)])).toBeGreaterThan(
			greedy.modifierValue([add("armor", 1)]),
		);
		expect(tank.modifierValue([add("hp_regen", 0.25)])).toBeGreaterThan(
			greedy.modifierValue([add("hp_regen", 0.25)]),
		);
		expect(tank.modifierValue(damage)).toBeLessThan(greedy.modifierValue(damage));
	});

	it("from the real cards, the tank's favourite is a survival card and it rates the damage card below the greedy bot", () => {
		const cards = cardsData.cards;
		const tankCard = best(cards, (c) => tank.modifierValue(c.modifiers));
		expect(
			tankCard.modifiers.some((m) => DEFENSIVE.has(m.stat)),
			tankCard.id,
		).toBe(true);
		const damageCard = cards.find((c) => c.modifiers.some((m) => m.stat === "damage"));
		const regenCard = cards.find((c) => c.modifiers.some((m) => m.stat === "hp_regen"));
		expect(damageCard && regenCard).toBeTruthy();
		expect(tank.modifierValue(damageCard?.modifiers ?? [])).toBeLessThan(
			greedy.modifierValue(damageCard?.modifiers ?? []),
		);
		expect(tank.modifierValue(regenCard?.modifiers ?? [])).toBeGreaterThan(
			greedy.modifierValue(regenCard?.modifiers ?? []),
		);
	});

	it("the tank's weights put survival stats well above the greedy bot's", () => {
		expect(TANK_WEIGHTS.armor).toBeGreaterThan(6 * 2);
		expect(TANK_WEIGHTS.hp_regen).toBeGreaterThan(30 * 2);
		expect(TANK_WEIGHTS.life_steal).toBeGreaterThan(300);
		expect(TANK_WEIGHTS.max_hp).toBeGreaterThan(0.8 * 2);
	});

	it("parses --policy: greedy by default, tank, and an error for anything else", () => {
		expect(parsePolicy(undefined)).toBe("greedy");
		expect(parsePolicy("tank")).toBe("tank");
		expect(parsePolicy("greedy")).toBe("greedy");
		expect(() => parsePolicy("glass-cannon")).toThrow(/unknown policy/);
	});
});

describe("how the tank moves", () => {
	const hero = { x: 0, z: 0 };
	const base = { hero, hpFraction: 1, range: 2.5, canDash: true } as const;

	it("holds the weapon's range like the greedy bot when healthy and not crowded", () => {
		const far = tankSteer({ ...base, enemies: [{ x: 8, z: 0 }] });
		expect(far.moveX).toBeGreaterThan(0.9);
		expect(far.dash).toBe(false);
		const close = tankSteer({ ...base, enemies: [{ x: 2.3, z: 0 }] });
		expect(close.moveX).toBeCloseTo(0, 5);
		const tooClose = tankSteer({ ...base, enemies: [{ x: 1.6, z: 0 }] });
		expect(tooClose.moveX).toBeLessThan(-0.9);
	});

	it("runs from the whole group, not just the nearest enemy, when hurt", () => {
		const move = tankSteer({
			...base,
			hpFraction: 0.25,
			enemies: [
				{ x: 5, z: 0 },
				{ x: 4, z: 3 },
				{ x: 4, z: -3 },
			],
		});
		expect(move.moveX).toBeLessThan(-0.9);
		expect(Math.abs(move.moveZ)).toBeLessThan(0.3);
	});

	it("a wounded tank backs off from a crowd, while a lone enemy at the same range does not push it away", () => {
		const around = [
			{ x: 3, z: 0 },
			{ x: 3, z: 1 },
			{ x: 3, z: -1 },
			{ x: 2.8, z: 0.5 },
			{ x: 2.5, z: -0.5 },
			{ x: 3.2, z: 0.2 },
		];
		const crowd = tankSteer({ ...base, hpFraction: 0.7, enemies: around });
		expect(tankSteer({ ...base, enemies: around }).moveX).toBeGreaterThan(crowd.moveX);
		const lone = tankSteer({ ...base, hpFraction: 0.7, enemies: [{ x: 3, z: 0 }] });
		expect(crowd.moveX).toBeLessThan(lone.moveX);
		expect(crowd.moveX).toBeLessThan(0);
	});

	it("dashes when something is on top of it, or when hurt and close, and only with a charge", () => {
		expect(tankSteer({ ...base, hpFraction: 0.7, enemies: [{ x: 0.6, z: 0 }] }).dash).toBe(true);
		expect(tankSteer({ ...base, hpFraction: 0.45, enemies: [{ x: 2.5, z: 0 }] }).dash).toBe(true);
		expect(tankSteer({ ...base, enemies: [{ x: 3, z: 0 }] }).dash).toBe(false);
		expect(tankSteer({ ...base, hpFraction: 0.4, canDash: false, enemies: [{ x: 1, z: 0 }] }).dash).toBe(
			false,
		);
		// A healthy tank stands its ground next to an enemy instead of dashing away.
		expect(tankSteer({ ...base, enemies: [{ x: 0.6, z: 0 }] }).dash).toBe(false);
		expect(tankSteer({ ...base, hpFraction: 0.45, enemies: [{ x: 8, z: 0 }] }).dash).toBe(false);
	});

	it("stands still with nobody around", () => {
		expect(tankSteer({ ...base, enemies: [] })).toEqual({ moveX: 0, moveZ: 0, dash: false });
	});
});

describe("running the simulator with each policy", () => {
	it("labels the report, is deterministic, and plays differently from the greedy bot", () => {
		const options = { seed: 5, rounds: 4, difficulty: "normal" } as const;
		const a = runSim({ ...options, policy: "tank" });
		const b = runSim({ ...options, policy: "tank" });
		const g = runSim(options);
		expect(a.policy).toBe("tank-kite");
		expect(g.policy).toBe("greedy-kite");
		expect(a.worldHash).toBe(b.worldHash);
		expect(a.worldHash).not.toBe(g.worldHash);
		expect(runSim({ ...options, policy: "greedy" }).worldHash).toBe(g.worldHash);
	}, 60_000);
});

describe("the kiting bot for guns (S-12-03)", () => {
	const hero = { x: 0, z: 0 };
	const base = { hero, range: 12, fragments: [], tick: 0 };

	it("is chosen by the class: warrior greedy, ranged kite, mage its own bot", () => {
		expect(policyForHero("warrior")).toBe("greedy");
		expect(policyForHero("ranged")).toBe("kite");
		expect(policyForHero("mage")).toBe("mage");
		expect(policyFor("kite").modifierValue([add("damage", 0.1)])).toBe(
			policyFor("greedy").modifierValue([add("damage", 0.1)]),
		);
		expect(policyFor("mage").modifierValue([add("damage", 0.1)])).toBe(
			policyFor("greedy").modifierValue([add("damage", 0.1)]),
		);
	});

	it("backs away from a crowd that is close, curving instead of running straight back", () => {
		const move = kiteSteer({
			...base,
			enemies: [
				{ x: 3, z: 0 },
				{ x: 3, z: 1 },
			],
		});
		expect(move.moveX).toBeLessThan(-0.5);
		expect(Math.abs(move.moveZ)).toBeGreaterThan(0.1);
		expect(move.dash).toBe(false);
	});

	it("strafes across the line to a target in reach, and walks in on a far one", () => {
		const strafe = kiteSteer({ ...base, enemies: [{ x: 8, z: 0 }] });
		expect(Math.abs(strafe.moveX)).toBeLessThan(1e-9);
		expect(Math.abs(strafe.moveZ)).toBe(1);
		const approach = kiteSteer({ ...base, enemies: [{ x: 20, z: 0 }] });
		expect(approach.moveX).toBe(1);
	});

	it("fetches the nearest fragment when the field is clear, and flips the strafing side over time", () => {
		const fetch = kiteSteer({
			...base,
			enemies: [{ x: 30, z: 0 }],
			fragments: [
				{ x: 0, z: 8 },
				{ x: 0, z: -3 },
			],
		});
		expect(fetch).toMatchObject({ moveX: 0, moveZ: -1 });
		const early = kiteSteer({ ...base, enemies: [{ x: 8, z: 0 }] });
		const late = kiteSteer({ ...base, enemies: [{ x: 8, z: 0 }], tick: 200 });
		expect(late.moveZ).toBe(-early.moveZ);
	});

	it("plays a whole run with each class's bot and gets past the first rounds", () => {
		for (const [hero, policy] of [
			["warrior", "greedy-kite"],
			["ranged", "kite"],
			["mage", "mage"],
		] as const) {
			const report = runSim({ seed: 1, rounds: 6, difficulty: "normal", hero });
			expect(report.policy).toBe(policy);
			expect(report.roundReached).toBeGreaterThanOrEqual(5);
		}
	});

	it("presses the heal below half HP and leaves the super alone until it is charged", () => {
		const session = createGameSession({
			seed: 3,
			difficulty: difficultyData(roundsData.difficulties, "normal"),
			meta: createMetaState(),
		});
		const bot = createBot(session, "greedy");
		const input = createInputState();
		session.run.newRun();
		while (session.run.state !== "Round") session.step(input);
		bot.prepare(input);
		expect([input.heal, input.super]).toEqual([false, false]);
		Health.hp[session.hero] = (Health.max[session.hero] ?? 1) * 0.4;
		const pressed: boolean[] = [];
		for (let i = 0; i < 2; i++) {
			bot.prepare(input);
			pressed.push(input.heal);
		}
		expect(pressed).toContain(true);
		expect(input.super).toBe(false);
	});
});
