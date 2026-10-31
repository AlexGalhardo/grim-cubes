import { presetsData } from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { applyPreset, createDynamicScaler, pickAutoPreset, type QualityEngine } from "./quality";
import { createGameScene } from "./scene";

function fakeEngine(): QualityEngine & { levels: number[] } {
	const levels: number[] = [];
	let current = 1;
	return {
		levels,
		setHardwareScalingLevel(level): void {
			current = level;
			levels.push(level);
		},
		getHardwareScalingLevel: () => current,
	};
}

const preset = (id: string) => {
	const found = presetsData.presets.find((p) => p.id === id);
	if (!found) throw new Error(`no preset ${id}`);
	return found;
};

describe("presets data", () => {
	it("follows the SDD 14 table: caps 100/100/100/60/40, shadows and pools shrink", () => {
		expect(presetsData.presets.map((p) => [p.id, p.enemyCap, p.decalPool, p.particlePool])).toEqual([
			["ultra", 100, 200, 600],
			["high", 100, 200, 600],
			["medium", 100, 100, 300],
			["low", 60, 60, 200],
			["minimum", 40, 30, 100],
		]);
		expect(presetsData.presets.some((p) => p.id === presetsData.default)).toBe(true);
	});
});

describe("applyPreset", () => {
	it("switches shadows and the render scale with the preset", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const fake = fakeEngine();
		const high = applyPreset(game, fake, preset("high"));
		expect([high.shadowsEnabled, high.hardwareScalingLevel, high.enemyCap]).toEqual([true, 1, 100]);
		const minimum = applyPreset(game, fake, preset("minimum"));
		expect(game.scene.shadowsEnabled).toBe(false);
		expect(minimum.hardwareScalingLevel).toBeCloseTo(1 / 0.75, 5);
		expect(minimum.enemyCap).toBe(40);
		dispose();
	});
});

describe("dynamic scaler", () => {
	const config = presetsData.dynamicScale;

	it("starts at devicePixelRatio / 1.5 and degrades one step after 3 s of p99 above 45 ms", () => {
		const engine = fakeEngine();
		const scaler = createDynamicScaler(engine, config, 3);
		expect(scaler.level).toBeCloseTo(2, 5);
		const slower = createDynamicScaler(fakeEngine(), config, 1.5);
		expect(slower.level).toBe(1);
		for (let i = 0; i < 300; i++) slower.frame(60);
		expect(slower.level).toBeGreaterThan(1);
		expect(slower.level).toBeLessThanOrEqual(config.maxLevel);
	});

	it("never goes beyond the maximum and recovers slowly once frames are fast again", () => {
		const engine = fakeEngine();
		const scaler = createDynamicScaler(engine, config, 1);
		for (let i = 0; i < 4000; i++) scaler.frame(80);
		expect(scaler.level).toBe(config.maxLevel);
		const degraded = scaler.level;
		for (let i = 0; i < 1500; i++) scaler.frame(16);
		expect(scaler.level).toBeLessThan(degraded);
		expect(scaler.level).toBeGreaterThanOrEqual(1);
	});

	it("leaves the level alone while disabled", () => {
		const scaler = createDynamicScaler(fakeEngine(), config, 1);
		scaler.setEnabled(false);
		for (let i = 0; i < 2000; i++) scaler.frame(80);
		expect(scaler.level).toBe(1);
	});
});

describe("automatic preset", () => {
	const auto = presetsData.auto;
	const pick = (hw: Parameters<typeof pickAutoPreset>[1]): string => pickAutoPreset(auto, hw);

	it("chooses Low on Android and Minimum on a software renderer or a 2 GB phone", () => {
		expect(pick({ mobile: true, cores: 8, memoryGb: 4, renderer: "Adreno (TM) 640" })).toBe("low");
		expect(pick({ mobile: true, cores: 8, memoryGb: 2 })).toBe("minimum");
		expect(pick({ mobile: false, cores: 16, renderer: "ANGLE (Google, SwiftShader Device)" })).toBe(
			"minimum",
		);
	});

	it("falls back without deviceMemory: cores and renderer alone decide", () => {
		expect(pick({ mobile: false, cores: 2 })).toBe("low");
		expect(pick({ mobile: false, cores: 4 })).toBe("medium");
		expect(pick({ mobile: false, cores: 8 })).toBe("high");
		expect(pick({ mobile: true })).toBe("low");
		expect(pick({ mobile: false })).toBe(auto.fallback);
	});

	it("uses memory when the browser exposes it and always names a preset that exists", () => {
		expect(pick({ mobile: false, cores: 8, memoryGb: 4 })).toBe("medium");
		for (const rule of auto.rules)
			expect(presetsData.presets.some((p) => p.id === rule.preset)).toBe(true);
		expect(presetsData.presets.some((p) => p.id === auto.fallback)).toBe(true);
	});
});
