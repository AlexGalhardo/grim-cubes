import { describe, expect, it } from "vitest";
import { cardsData, itemsData, type Modifier } from "../../packages/game/src/index";
import { runSim } from "./lib";
import { parsePolicy, policyFor, TANK_WEIGHTS, tankSteer } from "./policy";

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

	it("from the real shop items, the tank prefers a defensive item and rates revives above the greedy bot", () => {
		const worth = (p: typeof tank) => (item: (typeof itemsData)[number]) =>
			p.modifierValue(item.modifiers) + p.effectValue(item.effects);
		const tankItem = best(itemsData, worth(tank));
		expect(
			tankItem.modifiers.some((m) => DEFENSIVE.has(m.stat)) ||
				tankItem.effects.some((e) => e.id === "revive_once"),
			tankItem.id,
		).toBe(true);
		const revive = itemsData.find((i) => i.effects.some((e) => e.id === "revive_once"));
		expect(revive).toBeDefined();
		expect(tank.effectValue(revive?.effects ?? [])).toBeGreaterThan(
			greedy.effectValue(revive?.effects ?? []),
		);
		// An ordinary effect is worth less to the tank, and so is a weapon upgrade.
		expect(tank.effectValue([{ id: "double_fragment_chance" }])).toBeLessThan(
			greedy.effectValue([{ id: "x" }]),
		);
		expect(tank.upgradeValue).toBeLessThan(greedy.upgradeValue);
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

	it("defensive items rank higher in the tank's worth-per-gold list than in the greedy bot's", () => {
		// Deterministic stand-in for "what the bot buys": the sim-based share was a few points apart and flipped with
		// any shop RNG shift (a new item), so it ranks the pool by worth per gold instead.
		const meanRankOfDefence = (id: "greedy" | "tank"): number => {
			const policy = policyFor(id);
			const ranked = itemsData
				.filter((i) => i.exclusiveTo === undefined && i.tier < 5)
				.map((i) => ({
					item: i,
					worth: (policy.modifierValue(i.modifiers) + policy.effectValue(i.effects)) / i.price,
				}))
				.sort((x, y) => y.worth - x.worth);
			const ranks = ranked.flatMap((r, rank) =>
				r.item.modifiers.some((m) => DEFENSIVE.has(m.stat)) ? [rank] : [],
			);
			return ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
		};
		// A lower mean rank means the defensive items sit higher in the bot's wish list.
		expect(meanRankOfDefence("tank")).toBeLessThan(meanRankOfDefence("greedy"));
	});
});
