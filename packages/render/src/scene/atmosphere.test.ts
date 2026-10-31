import { createBiomeMap } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createAtmosphere } from "./atmosphere";
import { createGameScene } from "./scene";

const bands = [{ minDistance: 0 }, { minDistance: 120 }];
const looks = [
	{ fogColor: "#000000", music: "a" },
	{ fogColor: "#ffffff", music: "b" },
];

describe("atmosphere", () => {
	it("blends fog across the border, then settles on the biome and announces its music once", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const tracks: string[] = [];
		const atmosphere = createAtmosphere(game, createBiomeMap(bands), looks, (t) => tracks.push(t));
		atmosphere.update(50, 0);
		expect(game.scene.fogColor.r).toBeCloseTo(0, 5);
		atmosphere.update(120, 0);
		expect(game.scene.fogColor.r).toBeCloseTo(0.5, 2);
		atmosphere.update(150, 0);
		expect(game.scene.fogColor.r).toBeCloseTo(1, 5);
		expect(game.scene.clearColor.r).toBeCloseTo(1, 5);
		atmosphere.update(200, 0);
		expect(atmosphere.biome).toBe(1);
		expect(tracks).toEqual(["a", "b"]);
		dispose();
	});
});
