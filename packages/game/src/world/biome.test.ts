import { describe, expect, it } from "vitest";
import { biomesData } from "../data";
import { BIOME_BLEND, type BiomeMix, createBiomeMap } from "./biome";

const map = createBiomeMap(biomesData);
const ids = (x: number): string => biomesData[map.at(x, 0)]?.id ?? "";

describe("biome map", () => {
	it("returns the right ring at 0 / 120 / 260 / 420 / 900 u, in any direction", () => {
		expect([0, 119, 120, 259, 260, 419, 420, 900].map(ids)).toEqual([
			"sunken_cemetery",
			"sunken_cemetery",
			"bone_swamp",
			"bone_swamp",
			"infernal_forge",
			"infernal_forge",
			"biomech_nest",
			"biomech_nest",
		]);
		expect(map.at(0, -300)).toBe(map.at(300, 0));
		expect(map.at(212, 212)).toBe(map.at(0, 300));
	});

	it("mixes the two biomes over a 16 u border centred on the boundary", () => {
		const mix: BiomeMix = { from: 0, to: 0, t: 0 };
		map.mix(100, 0, mix);
		expect([mix.from, mix.to, mix.t]).toEqual([0, 0, 0]);
		map.mix(120 - BIOME_BLEND / 2 + 1, 0, mix);
		expect([mix.from, mix.to]).toEqual([0, 1]);
		expect(mix.t).toBeCloseTo(1 / BIOME_BLEND, 5);
		map.mix(120, 0, mix);
		expect([mix.from, mix.to]).toEqual([0, 1]);
		expect(mix.t).toBeCloseTo(0.5, 5);
		map.mix(120 + BIOME_BLEND / 2 - 0.001, 0, mix);
		expect(mix.t).toBeCloseTo(1, 2);
		map.mix(140, 0, mix);
		expect([mix.from, mix.to, mix.t]).toEqual([1, 1, 0]);
	});

	it("takes either biome for a chunk on the border, deterministically", () => {
		const seen = new Set<number>();
		for (let cz = -12; cz <= 12; cz++) {
			const first = map.chunkBiome(7, cz, 16, 42);
			expect(map.chunkBiome(7, cz, 16, 42)).toBe(first);
			seen.add(first);
		}
		expect(seen.size).toBeGreaterThanOrEqual(1);
		expect(map.chunkBiome(0, 0, 16, 42)).toBe(0);
		expect(map.chunkBiome(40, 40, 16, 42)).toBe(3);
	});
});
