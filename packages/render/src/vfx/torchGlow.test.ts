import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { expect, it } from "vitest";
import { toLoaderLocalX } from "../coords";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createTorchGlow } from "./torchGlow";

function matrices(points: readonly (readonly [number, number])[]): { buffer: Float32Array; count: number } {
	const buffer = new Float32Array(points.length * 16);
	points.forEach(([x, z], i) => {
		buffer[i * 16 + 12] = toLoaderLocalX(x);
		buffer[i * 16 + 14] = z;
	});
	return { buffer, count: points.length };
}

it("draws a halo and a ground pool per fire, flickering over time", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const torch = matrices([
		[3, 4],
		[-6, 2],
	]);
	const bonfire = matrices([[10, -5]]);
	const glow = createTorchGlow(
		game,
		[
			{ type: 0, flameHeight: 1.8, halo: 1.6 },
			{ type: 1, flameHeight: 0.7, halo: 2.6 },
		],
		(type) => (type === 0 ? torch : bonfire),
	);
	glow.sync(0, 0, 0);
	expect(glow.live).toBe(3);
	expect((game.scene.getMeshByName("vfx_torch_halo") as Mesh | null)?.thinInstanceCount).toBe(3);
	expect((game.scene.getMeshByName("vfx_torch_pool") as Mesh | null)?.thinInstanceCount).toBe(3);
	const read = (): number[] => {
		const mesh = game.scene.getMeshByName("vfx_torch_halo") as unknown as {
			_thinInstanceDataStorage: { matrixData: Float32Array };
		};
		const m = mesh._thinInstanceDataStorage.matrixData;
		return [m[0] ?? 0, m[16] ?? 0, m[32] ?? 0];
	};
	const a = read();
	glow.sync(0.17, 0, 0);
	const b = read();
	expect(b).not.toEqual(a);
	expect(b[2]).toBeGreaterThan(b[0] ?? 0);
	dispose();
});

it("draws nothing when no fire is in range", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const glow = createTorchGlow(game, [{ type: 0, flameHeight: 1, halo: 1 }], () => ({
		buffer: new Float32Array(0),
		count: 0,
	}));
	glow.sync(1, 0, 0);
	expect(glow.live).toBe(0);
	dispose();
});

it("skips fires beyond the view radius around the hero", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const fires = matrices([
		[3, 4],
		[200, 0],
	]);
	const glow = createTorchGlow(game, [{ type: 0, flameHeight: 1, halo: 1 }], () => fires);
	glow.sync(0, 0, 0);
	expect(glow.live).toBe(1);
	glow.sync(0, 200, 0);
	expect(glow.live).toBe(1);
	dispose();
});
