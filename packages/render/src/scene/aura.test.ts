import { describe, expect, it } from "vitest";
import { auraHex, mixAuras } from "./aura";
import { PALETTE } from "./palette";

describe("aura colours", () => {
	it("maps the four elite auras to palette tokens", () => {
		expect([auraHex("steel_gray"), auraHex("amber"), auraHex("wine"), auraHex("orange")]).toEqual([
			PALETTE.ironLight,
			PALETTE.emberLight,
			PALETTE.bloodLight,
			PALETTE.ember,
		]);
	});

	it("mixes the auras of a boss with two modifiers by averaging them", () => {
		expect(mixAuras([])).toBe("#FFFFFF");
		expect(mixAuras(["amber"])).toBe(PALETTE.emberLight.toUpperCase());
		// amber F5B04A and wine 8E1A1F: (245+142)/2 = 194 = C2, (176+26)/2 = 101 = 65, (74+31)/2 = 53 = 35 (rounded).
		expect(mixAuras(["amber", "wine"])).toBe("#C26535");
	});
});
