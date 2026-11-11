import { describe, expect, it } from "vitest";
import { createLoadoutView, roundSecondsLeft } from "./hudView";

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
