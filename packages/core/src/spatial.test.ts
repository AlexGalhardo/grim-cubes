import { expect, test } from "vitest";
import { mulberry32 } from "./rng";
import { createSpatialHash } from "./spatial";

function scene(n: number, seed: number) {
	const rng = mulberry32(seed);
	const pts = Array.from({ length: n }, (_, id) => ({ id, x: rng.float(-60, 60), z: rng.float(-60, 60) }));
	const hash = createSpatialHash({ capacity: n });
	for (const p of pts) hash.insert(p.id, p.x, p.z);
	return { rng, pts, hash };
}

test("queryCircle matches a naive search for 100 queries over 600 entities", () => {
	const { rng, pts, hash } = scene(600, 7);
	const out = new Uint16Array(600);
	for (let q = 0; q < 100; q++) {
		const x = rng.float(-60, 60);
		const z = rng.float(-60, 60);
		const r = rng.float(0.5, 12);
		const n = hash.queryCircle(x, z, r, out);
		const got = [...out.subarray(0, n)].sort((a, b) => a - b);
		const want = pts
			.filter((p) => (Math.fround(p.x) - x) ** 2 + (Math.fround(p.z) - z) ** 2 <= r * r)
			.map((p) => p.id);
		expect(got.length).toBe(new Set(got).size);
		expect(got).toEqual(want.sort((a, b) => a - b));
	}
});

test("negative coordinates and clear work", () => {
	const hash = createSpatialHash();
	hash.insert(5, -0.5, -0.5);
	const out = new Uint16Array(8);
	expect(hash.queryCircle(0, 0, 1, out)).toBe(1);
	hash.clear();
	expect(hash.queryCircle(0, 0, 1, out)).toBe(0);
});

test("results are capped by the output size", () => {
	const hash = createSpatialHash();
	for (let i = 0; i < 10; i++) hash.insert(i, 0, 0);
	expect(hash.queryCircle(0, 0, 1, new Uint16Array(4))).toBe(4);
});

test("rebuild + 600 queries p50 stays under 1 ms", () => {
	const { pts, hash } = scene(600, 3);
	const out = new Uint16Array(64);
	const times: number[] = [];
	for (let run = 0; run < 100; run++) {
		const t0 = performance.now();
		hash.clear();
		for (const p of pts) hash.insert(p.id, p.x, p.z);
		for (const p of pts) hash.queryCircle(p.x, p.z, 1, out);
		times.push(performance.now() - t0);
	}
	times.sort((a, b) => a - b);
	expect(times[50]).toBeLessThan(1);
});
