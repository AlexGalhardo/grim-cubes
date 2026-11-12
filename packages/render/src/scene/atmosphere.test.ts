import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createAtmosphere } from "./atmosphere";
import { createGameScene } from "./scene";

const looks = [
	{ fogColor: "#000000", music: "a" },
	{ fogColor: "#ffffff", music: "b" },
];

describe("atmosphere", () => {
	it("sets fog and sky to the biome of the round and announces its music once per change", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const tracks: string[] = [];
		const atmosphere = createAtmosphere(game, looks, (t) => tracks.push(t));
		atmosphere.update(0);
		atmosphere.update(0);
		expect(game.scene.fogColor.r).toBeCloseTo(0, 5);
		atmosphere.update(1);
		atmosphere.update(1);
		expect(game.scene.fogColor.r).toBeCloseTo(1, 5);
		expect(game.scene.clearColor.r).toBeCloseTo(1, 5);
		expect(atmosphere.biome).toBe(1);
		expect(tracks).toEqual(["a", "b"]);
		dispose();
	});
});
