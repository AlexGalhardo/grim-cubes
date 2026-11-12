import { describe, expect, it } from "vitest";
import { biomesData, worldData } from "../data";
import { biomeForRound } from "./biome";

const cfg = worldData.biomes;
const at = (round: number, seed = 42): string =>
	biomesData[biomeForRound(cfg, biomesData.length, seed, round)]?.id ?? "";

describe("biome by round", () => {
	it("has five biomes, one per ten rounds, in the order of biomes.json (rounds 1-50)", () => {
		expect(biomesData).toHaveLength(5);
		const ids = biomesData.map((b) => b.id);
		for (const [round, index] of [
			[1, 0],
			[10, 0],
			[11, 1],
			[20, 1],
			[21, 2],
			[30, 2],
			[31, 3],
			[40, 3],
			[41, 4],
			[50, 4],
		] as const)
			expect(at(round), `round ${round}`).toBe(ids[index]);
	});

	it("draws a biome per round from round 51 on, the same for the same seed and round", () => {
		const seen = new Set<string>();
		for (let round = 51; round < 251; round++) {
			expect(at(round, 7)).toBe(at(round, 7));
			seen.add(at(round, 7));
		}
		expect(seen.size).toBe(biomesData.length);
		const other = Array.from({ length: 40 }, (_, i) => at(51 + i, 8)).join();
		expect(other).not.toBe(Array.from({ length: 40 }, (_, i) => at(51 + i, 7)).join());
	});
});
