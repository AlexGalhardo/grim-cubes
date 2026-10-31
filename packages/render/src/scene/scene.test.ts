import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { expect, test } from "vitest";
import { createNullEngine } from "../engine";
import { CAMERA } from "./camera";
import { PALETTE } from "./palette";
import { createGameScene } from "./scene";

test("minimal scene stays within the E-03-02 mesh budget", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	game.setHeroPosition(3, -2);
	game.scene.render();
	expect(game.scene.meshes.length).toBeLessThanOrEqual(5);
	expect(game.scene.getActiveMeshes().length).toBeLessThanOrEqual(5);
	expect(game.scene.lights.length).toBe(3);
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

test("tints the hero by palette token and rejects an unknown one", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const hero = game.hero.material as StandardMaterial;
	game.setHeroTint("ember-light");
	expect(hero.diffuseColor.toHexString().toUpperCase()).toBe(PALETTE.emberLight.toUpperCase());
	expect(() => game.setHeroTint("not-a-token")).toThrow(RangeError);
	game.dispose();
	dispose();
});

test("shifting the world moves the ground the opposite way", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const ground = game.scene.getMeshByName("ground");
	game.shiftWorld(4, -2);
	expect([ground?.position.x, ground?.position.z]).toEqual([-4, 2]);
	game.dispose();
	dispose();
});
