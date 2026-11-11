import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { presetsData, renderData } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { addContour, CONTOUR_BOSS, CONTOUR_ELITE, CONTOUR_ENEMY } from "./contour";
import { paletteHex } from "./palette";
import { applyPreset } from "./quality";
import { createGameScene } from "./scene";

describe("contour config (data/render.json)", () => {
	it("names Art Bible palette tokens per role: hero bone, enemy neutral, elite and boss ember", () => {
		const { contour } = renderData;
		expect(contour.hero).toBe("bone");
		expect(contour.elite).toBe("ember");
		expect(contour.boss).toBe("ember");
		expect(contour.enemy).toBe("iron-light");
		for (const token of [contour.hero, contour.enemy, contour.elite, contour.boss])
			expect(paletteHex(token)).toMatch(/^#[0-9A-F]{6}$/i);
		expect(contour.strength).toBeGreaterThan(0);
		expect(contour.power).toBeGreaterThan(0);
	});

	it("keeps the per-instance role codes in the order the shader thresholds expect", () => {
		expect([CONTOUR_ENEMY, CONTOUR_ELITE, CONTOUR_BOSS]).toEqual([1, 2, 3]);
	});

	it("rejects an unknown palette token", () => {
		expect(() => paletteHex("no-such-token")).toThrow(RangeError);
	});
});

describe("contour per preset", () => {
	it("is on from Ultra to Low and off only on Minimo", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const material = new StandardMaterial("characters", game.scene);
		addContour(material, renderData.contour, "hero");
		const states = presetsData.presets.map((preset) => {
			applyPreset(game, { setHardwareScalingLevel() {}, getHardwareScalingLevel: () => 1 }, preset);
			return [preset.id, material.pluginManager?.getPlugin<{ enabled: boolean }>("Contour")?.enabled];
		});
		expect(states).toEqual([
			["ultra", true],
			["high", true],
			["medium", true],
			["low", true],
			["minimum", false],
		]);
		dispose();
	});
});
