import { expect, test } from "vitest";
import { createNullEngine } from "../engine";
import { CAMERA } from "./camera";
import { createGameScene } from "./scene";

test("minimal scene stays within the E-03-02 mesh budget", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	game.setHeroPosition(3, -2);
	game.scene.render();
	expect(game.scene.meshes.length).toBeLessThanOrEqual(5);
	expect(game.scene.getActiveMeshes().length).toBeLessThanOrEqual(5);
	expect(game.scene.lights.length).toBe(2);
	game.dispose();
	dispose();
});

test("camera uses the GDD §5 constants", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	expect(game.camera.beta).toBeCloseTo(CAMERA.beta);
	expect(game.camera.radius).toBe(CAMERA.radius);
	expect(game.camera.fov).toBeCloseTo(CAMERA.fov);
	game.dispose();
	dispose();
});
