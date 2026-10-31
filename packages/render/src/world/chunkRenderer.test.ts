import { readFileSync } from "node:fs";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { hash32 } from "@gc/core";
import { type ChunkData, createChunkSystem, type WorldConfig } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createChunkRenderer } from "./chunkRenderer";
import { PLACEHOLDER_PROPS } from "./placeholder";

const config = JSON.parse(
	readFileSync(new URL("../../../../data/world.json", import.meta.url), "utf8"),
) as WorldConfig;

const stubGenerate = (cx: number, cz: number, out: ChunkData): void => {
	const h = hash32(7, cx, cz);
	out.floorVariant = h & 3;
	out.propCount = 8 + ((h >>> 4) & 7);
	for (let p = 0; p < out.propCount; p++) {
		const hp = hash32(h, p);
		out.propType[p] = hp % PLACEHOLDER_PROPS.length;
		out.propX[p] = (hp & 0xff) / 16;
		out.propZ[p] = ((hp >>> 8) & 0xff) / 16;
	}
};

function setup(loaderMirrored = false) {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const chunks = createChunkSystem(config, stubGenerate);
	const renderer = createChunkRenderer(game, chunks, { ...config, loaderMirrored }, PLACEHOLDER_PROPS);
	const step = (heroX: number, heroZ: number, originX = 0, originZ = 0): void => {
		chunks.update(heroX, heroZ);
		renderer.update(originX, originZ, heroX, heroZ);
	};
	return { game, chunks, renderer, step, dispose };
}

function expectedPropSum(chunks: ReturnType<typeof setup>["chunks"], type: number, originX: number): number {
	let sum = 0;
	for (const chunk of chunks.slots) {
		if (!chunk) continue;
		for (let p = 0; p < chunk.propCount; p++) {
			if (chunk.propType[p] === type)
				sum += chunk.cx * config.chunkSize - originX + (chunk.propX[p] ?? 0);
		}
	}
	return sum;
}

