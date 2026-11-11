import { expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createDecalPool, type DecalPool } from "./decals";

function marksOf(pool: DecalPool): number[] {
	return Array.from({ length: pool.live }, (_, i) => pool.xAt(i)).sort((a, b) => a - b);
}

it("keeps every mark below the cap and drops the oldest one when all are equally near", () => {
	const { engine, dispose } = createNullEngine();
	const pool = createDecalPool(createGameScene(engine).scene, 3, 40);
	for (const x of [1, 2, 3]) pool.add(x, 0, 1, 0, 1, 0, 0);
	expect(marksOf(pool)).toEqual([1, 2, 3]);
	expect(pool.recycled).toBe(0);
	pool.add(4, 0, 1, 0, 1, 0, 0);
	expect(marksOf(pool)).toEqual([2, 3, 4]);
	expect(pool.recycled).toBe(1);
	dispose();
});

it("drops a far mark before an older near one, and the farthest of two old ones", () => {
	const { engine, dispose } = createNullEngine();
	const pool = createDecalPool(createGameScene(engine).scene, 3, 40);
	pool.setAnchor(0, 0);
	pool.add(1, 0, 1, 0, 1, 0, 0);
	pool.add(90, 0, 1, 0, 1, 0, 0);
	pool.add(2, 0, 1, 0, 1, 0, 0);
	pool.add(3, 0, 1, 0, 1, 0, 0);
	expect(marksOf(pool)).toEqual([1, 2, 3]);
	pool.setAnchor(100, 0);
	pool.add(101, 0, 1, 0, 1, 0, 0);
	expect(marksOf(pool)).toEqual([2, 3, 101]);
	dispose();
});

it("a smaller limit sheds the worst marks and a bigger one keeps the rest", () => {
	const { engine, dispose } = createNullEngine();
	const pool = createDecalPool(createGameScene(engine).scene, 4, 40);
	pool.setAnchor(0, 0);
	for (const x of [1, 50, 2, 3]) pool.add(x, 0, 1, 0, 1, 0, 0);
	pool.setLimit(2);
	expect(marksOf(pool)).toEqual([2, 3]);
	pool.setLimit(4);
	expect(marksOf(pool)).toEqual([2, 3]);
	dispose();
});
