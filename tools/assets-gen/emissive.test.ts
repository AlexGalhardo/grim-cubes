import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { baseModelName, emissiveMask } from "./emissive";

function texture(pixels: readonly (readonly [number, number, number, number])[]): PNG {
	const png = new PNG({ width: pixels.length, height: 1 });
	pixels.forEach((p, i) => {
		for (let n = 0; n < 4; n++) png.data[i * 4 + n] = p[n] ?? 0;
	});
	return png;
}

describe("emissive mask", () => {
	const ember = [0xe0, 0x7a, 0x2a, 255] as const;
	const blood = [0x8e, 0x1a, 0x1f, 255] as const;
	const iron = [0x5a, 0x5f, 0x66, 255] as const;

	it("keeps only the ember pixels and clears the rest", () => {
		const mask = emissiveMask(texture([iron, ember, iron]), false);
		expect(mask && Array.from(mask.data)).toEqual([0, 0, 0, 0, ...ember, 0, 0, 0, 0]);
	});

	it("keeps bloodLight only for the models that glow with it, and returns null when nothing glows", () => {
		expect(emissiveMask(texture([iron, blood]), false)).toBeNull();
		expect(emissiveMask(texture([iron, blood]), true)?.data[7]).toBe(255);
	});

	it("treats a variant like its base model", () => {
		expect(baseModelName("wail_02")).toBe("wail");
		expect(baseModelName("husk")).toBe("husk");
	});
});
