import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createVat, loadVat, parseVat, setVatClip, type VatMeta } from "./loader";

const meta: VatMeta = {
	format: "rgba32f",
	fps: 12,
	boneCount: 2,
	width: 12,
	height: 4,
	clips: { idle: { from: 0, to: 1 }, walk: { from: 2, to: 3 } },
};
const bin = (): ArrayBuffer => new Float32Array(meta.width * meta.height * 4).buffer;

describe("vat loader", () => {
	it("rejects size mismatches and oversized textures", () => {
		expect(() => parseVat(new ArrayBuffer(8), meta)).toThrow("size mismatch");
		expect(() => parseVat(bin(), { ...meta, width: 5000 })).toThrow("4096");
	});

	it("builds a float NEAREST texture and a manager on a NullEngine", () => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		const vat = createVat(scene, "husk", bin(), meta);
		expect(vat.texture.getSize()).toEqual({ width: 12, height: 4 });
		expect(vat.texture.samplingMode).toBe(1);
		expect(vat.manager.texture).toBe(vat.texture);
		setVatClip(vat, "walk", 3);
		expect(Array.from(vat.manager.animationParameters.asArray())).toEqual([2, 3, 3, 12]);
		expect(() => setVatClip(vat, "dance")).toThrow("dance");
		scene.dispose();
		dispose();
	});

	it("rejects non-OK responses instead of parsing an error page", async () => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		const notFound = async (): Promise<Response> => new Response("nope", { status: 404 });
		await expect(loadVat(scene, "x", "/a.bin", "/a.json", notFound)).rejects.toThrow("404");
		scene.dispose();
		dispose();
	});
});
