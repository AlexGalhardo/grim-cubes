import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync("packages/ui/src/theme.css", "utf8");

function token(name: string): string {
	const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
	if (!match?.[1]) throw new Error(`no hex token --color-${name}`);
	return match[1];
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
	const channel = (i: number): number => {
		const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(fg: string, bg: string): number {
	const [a, b] = [luminance(token(fg)), luminance(token(bg))].sort((x, y) => y - x) as [number, number];
	return (a + 0.05) / (b + 0.05);
}

test("the luminance formula matches the WCAG reference points", () => {
	expect(luminance("#ffffff")).toBeCloseTo(1, 5);
	expect(luminance("#000000")).toBe(0);
});

test("a locked Ossuary node reads at AA: its title, lines and price on its flat night-2 plate (S-08-02)", () => {
	expect(contrast("iron-light", "night-2")).toBeGreaterThanOrEqual(4.5);
	// The bought and buyable node titles sit on the iron-black end of their gradient, the lighter one.
	expect(contrast("bone", "iron-black")).toBeGreaterThanOrEqual(4.5);
});
