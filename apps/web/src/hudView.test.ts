import { createPlayerStats, createStatsSystem, heroData } from "@gc/game";
import { describe, expect, it } from "vitest";
import {
	buildResults,
	createLoadoutView,
	currentStats,
	describeCause,
	type ResultsSource,
	roundSecondsLeft,
} from "./hudView";

const lookup = {
	weaponName: (id: string): string => `weapon:${id}`,
	weaponIcon: () => undefined,
};

describe("loadout view", () => {
	it("shows the weapon level from 1 to 10", () => {
		const view = createLoadoutView(lookup).update({ weaponId: "blade", weaponTier: 2, locale: "pt-BR" });
		expect(view.weapon).toEqual({ id: "blade", name: "weapon:blade", tier: 3 });
	});

	it("caps the weapon level at ten", () => {
		const view = createLoadoutView(lookup).update({ weaponId: "blade", weaponTier: 14, locale: "en" });
		expect(view.weapon.tier).toBe(10);
	});

	it("reuses the same view until the weapon or the locale changes", () => {
		const loadout = createLoadoutView(lookup);
		const source = { weaponId: "blade", weaponTier: 0, locale: "en" };
		const first = loadout.update(source);
		expect(loadout.update({ ...source })).toBe(first);
		const levelled = loadout.update({ ...source, weaponTier: 1 });
		expect(levelled).not.toBe(first);
		expect(loadout.update({ ...source, weaponTier: 1 })).toBe(levelled);
		expect(loadout.update({ ...source, weaponTier: 1, locale: "pt-BR" })).not.toBe(levelled);
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
		damageBySource: [700, 200.2],
		souls: 30,
		totalSouls: 130,
		record: 9,
		newRecord: false,
		seed: 5,
		loadout: createLoadoutView(lookup).update({
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
		expect(view.sources).toEqual([
			{ id: "weapon", label: "src:weapon", damage: 700 },
			{ id: "spell", label: "src:spell", damage: 200 },
		]);
		expect(view.nextUnlock).toEqual({ name: "cheap", cost: 150 });
		expect(view.cause).toBe("boss0");
		expect(view.souls).toBe(30);
	});

	it("tells a daily challenge run apart: scored, practice, or not a daily at all", () => {
		expect(buildResults({ ...source, daily: "scored" }, names).daily).toBe("scored");
		expect(buildResults({ ...source, daily: "practice" }, names).daily).toBe("practice");
		expect("daily" in buildResults(source, names)).toBe(false);
	});

	it("has no next unlock when every node is owned, locked or demo-gated", () => {
		const view = buildResults({ ...source, nodes: [{ label: "x", cost: 1, state: "owned" }] }, names);
		expect(view.nextUnlock).toBeNull();
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
