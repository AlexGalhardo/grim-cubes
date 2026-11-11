import { describe, expect, it } from "vitest";
import { heroData, itemsData, synergiesData } from "../data";
import { createPlayerStats } from "../rules/stats";
import { computeSynergies, type SynergyState, synergyModifiers } from "../rules/synergies";
import { createStatsSystem, type StatsSystem } from "./stats";
import { createSynergySystem, type SynergySystem } from "./synergies";

const iron = itemsData.filter((i) => i.tags.includes("iron")).map((i) => i.id);

function build(): { stats: StatsSystem; owned: Map<string, number>; synergies: SynergySystem } {
	const stats = createStatsSystem(heroData, createPlayerStats());
	const owned = new Map<string, number>();
	const synergies = createSynergySystem(itemsData, owned, synergiesData, stats);
	return { stats, owned, synergies };
}

const ironState = (s: SynergyState[]): SynergyState | undefined => s.find((x) => x.id === "iron");

describe("item tag synergies", () => {
	it("gives every item one or two known tags and every tag a 2, 4 and 6 tier", () => {
		const ids = new Set(synergiesData.map((s) => s.id));
		expect(ids.size).toBe(6);
		for (const item of itemsData) {
			expect(item.tags.length).toBeGreaterThanOrEqual(1);
			expect(item.tags.length).toBeLessThanOrEqual(2);
			for (const tag of item.tags) expect(ids.has(tag)).toBe(true);
		}
		for (const s of synergiesData) expect(s.tiers.map((t) => t.count)).toEqual([2, 4, 6]);
	});

	it("counts distinct owned items, not copies, and reports the next threshold", () => {
		const owned = new Map<string, number>([[iron[0] as string, 5]]);
		let state = ironState(computeSynergies(itemsData, owned, synergiesData));
		expect(state).toMatchObject({ count: 1, reached: 0, nextAt: 2, thresholds: [2, 4, 6] });
		owned.set(iron[1] as string, 1);
		state = ironState(computeSynergies(itemsData, owned, synergiesData));
		expect(state).toMatchObject({ count: 2, reached: 1, nextAt: 4 });
		for (const id of iron.slice(2, 6)) owned.set(id, 1);
		state = ironState(computeSynergies(itemsData, owned, synergiesData));
		expect(state).toMatchObject({ count: 6, reached: 3, nextAt: null });
	});

	it("applies the bonuses of every reached tier to the stats and removes them when the count drops", () => {
		const { stats, owned, synergies } = build();
		const armorAt = (): number => {
			stats.run(0);
			return stats.stats.armor;
		};
		const base = armorAt();
		owned.set(iron[0] as string, 1);
		synergies.refresh();
		expect(synergyModifiers(synergies.states, synergiesData)).toEqual([]);

		owned.set(iron[1] as string, 1);
		synergies.refresh();
		expect(synergyModifiers(synergies.states, synergiesData)).toEqual(
			synergiesData[0]?.tiers[0]?.modifiers,
		);
		expect(stats.stats.dirty).toBe(true);
		expect(armorAt()).toBe(base + 2);

		for (const id of iron.slice(2, 6)) owned.set(id, 1);
		synergies.refresh();
		expect(armorAt()).toBe(base + 2 + 4);

		for (const id of iron) owned.delete(id);
		synergies.refresh();
		expect(armorAt()).toBe(base);
	});
});
