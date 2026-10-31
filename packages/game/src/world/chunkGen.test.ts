import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type BiomeDef, createChunkGenerator, PROP_KIND } from "./chunkGen";
import type { ChunkData, WorldConfig } from "./chunkSystem";

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const config = read("../../../../data/world.json") as WorldConfig;
const biomes = read("../../../../data/biomes.json") as BiomeDef[];

function blank(): ChunkData {
	const n = config.maxPropsPerChunk;
	return {
		cx: 0,
		cz: 0,
		floorVariant: 0,
		biome: 0,
		propCount: 0,
		propType: new Uint8Array(n),
		propKind: new Uint8Array(n),
		propX: new Float32Array(n),
		propZ: new Float32Array(n),
	};
}

function fingerprint(chunk: ChunkData): number {
	let h = 0x811c9dc5;
	const mix = (v: number): void => {
		h = Math.imul(h ^ (v | 0), 0x01000193);
		h = Math.imul(h ^ Math.round(v * 1024), 0x01000193);
	};
	mix(chunk.floorVariant);
	mix(chunk.biome);
	mix(chunk.propCount);
	for (let i = 0; i < chunk.propCount; i++) {
		mix(chunk.propType[i] ?? 0);
		mix(chunk.propKind[i] ?? 0);
		mix(chunk.propX[i] ?? 0);
		mix(chunk.propZ[i] ?? 0);
	}
	return h >>> 0;
}

/** Distinct chunk coordinates on a 100-wide grid centred on the spawn, so every spawn chunk is included. */
function coords(count: number): [number, number][] {
	return Array.from({ length: count }, (_, i) => [(i % 100) - 50, (Math.floor(i / 100) % 100) - 50]);
}

const SEED = 42;
const gen = createChunkGenerator(SEED, biomes, config);

describe("generateChunk", () => {
	it("is deterministic: same seed, same fingerprint over 1000 chunks, in any order", () => {
		const first = coords(1000).map(([cx, cz]) => {
			const chunk = blank();
			gen.generate(cx, cz, chunk);
			return fingerprint(chunk);
		});
		const again = createChunkGenerator(SEED, biomes, config);
		const reversed = coords(1000)
			.reverse()
			.map(([cx, cz]) => {
				const chunk = blank();
				again.generate(cx, cz, chunk);
				return fingerprint(chunk);
			})
			.reverse();
		expect(reversed).toEqual(first);
		expect(new Set(first).size).toBeGreaterThan(900);
		const other = createChunkGenerator(SEED + 1, biomes, config);
		const chunk = blank();
		other.generate(coords(1)[0]?.[0] ?? 0, 0, chunk);
		expect(fingerprint(chunk)).not.toBe(first[0]);
	});

	it("respects the count ranges, the cell rules and the spawn clearance over 10000 chunks", () => {
		const chunk = blank();
		const ranges = biomes[0]?.propCounts;
		if (!ranges) throw new Error("fixture biome lacks propCounts");
		const within = (n: number | undefined, [lo, hi]: readonly [number, number]): boolean =>
			(n ?? 0) >= lo && (n ?? 0) <= hi;
		const violations = { count: 0, bounds: 0, cell: 0, spawn: 0, corridor: 0 };
		for (const [cx, cz] of coords(10_000)) {
			gen.generate(cx, cz, chunk);
			const counts = [0, 0, 0];
			const gridA = new Set<number>();
			const gridB = new Set<number>();
			const blocked: number[] = [];
			for (let i = 0; i < chunk.propCount; i++) {
				const kind = chunk.propKind[i] ?? 0;
				counts[kind] = (counts[kind] ?? 0) + 1;
				const lx = chunk.propX[i] ?? 0;
				const lz = chunk.propZ[i] ?? 0;
				if (lx < 0 || lx >= config.chunkSize || lz < 0 || lz >= config.chunkSize) violations.bounds++;
				const cell = Math.floor(lz / 4) * 4 + Math.floor(lx / 4);
				const grid = kind === PROP_KIND.decor ? gridB : gridA;
				if (grid.has(cell)) violations.cell++;
				grid.add(cell);
				if (Math.hypot(cx * config.chunkSize + lx, cz * config.chunkSize + lz) < 3)
					violations.spawn++;
				if (kind === PROP_KIND.blocking) blocked.push(cell);
			}
			// Corridor rule on the final state, counted straight from the grid: no blocking prop ends up with more
			// than 2 blocking neighbours (8-neighbourhood).
			for (const cell of blocked) {
				let near = 0;
				for (const other of blocked) {
					if (other === cell) continue;
					if (
						Math.abs((other % 4) - (cell % 4)) <= 1 &&
						Math.abs(Math.floor(other / 4) - Math.floor(cell / 4)) <= 1
					)
						near++;
				}
				if (near > 2) violations.corridor++;
			}
			if (
				!within(counts[PROP_KIND.blocking], ranges.blocking) ||
				!within(counts[PROP_KIND.decor], ranges.decor) ||
				!within(counts[PROP_KIND.breakable], ranges.breakable)
			) {
				violations.count++;
			}
		}
		expect(violations).toEqual({ count: 0, bounds: 0, cell: 0, spawn: 0, corridor: 0 });
	});

	it("falls back to the last defined biome beyond its maxDistance", () => {
		expect(gen.biomeIndex(0, 0)).toBe(0);
		expect(gen.biomeIndex(100, -100)).toBe(0);
		const chunk = blank();
		gen.generate(100, -100, chunk);
		expect(chunk.propCount).toBeGreaterThanOrEqual(11);
	});

	it("generates 49 chunks in under 50 ms", () => {
		const fresh = createChunkGenerator(SEED, biomes, config);
		const chunk = blank();
		const start = performance.now();
		for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) fresh.generate(cx, cz, chunk);
		expect(performance.now() - start).toBeLessThan(50);
	});

	it("allocates no arrays or strings per chunk", () => {
		const chunk = blank();
		for (let i = 0; i < 200; i++) gen.generate(i, -i, chunk);
		let calls = 0;
		const proto = Array.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
		const originals = new Map<string, (...args: unknown[]) => unknown>();
		for (const name of ["filter", "map", "slice", "concat", "join"]) {
			const original = proto[name];
			if (!original) continue;
			originals.set(name, original);
			proto[name] = function (this: unknown, ...args: unknown[]): unknown {
				calls++;
				return original.apply(this, args);
			};
		}
		try {
			for (let i = 0; i < 1000; i++) gen.generate(i, i * 3, chunk);
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
	});
});
