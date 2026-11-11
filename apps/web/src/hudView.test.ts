import { createPlayerStats, createStatsSystem, heroData } from "@gc/game";
import { describe, expect, it } from "vitest";
import {
	buildResults,
	createLoadoutView,
	currentStats,
	describeCause,
	itemLines,
	type ResultsSource,
	roundSecondsLeft,
} from "./hudView";

const lookup = {
	itemName: (id: string): string => `name:${id}`,
	itemTier: (id: string): number => (id === "rare" ? 3 : 1),
	itemIcon: () => undefined,
	weaponName: (id: string): string => `weapon:${id}`,
	weaponIcon: () => undefined,
};

describe("loadout view", () => {
	it("groups the items with a counter and shows the weapon tier as 1-4 pips", () => {
		const view = createLoadoutView(lookup).update({
			owned: new Map([
				["boots", 2],
				["rare", 1],
			]),
			weaponId: "blade",
			weaponTier: 2,
			locale: "pt-BR",
		});
		expect(view.weapon).toEqual({ id: "blade", name: "weapon:blade", tier: 3 });
		expect(view.items.map((i) => [i.id, i.count, i.tier])).toEqual([
			["boots", 2, 1],
			["rare", 1, 3],
		]);
		expect(view.items[0]?.name).toBe("name:boots");
	});

	it("caps the pips at four", () => {
		const view = createLoadoutView(lookup).update({
			owned: new Map(),
			weaponId: "blade",
			weaponTier: 9,
			locale: "en",
		});
		expect(view.weapon.tier).toBe(4);
	});

	it("reuses the same view and arrays until the owned set, weapon or locale changes", () => {
		const owned = new Map([["boots", 1]]);
		const loadout = createLoadoutView(lookup);
		const source = { owned, weaponId: "blade", weaponTier: 0, locale: "en" };
		const first = loadout.update(source);
		expect(loadout.update(source)).toBe(first);
		expect(loadout.update({ ...source }).items).toBe(first.items);

		owned.set("boots", 2);
		const counted = loadout.update(source);
		expect(counted).not.toBe(first);
		expect(counted.items[0]?.count).toBe(2);

		owned.set("rare", 1);
		expect(loadout.update(source).items).toHaveLength(2);
		expect(loadout.update({ ...source, weaponTier: 1 })).not.toBe(counted);
		const again = loadout.update({ ...source, weaponTier: 1 });
		expect(loadout.update({ ...source, weaponTier: 1 })).toBe(again);
		expect(loadout.update({ ...source, weaponTier: 1, locale: "pt-BR" })).not.toBe(again);
	});

	it("starts over when a new run empties the owned set", () => {
		const owned = new Map([["boots", 1]]);
		const loadout = createLoadoutView(lookup);
		const source = { owned, weaponId: "blade", weaponTier: 0, locale: "en" };
		loadout.update(source);
		owned.clear();
		expect(loadout.update(source).items).toEqual([]);
	});
});

describe("round timer", () => {
	it("rounds up to whole seconds during a round and is 0 elsewhere", () => {
		expect(roundSecondsLeft("Round", 21, 0.05)).toBe(2);
		expect(roundSecondsLeft("Round", 0, 0.05)).toBe(0);
		expect(roundSecondsLeft("BossRound", 100, 0.05)).toBe(0);
		expect(roundSecondsLeft("Shop", 100, 0.05)).toBe(0);
	});
});

const names = {
	enemy: (type: number): string => `enemy${type}`,
	boss: (type: number): string => `boss${type}`,
	elite: (name: string): string => `elite ${name}`,
	shot: (): string => "shot",
	self: (): string => "self",
	unknown: (): string => "unknown",
	source: (id: string): string => `src:${id}`,
};

describe("results view", () => {
	it("names the killer for an enemy, an elite, a boss, a projectile and the hero's own blast, never as unknown", () => {
		const cases = [
			[{ kind: "enemy", type: 2 }, "enemy2", "enemy"],
			[{ kind: "elite", type: 2 }, "elite enemy2", "elite"],
			[{ kind: "boss", type: 1 }, "boss1", "boss"],
			[{ kind: "shot", type: -1 }, "shot", "shot"],
			[{ kind: "self", type: -1 }, "self", "self"],
		] as const;
		for (const [killer, cause, causeKind] of cases) {
			expect(describeCause(killer, names)).toEqual({ cause, causeKind });
		}
		expect(describeCause({ kind: "none", type: -1 }, names).cause).toBe("unknown");
	});

	const source: ResultsSource = {
		round: 7,
		kills: 90,
		damageDealt: 1000.4,
		seconds: 100,
		killer: { kind: "boss", type: 0 },
		damageBySource: [700, 0, 200.2, 100],
		souls: 30,
		totalSouls: 130,
		record: 9,
		newRecord: false,
		seed: 5,
		loadout: createLoadoutView(lookup).update({
			owned: new Map([["boots", 2]]),
			weaponId: "blade",
			weaponTier: 0,
			locale: "pt-BR",
		}),
		nodes: [
			{ label: "owned", cost: 10, state: "owned" },
			{ label: "dear", cost: 300, state: "available" },
			{ label: "cheap", cost: 150, state: "available" },
			{ label: "locked", cost: 20, state: "locked" },
		],
	};

	it("carries the run time, the build, the damage per source and the cheapest open unlock", () => {
		const view = buildResults(source, names);
		expect(view.seconds).toBe(100);
		expect(view.damage).toBe(1000);
		expect(view.weapon.name).toBe("weapon:blade");
		expect(view.items.map((i) => [i.id, i.count])).toEqual([["boots", 2]]);
		expect(view.sources).toEqual([
			{ id: "weapon", label: "src:weapon", damage: 700 },
			{ id: "item", label: "src:item", damage: 200 },
			{ id: "bleed", label: "src:bleed", damage: 100 },
		]);
		expect(view.nextUnlock).toEqual({ name: "cheap", cost: 150 });
		expect(view.cause).toBe("boss0");
		expect(view.souls).toBe(30);
	});

	it("has no next unlock when every node is owned, locked or demo-gated", () => {
		const view = buildResults({ ...source, nodes: [{ label: "x", cost: 1, state: "owned" }] }, names);
		expect(view.nextUnlock).toBeNull();
	});
});

describe("item lines", () => {
	it("lists the modifiers and then the effects, so an effect-only item is never blank", () => {
		const text = (d: { key: string }): string => d.key;
		expect(itemLines({ modifiers: [], effects: [{ id: "dash_unlock" }] }, text)).toEqual([
			"effect.dash_unlock",
		]);
		expect(
			itemLines(
				{ modifiers: [{ stat: "armor", op: "add", value: 3 }], effects: [{ id: "dash_unlock" }] },
				text,
			),
		).toHaveLength(2);
		expect(itemLines({ modifiers: [] }, text)).toEqual([]);
	});
});

describe("current stats", () => {
	it("includes a pick the sim has not recomputed yet, so a second offer in a row starts from the right values", () => {
		const system = createStatsSystem(heroData, createPlayerStats());
		const scratch = createPlayerStats();
		expect(currentStats(system, heroData, [], scratch)).toBe(system.stats);
		system.add([{ stat: "armor", op: "add", value: 3 }]);
		expect(system.stats.armor).toBe(0);
		expect(currentStats(system, heroData, [], scratch).armor).toBe(3);
	});
});
