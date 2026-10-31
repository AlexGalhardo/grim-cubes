import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync("packages/ui/src/theme.css", "utf8");

test("five rarity tokens carry the Art Bible colours", () => {
	for (const n of [1, 2, 3, 4, 5]) expect(css, `rarity-${n}`).toMatch(new RegExp(`--color-rarity-${n}:`));
	expect(css).toContain("--color-rarity-1: #d9c9a3");
	expect(css).toContain("--color-epic: #7a4fb8");
	expect(css).toContain("--color-mythic: #f5d04a");
});

test("colour-blind mode marks each rarity with its own shape", () => {
	const shapes = ["●", "◆", "▲", "★", "✦"];
	shapes.forEach((shape, i) => {
		const rule = css.slice(css.indexOf(`.rarity-mark[data-tier="${i + 1}"]::before`));
		expect(rule.slice(0, 80).includes(`content: "${shape}"`), shape).toBe(true);
	});
});
