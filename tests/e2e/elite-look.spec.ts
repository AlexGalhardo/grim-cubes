import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

interface DebugWindow {
	gc?: {
		debug?: {
			spawnElite(modifier?: number): void;
			showChest(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. An elite with the first modifier next to its chest: bigger than a common
// enemy and tinted by its aura (P-05-06b). The frozen clock keeps the frame identical between runs.
test("an elite is drawn larger and tinted, with its chest on the ground", async ({ page }, testInfo) => {
	await openFrozenAtIntro(page, "/?debug=1&seed=42");
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.showChest !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.spawnElite(1);
		debug?.showChest();
	});
	// One slice of the fake clock lets the canvas draw what the debug calls added.
	await page.clock.runFor(50);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`elite-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
});
