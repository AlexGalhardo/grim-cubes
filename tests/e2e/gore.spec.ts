import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

interface DebugWindow {
	gc?: {
		debug?: {
			setGore(full: boolean): void;
			killRing(count: number): void;
			vfx(): { decals: { live: number } };
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The same 24 deaths with full gore and with reduced gore (GDD section 23): the
// first leaves blood decals, the second leaves none and the cubes turn grey (P-04-05).
for (const full of [true, false]) {
	test(`24 deaths with ${full ? "full" : "reduced"} gore`, async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-1080", "one viewport is enough for the gore comparison");
		await openFrozenAtIntro(page, "/?debug=1&seed=42");
		const hasDebug = await page.evaluate(
			() => (window as unknown as DebugWindow).gc?.debug?.killRing !== undefined,
		);
		test.skip(!hasDebug, "build without GC_DEBUG_API");
		await page.evaluate((value) => {
			const debug = (window as unknown as DebugWindow).gc?.debug;
			debug?.setGore(value);
			debug?.killRing(24);
		}, full);
		// The fake clock is frozen: one slice lets the canvas draw the decals written by the deaths.
		await page.clock.runFor(50);
		const decals = await page.evaluate(
			() => (window as unknown as DebugWindow).gc?.debug?.vfx().decals.live ?? -1,
		);
		if (full) expect(decals).toBeGreaterThan(0);
		else expect(decals).toBe(0);
		await expect(page.locator("canvas#game")).toHaveScreenshot(
			`gore-${full ? "full" : "reduced"}-${testInfo.project.name}.png`,
			{ animations: "disabled", maxDiffPixelRatio: 0.1 },
		);
	});
}
