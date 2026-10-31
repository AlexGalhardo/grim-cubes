import { expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createDecalPool } from "./decals";

it("fades the oldest tenth of a full pool and gives an overwritten slot full alpha again", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const pool = createDecalPool(game.scene, 20);
	const alphaOf = (slot: number): number => pool.alphaAt(slot);
	for (let i = 0; i < 19; i++) pool.add(i, 0, 1, 0, 1, 0, 0);
	expect(alphaOf(0)).toBeCloseTo(0.75);
	pool.add(19, 0, 1, 0, 1, 0, 0);
	expect(pool.live).toBe(20);
	expect(alphaOf(0)).toBeLessThan(alphaOf(1));
	expect(alphaOf(1)).toBeLessThan(0.75);
	expect(alphaOf(5)).toBeCloseTo(0.75);
	pool.add(20, 0, 1, 0, 1, 0, 0);
	expect(alphaOf(0)).toBeCloseTo(0.75);
	expect(alphaOf(1)).toBeLessThan(alphaOf(2));
	dispose();
});