describe("chunk renderer", () => {
	it("stays inside the mesh and draw-call budgets with 49 chunks loaded", () => {
		const { game, chunks, step, dispose } = setup();
		for (let i = 0; i < 40; i++) step(0, 0);
		expect(chunks.stats.loaded).toBe(49);
		const instrumentation = new SceneInstrumentation(game.scene);
		instrumentation.captureFrameTime = false;
		game.scene.render();
		expect(game.scene.getActiveMeshes().length).toBeLessThanOrEqual(12);
		let submeshes = 0;
		for (const mesh of game.scene.getActiveMeshes().data) {
			submeshes += mesh?.subMeshes?.length ?? 0;
		}
		// NullEngine may not count draws, so the submesh count is the portable draw-call bound.
		expect(submeshes).toBeGreaterThan(0);
		expect(submeshes).toBeLessThanOrEqual(60);
		expect(instrumentation.drawCallsCounter.current).toBeLessThanOrEqual(60);
		instrumentation.dispose();
		game.dispose();
		dispose();
	});

	it("keeps active meshes within budget with 81 chunks loaded", () => {
		const { game, chunks, step, dispose } = setup();
		let x = 0;
		let z = 0;
		for (let i = 0; i < 4000; i++) {
			x += 0.15;
			z += 0.15;
			step(x, z);
		}
		for (let i = 0; i < 40; i++) step(x, z);
		expect(chunks.stats.loaded).toBeGreaterThanOrEqual(49);
		game.scene.render();
		expect(game.scene.getActiveMeshes().length).toBeLessThanOrEqual(12);
		game.dispose();
		dispose();
	});

	it("rebuilds buffers only when the ring or the origin changes", () => {
		const { renderer, step, dispose } = setup();
		for (let i = 0; i < 40; i++) step(0, 0);
		const settled = { ...renderer.stats };
		for (let i = 0; i < 200; i++) step(1, 1);
		expect(renderer.stats).toEqual(settled);
		step(1, 1, 1024, 0);
		expect(renderer.stats.propRebuilds).toBe(settled.propRebuilds + 1);
		dispose();
	});

	it("writes prop positions relative to the origin", () => {
		const { chunks, renderer, step, dispose } = setup();
		for (let i = 0; i < 40; i++) step(1100, 20, 1024, 0);
		for (let type = 0; type < PLACEHOLDER_PROPS.length; type++) {
			const { buffer, count } = renderer.instances(type);
			let sum = 0;
			for (let n = 0; n < count; n++) sum += buffer[n * 16 + 12] ?? 0;
			expect(sum).toBeCloseTo(expectedPropSum(chunks, type, 1024), 2);
		}
		dispose();
	});

	it("conjugates prop x for loader-parented meshes (the __root__ mirror)", () => {
		const plain = setup(false);
		const mirrored = setup(true);
		for (let i = 0; i < 40; i++) {
			plain.step(1100, 20, 1024, 0);
			mirrored.step(1100, 20, 1024, 0);
		}
		for (let type = 0; type < PLACEHOLDER_PROPS.length; type++) {
			const a = plain.renderer.instances(type);
			const b = mirrored.renderer.instances(type);
			expect(b.count).toBe(a.count);
			for (let n = 0; n < a.count; n++) {
				expect(b.buffer[n * 16 + 12]).toBeCloseTo(-(a.buffer[n * 16 + 12] ?? 0), 6);
				expect(b.buffer[n * 16 + 14]).toBe(a.buffer[n * 16 + 14]);
			}
		}
		plain.dispose();
		mirrored.dispose();
	});

	it("allocates nothing per step once warm, also while crossing chunk borders", () => {
		const { step, dispose } = setup();
		let x = 0;
		for (let i = 0; i < 4000; i++) {
			x += 0.15;
			step(x, 0);
		}

		let calls = 0;
		const arrayProto = Array.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
		const typedProto = Float32Array.prototype as unknown as Record<
			string,
			(...args: unknown[]) => unknown
		>;
		const patched: [
			Record<string, (...args: unknown[]) => unknown>,
			string,
			(...args: unknown[]) => unknown,
		][] = [];
		const count = (proto: Record<string, (...args: unknown[]) => unknown>, name: string): void => {
			const original = proto[name];
			if (!original) return;
			patched.push([proto, name, original]);
			proto[name] = function (this: unknown, ...args: unknown[]): unknown {
				calls++;
				return original.apply(this, args);
			};
		};
		for (const name of ["filter", "map", "slice", "concat", "join"]) count(arrayProto, name);
		count(typedProto, "subarray");
		try {
			for (let i = 0; i < 4000; i++) {
				x += 0.15;
				step(x, 0);
			}
			for (let i = 0; i < 4000; i++) step(x, 0);
		} finally {
			for (const [proto, name, original] of patched) proto[name] = original;
		}
		expect(calls).toBe(0);
		dispose();
	});

	it("instances props only for chunks within the load radius of the hero chunk", () => {
		const { chunks, renderer, step, dispose } = setup();
		let x = 0;
		for (let i = 0; i < 2000; i++) {
			x += 0.2;
			step(x, 0);
		}
		for (let i = 0; i < 40; i++) step(x, 0);
		const hcx = Math.floor(x / config.chunkSize);
		let visible = 0;
		let loadedProps = 0;
		for (const chunk of chunks.slots) {
			if (!chunk) continue;
			loadedProps += chunk.propCount;
			if (Math.max(Math.abs(chunk.cx - hcx), Math.abs(chunk.cz)) <= config.loadRadius)
				visible += chunk.propCount;
		}
		let rendered = 0;
		for (let type = 0; type < PLACEHOLDER_PROPS.length; type++)
			rendered += renderer.instances(type).count;
		expect(rendered).toBe(visible);
		expect(rendered).toBeLessThanOrEqual(loadedProps);
		expect(rendered).toBeLessThanOrEqual(1500);
		dispose();
	});
});
