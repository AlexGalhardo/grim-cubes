import { expect, test } from "@playwright/test";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			spawnElite(modifier?: number): void;
			showChest(): void;
			freeze(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. An elite with the first modifier next to its chest: bigger than a common
// enemy and tinted by its aura (P-05-06b).
test("an elite is drawn larger and tinted, with its chest on the ground", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=42");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.showChest !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.state().run), {
			timeout: 10_000,
		})
		.toBe("Round");

	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.spawnElite(1);
		debug?.showChest();
	});
	await page.waitForTimeout(800);
	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.freeze());
	await page.waitForTimeout(300);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`elite-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
});
