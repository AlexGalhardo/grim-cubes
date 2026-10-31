import { readFileSync } from "node:fs";
import { hash32 } from "@gc/core";
import { describe, expect, it } from "vitest";
import { type ChunkData, type ChunkSystem, createChunkSystem, type WorldConfig } from "./chunkSystem";

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const config = read("../../../../data/world.json") as WorldConfig;
const schema = read("../../../../data/schema/world.schema.json") as { required: string[] };

const stubGenerate = (cx: number, cz: number, out: ChunkData): void => {
	out.floorVariant = hash32(1, cx, cz) & 3;
};

function setup(): { system: ChunkSystem; calls: () => number } {
	let calls = 0;
	const system = createChunkSystem(config, (cx, cz, out) => {
		calls++;
		expect(out.cx).toBe(cx);
		expect(out.cz).toBe(cz);
		stubGenerate(cx, cz, out);
	});
	return { system, calls: () => calls };
}

function checkRings(system: ChunkSystem, hx: number, hz: number): void {
	const hcx = Math.floor(hx / config.chunkSize);
	const hcz = Math.floor(hz / config.chunkSize);
	for (let cx = hcx - config.loadRadius; cx <= hcx + config.loadRadius; cx++) {
		for (let cz = hcz - config.loadRadius; cz <= hcz + config.loadRadius; cz++) {
			expect(system.get(cx, cz)).not.toBeNull();
		}
	}
	let count = 0;
	for (const chunk of system.slots) {
		if (!chunk) continue;
		count++;
		expect(Math.max(Math.abs(chunk.cx - hcx), Math.abs(chunk.cz - hcz))).toBeLessThan(
			config.unloadRadius,
		);
	}
	expect(count).toBeGreaterThanOrEqual(49);
	expect(count).toBeLessThanOrEqual(81);
	expect(system.stats.loaded).toBe(count);
}

describe("data/world.json", () => {
	it("has exactly the keys required by the schema", () => {
		expect(Object.keys(config).sort()).toEqual([...schema.required].sort());
		expect(config.poolSize).toBe(81);
	});
});

describe("chunkSystem", () => {
	it("generates at most 2 chunks per step, nearest first", () => {
		const { system, calls } = setup();
		let previous = 0;
		for (let step = 0; step < 40; step++) {
			system.update(0, 0);
			expect(calls() - previous).toBeLessThanOrEqual(config.chunksPerStep);
			previous = calls();
			if (step === 0) expect(system.get(-1, -1) ?? system.get(0, 0)).not.toBeNull();
		}
		expect(system.stats.loaded).toBe(49);
	});

	it("stays stable over 2000 u in a straight line with no allocation after warm-up", () => {
		const { system, calls } = setup();
		let x = 0;
		let previous = 0;
		let afterWarmup = -1;
		for (let step = 0; step < Math.ceil(2000 / 6) * 60; step++) {
			x += 6 / 60;
			system.update(x, 0);
			expect(calls() - previous).toBeLessThanOrEqual(config.chunksPerStep);
			previous = calls();
			if (step === 600) afterWarmup = system.stats.newChunkData;
		}
		for (let i = 0; i < 40; i++) system.update(x, 0);
		checkRings(system, x, 0);
		expect(afterWarmup).toBeGreaterThan(0);
		expect(system.stats.newChunkData).toBe(afterWarmup);
		expect(system.stats.newChunkData).toBeLessThanOrEqual(config.poolSize);
	});

	it("handles negative coordinates and diagonal motion", () => {
		const { system } = setup();
		let x = 0;
		let z = 0;
		for (let step = 0; step < 6000; step++) {
			x -= 0.07;
			z -= 0.05;
			system.update(x, z);
		}
		for (let i = 0; i < 40; i++) system.update(x, z);
		checkRings(system, x, z);
	});

	it("recovers from a teleport without exhausting the pool", () => {
		const { system } = setup();
		for (let i = 0; i < 40; i++) system.update(0, 0);
		for (let i = 0; i < 80; i++) system.update(10_000, -10_000);
		checkRings(system, 10_000, -10_000);
		expect(system.get(0, 0)).toBeNull();
	});

	it("rejects inconsistent configs", () => {
		expect(() => createChunkSystem({ ...config, unloadRadius: 3 }, stubGenerate)).toThrow();
		expect(() => createChunkSystem({ ...config, poolSize: 80 }, stubGenerate)).toThrow();
	});
});
