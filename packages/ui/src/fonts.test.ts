import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("packages/ui/src/theme.css", "utf8");

/** Code points a `unicode-range` descriptor covers. */
function covers(range: string, codePoint: number): boolean {
	return range.split(",").some((part) => {
		const [from, to] = part.trim().replace("U+", "").split("-");
		const low = Number.parseInt(from ?? "", 16);
		const high = to === undefined ? low : Number.parseInt(to, 16);
		return codePoint >= low && codePoint <= high;
	});
}

describe("digits font (Art Bible 16.2)", () => {
	const face = /@font-face\s*\{[^}]*font-family:\s*"GC Digits";[^}]*\}/.exec(css)?.[0] ?? "";
	const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1] ?? "";

	it("cuts the digits and the signs written next to them from Inter", () => {
		expect(face).toContain("/fonts/inter-latin.woff2");
		for (const char of "0123456789%+,./:×−")
			expect(covers(range, char.codePointAt(0) ?? 0), char).toBe(true);
	});

	it("leaves every letter to the pixel font", () => {
		for (const char of "AZaz-çã ") expect(covers(range, char.codePointAt(0) ?? 0), char).toBe(false);
	});

	it("comes first in the display, mono and number stacks, so no component needs a class", () => {
		for (const token of ["--font-display", "--font-mono", "--font-num"])
			expect(css).toMatch(new RegExp(`${token}:\\s*"GC Digits"`));
		expect(css).toContain("font-variant-numeric: tabular-nums");
	});
});
