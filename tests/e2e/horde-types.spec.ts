import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

interface DebugWindow {
	gc?: {
		debug?: {
			spawnLineup(): void;
			freeze(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. One enemy of each of the 8 types goes through the VAT and the horde renderer
// in game, under the frozen clock, at the four targets (A-02-02b).
test("the eight enemy types are drawn by the horde renderer", async ({ page }, testInfo) => {
	await openFrozenAtIntro(page, "/?debug=1&seed=42");
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.spawnLineup !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	// The chunk ring around the hero fills over the first steps; the lineup looks for a row without props in it.
	await page.clock.runFor(300);
	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.spawnLineup();
		debug?.freeze();
	});
	// One slice of the fake clock lets the canvas draw what the debug call added.
	await page.clock.runFor(50);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`horde-types-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
});
