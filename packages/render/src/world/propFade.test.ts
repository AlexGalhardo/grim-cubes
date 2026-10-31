import { readFileSync } from "node:fs";
import { type ChunkData, createChunkSystem, PROP_KIND, type WorldConfig } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createChunkRenderer, type FadeView } from "./chunkRenderer";
import { PLACEHOLDER_PROPS, type PropTypeDef } from "./placeholder";

const config = JSON.parse(
	readFileSync(new URL("../../../../data/world.json", import.meta.url), "utf8"),
) as WorldConfig;
const render = JSON.parse(readFileSync(new URL("../../../../data/render.json", import.meta.url), "utf8")) as {
	propFade: { alpha: number; ratePerSecond: number; heroHalfWidth: number; heroHeight: number };
};
const FADE = render.propFade;

const TREE = 1;
// Tall prop types fade; the rest of the placeholders stay solid.
const types: PropTypeDef[] = PLACEHOLDER_PROPS.map((p, t) =>
	t === TREE ? { ...p, fade: { radius: 0.35, height: 2.8 } } : p,
);

function definesOf(game: ReturnType<typeof createGameScene>): string {
	const mesh = game.scene.getMeshByName(PLACEHOLDER_PROPS[TREE]?.name ?? "");
	const effect = mesh?.subMeshes[0]?.effect;
	return effect ? String(effect.defines) : "";
}

function setup(props: readonly { x: number; z: number; type: number }[]) {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const chunks = createChunkSystem(config, (cx, cz, out: ChunkData) => {
		out.propCount = 0;
		for (const p of props) {
			if (Math.floor(p.x / config.chunkSize) !== cx || Math.floor(p.z / config.chunkSize) !== cz)
				continue;
			const n = out.propCount++;
			out.propType[n] = p.type;
			out.propKind[n] = PROP_KIND.blocking;
			out.propX[n] = p.x - cx * config.chunkSize;
			out.propZ[n] = p.z - cz * config.chunkSize;
		}
	});
	const renderer = createChunkRenderer(game, chunks, { ...config, fade: FADE }, types);
	const place = (heroX: number, heroZ: number): void => {
		for (let i = 0; i < 60; i++) {
			chunks.update(heroX, heroZ);
			renderer.update(0, 0, heroX, heroZ);
		}
	};
	return { game, renderer, place, dispose };
}

/** Camera 20 u south of the hero's column, 31 u up (55 degrees, radius 38). */
const view = (heroX: number, heroZ: number): FadeView => ({
	cameraX: heroX,
	cameraZ: heroZ - 25,
	cameraHeight: 31,
	heroX,
	heroZ,
	heroHeight: FADE.heroHeight,
});

function run(renderer: ReturnType<typeof setup>["renderer"], v: FadeView, seconds: number): void {
	for (let i = 0; i < seconds * 60; i++) renderer.updateFade(v, 1 / 60);
}

describe("prop fade", () => {
	it("fades a tall prop that hides the hero and brings it back when the line of sight clears", () => {
		const { renderer, place, dispose } = setup([{ x: 8, z: 4, type: TREE }]);
		place(8, 5);
		expect(renderer.minAlpha()).toBe(1);

		run(renderer, view(8, 5), 1);
		expect(renderer.minAlpha()).toBeLessThanOrEqual(FADE.alpha + 0.01);
		expect(renderer.minAlpha()).toBeGreaterThanOrEqual(FADE.alpha - 0.001);

		// The hero walks 7 u past the tree: it is no longer between the camera and the hero.
		run(renderer, view(8, -3), 1);
		expect(renderer.minAlpha()).toBe(1);
		dispose();
	});

	it("leaves props that do not hide the hero alone", () => {
		const { renderer, place, dispose } = setup([
			{ x: 8, z: 2, type: TREE }, // 3 u in front of the hero: the sight line is above its top
			{ x: 11, z: 4, type: TREE }, // 3 u to the side
			{ x: 8, z: 9, type: TREE }, // behind the hero
		]);
		place(8, 5);
		run(renderer, view(8, 5), 1);
		expect(renderer.minAlpha()).toBe(1);
		dispose();
	});

	it("keeps the fade through a buffer rebuild (the opacity is stored per prop, not per instance)", () => {
		const { renderer, place, dispose } = setup([
			{ x: 8, z: 4, type: TREE },
			{ x: 9, z: 8, type: 0 },
		]);
		place(8, 5);
		run(renderer, view(8, 5), 1);
		const faded = renderer.minAlpha();
		// A new instance order: the second prop type now precedes nothing, but the ring is rebuilt on origin change.
		renderer.update(0, 0, 8, 5);
		renderer.update(1, 0, 8, 5);
		renderer.update(0, 0, 8, 5);
		expect(renderer.minAlpha()).toBeCloseTo(faded, 6);
		dispose();
	});

	it("allocates no arrays per call", () => {
		const { renderer, place, dispose } = setup([{ x: 8, z: 4, type: TREE }]);
		place(8, 5);
		for (let i = 0; i < 30; i++) renderer.updateFade(view(8, 5), 1 / 60);
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
			for (let i = 0; i < 1000; i++) renderer.updateFade(view(8, i % 2 === 0 ? 5 : -3), 1 / 60);
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
		dispose();
	});

	it("compiles the tree material with INSTANCESCOLOR when its first instances appear after the first render", async () => {
		const { game, renderer, place, dispose } = setup([{ x: 8, z: 4, type: TREE }]);
		// First frame: the ring is empty, the material compiles without instances.
		renderer.update(0, 0, 8000, 8000);
		const mesh = game.scene.getMeshByName(PLACEHOLDER_PROPS[TREE]?.name ?? "");
		const subMesh = mesh?.subMeshes[0];
		if (mesh && subMesh) {
			for (let i = 0; i < 5; i++) {
				mesh.material?.isReadyForSubMesh(mesh, subMesh, false);
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
		}
		expect(definesOf(game)).not.toContain("INSTANCESCOLOR");
		place(8, 5);
		for (let i = 0; i < 5; i++) {
			game.scene.render();
			await new Promise((resolve) => setTimeout(resolve, 20));
		}
		const defines = definesOf(game);
		expect(defines).toContain("INSTANCESCOLOR");
		dispose();
	});

	it("compiles with INSTANCESCOLOR when instances exist at the first render", () => {
		const { game, place, dispose } = setup([{ x: 8, z: 4, type: TREE }]);
		place(8, 5);
		game.scene.render();
		game.scene.render();
		expect(definesOf(game)).toContain("INSTANCESCOLOR");
		dispose();
	});

	it("resets the opacity of a recycled slot so the new chunk's props are not born faded", () => {
		const { renderer, place, dispose } = setup([{ x: 8, z: 4, type: TREE }]);
		place(8, 5);
		run(renderer, view(8, 5), 1);
		expect(renderer.minAlpha()).toBeLessThan(1);
		// The hero walks far away: the tree's chunk is released and its slot reused by other chunks.
		place(8 + 16 * 12, 5);
		expect(renderer.minAlpha()).toBe(1);
		dispose();
	});
});
