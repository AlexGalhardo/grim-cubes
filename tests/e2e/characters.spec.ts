import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			toRound(round: number): void;
			toBossFrame(): void;
			freeze(): void;
			holdIdle(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The hero is a skeleton rig with its weapon in the socket (P-06-06).
test("the hero is drawn as a skeleton character with its weapon", async ({ page }, testInfo) => {
	await openFrozenAtIntro(page, "/?debug=1&seed=42");
	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.freeze();
		debug?.holdIdle();
	});
	await page.clock.runFor(50);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`hero-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
});

test("the Gravedigger is drawn as a skeleton character, not as a Husk", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=42");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.toBossFrame !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	// toBossFrame steps the simulation to the first frame of the boss round and freezes it: the same frame on every run.
	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.toBossFrame();
		debug?.holdIdle();
	});
	await expect(page.locator("canvas#game")).toHaveScreenshot(`gravedigger-${testInfo.project.name}.png`, {
		animations: "disabled",
	});
});
