import { expect, test } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "./scene";
import { createVision } from "./vision";

function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	return { game, vision: createVision(game), dispose };
}

test("brightness and contrast drive the image processing, are clamped and return to the identity at 0 and 1", () => {
	const { game, vision, dispose } = setup();
	const config = game.scene.imageProcessingConfiguration;
	vision.setBrightness(0.3);
	expect(config.exposure).toBeCloseTo(1.3);
	vision.setBrightness(5);
	expect(vision.brightness).toBe(0.5);
	vision.setBrightness(-5);
	expect(vision.brightness).toBe(-0.5);
	vision.setContrast(1.2);
	expect(config.contrast).toBeCloseTo(1.2);
	vision.setContrast(9);
	expect(vision.contrast).toBe(1.5);
	vision.setContrast(0);
	expect(vision.contrast).toBe(0.5);
	vision.setBrightness(0);
	vision.setContrast(1);
	expect([config.exposure, config.contrast]).toEqual([1, 1]);
	dispose();
});

test("each colour-blind mode adds one post-process and off removes it", () => {
	const { game, vision, dispose } = setup();
	const count = () => game.scene.postProcesses.filter((p) => p.name === "colorblind").length;
	expect(count()).toBe(0);
	for (const mode of ["protanopia", "deuteranopia", "tritanopia"] as const) {
		vision.setColorblindMode(mode);
		expect([mode, vision.colorblindMode, count()]).toEqual([mode, mode, 1]);
	}
	vision.setColorblindMode("off");
	expect(count()).toBe(0);
	dispose();
});

test("flash reduction is a flag the VFX read", () => {
	const { vision, dispose } = setup();
	expect(vision.flashReduced).toBe(false);
	vision.setFlashReduction(true);
	expect(vision.flashReduced).toBe(true);
	dispose();
});
