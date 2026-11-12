import { biomesData, presetsData, renderData } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createWeather } from "./weather";

const maxPool = Math.max(...presetsData.presets.map((p) => p.particlePool));
const pool = (id: string): number => presetsData.presets.find((p) => p.id === id)?.particlePool ?? 0;

function setup(flashReduced = false) {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const state = { reduced: flashReduced };
	const weather = createWeather(game.scene, { maxPool, flashReduced: () => state.reduced });
	const done = (): void => {
		game.dispose();
		dispose();
	};
	return { weather, state, done };
}

describe("weather", () => {
	it("every biome names one of the five kinds, and the five biomes differ", () => {
		const kinds = biomesData.map((b) => b.weather);
		expect(kinds.every((k) => k !== undefined && k in renderData.weather.kinds)).toBe(true);
		expect(new Set(kinds).size).toBe(5);
	});

	it("stays inside the share of the preset's particle pool, and the Minimum preset draws none", () => {
		const { weather, done } = setup();
		for (const preset of presetsData.presets) {
			weather.setKind("rain");
			weather.setBudget(preset.particlePool);
			weather.update(0.016, 0, 0);
			expect(weather.live, preset.id).toBeLessThanOrEqual(
				Math.floor(preset.particlePool * renderData.weather.poolShare),
			);
		}
		weather.setBudget(pool("minimum"));
		weather.update(0.016, 0, 0);
		expect(weather.live).toBe(0);
		weather.setBudget(pool("high"));
		weather.update(0.016, 0, 0);
		expect(weather.live).toBeGreaterThan(0);
		done();
	});

	it("no kind means clear air, and flash reduction keeps only its share", () => {
		const { weather, state, done } = setup();
		weather.setBudget(pool("high"));
		weather.setKind("embers");
		weather.update(0.016, 0, 0);
		const full = weather.live;
		expect(full).toBeGreaterThan(0);
		state.reduced = true;
		weather.update(0.016, 0, 0);
		expect(weather.live).toBe(Math.floor(full * renderData.weather.reducedFlashShare));
		weather.setKind(null);
		weather.update(0.016, 0, 0);
		expect(weather.live).toBe(0);
		done();
	});

	it("follows the hero: particles wrap inside the box around him", () => {
		const { weather, done } = setup();
		weather.setBudget(pool("high"));
		weather.setKind("wind");
		for (let i = 0; i < 600; i++) weather.update(0.016, i * 0.5, -i * 0.25);
		expect(weather.live).toBeGreaterThan(0);
		done();
	});
});
