import { renderData } from "@gc/game";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createDamageNumbers, digitAtlasLayout } from "./digits";

const config = renderData.vfx;

describe("damage number config", () => {
	it("is sized to read at a glance, with a larger crit and an outline", () => {
		expect(config.damageNumberHeight).toBeGreaterThanOrEqual(0.8);
		expect(config.damageNumberCritScale).toBeGreaterThan(1);
		expect(config.damageNumberOutline).toBeGreaterThanOrEqual(4);
	});

	it("leaves room for the outline on every side of a digit", () => {
		const layout = digitAtlasLayout(config.damageNumberOutline);
		expect(layout.atlasWidth).toBe(layout.cellWidth * 10);
		expect(layout.cellHeight - layout.baseline).toBeGreaterThanOrEqual(config.damageNumberOutline);
		expect(layout.cellWidth).toBeGreaterThan(2 * config.damageNumberOutline);
	});
});

describe("damage number atlas", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("draws each digit in Inter with a dark outline under a white fill", () => {
		const calls: string[] = [];
		const layout = digitAtlasLayout(config.damageNumberOutline);
		const ctx = {
			font: "",
			lineWidth: 0,
			strokeStyle: "",
			fillStyle: "",
			clearRect: () => {},
			strokeText: (text: string) => calls.push(`stroke${text}:${ctx.strokeStyle}:${ctx.lineWidth}`),
			fillText: (text: string) => calls.push(`fill${text}:${ctx.fillStyle}`),
			getImageData: () => ({ data: new Uint8ClampedArray(layout.atlasWidth * layout.cellHeight * 4) }),
		};
		vi.stubGlobal("document", {
			createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
		});
		const { engine, dispose } = createNullEngine();
		const scene = createGameScene(engine).scene;
		createDamageNumbers(scene, {
			pool: 4,
			lifeSeconds: 0.6,
			rise: 1,
			height: 1,
			elevation: 1,
			color: [1, 1, 1],
			critColor: [1, 0.5, 0],
			outline: config.damageNumberOutline,
			outlineColor: "#14121C",
			critScale: 1.4,
		});
		expect(ctx.font).toContain("Inter");
		expect(calls).toHaveLength(20);
		expect(calls[0]).toBe(`stroke0:#14121C:${config.damageNumberOutline * 2}`);
		expect(calls[1]).toBe("fill0:#FFFFFF");
		vi.unstubAllGlobals();
		dispose();
	});
});
