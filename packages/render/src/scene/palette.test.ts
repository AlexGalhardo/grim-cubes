import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PALETTE } from "./palette";

test("every skin tint in milestones.json names a PALETTE colour and a theme.css token", () => {
	const milestones = JSON.parse(
		readFileSync(new URL("../../../../data/milestones.json", import.meta.url), "utf8"),
	) as { skins: { tint: string }[] };
	const theme = readFileSync(new URL("../../../ui/src/theme.css", import.meta.url), "utf8");
	for (const { tint } of milestones.skins) {
		const key = tint.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
		expect(PALETTE, tint).toHaveProperty(key);
		expect(theme, tint).toContain(`--color-${tint}:`);
		expect(PALETTE[key as keyof typeof PALETTE].toLowerCase()).toBe(
			new RegExp(`--color-${tint}:s*(#[0-9a-f]{6})`, "i").exec(theme)?.[1]?.toLowerCase(),
		);
	}
});
