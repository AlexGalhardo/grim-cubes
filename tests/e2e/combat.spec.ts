import { expect, test } from "@playwright/test";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			dropFragments(count: number): void;
			freeze(): void;
			vfx(): {
				projectiles: { live: number };
				fragments: { live: number };
			};
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The round20 bench scenario keeps 100 enemies and ~200 projectiles alive; 50
// fragment piles are dropped 4-6 u from the hero, outside its 2.5 u pickup magnet, so none is collected before the
// count. Shots and drops must be visible (P-04-06).
test("projectiles and fragment piles are drawn", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&bench=round20");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.dropFragments !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.dropFragments(50));
	const stats = (): Promise<{ shots: number; piles: number }> =>
		page.evaluate(() => {
			const v = (window as unknown as DebugWindow).gc?.debug?.vfx();
			return { shots: v?.projectiles.live ?? 0, piles: v?.fragments.live ?? 0 };
		});
	await expect.poll(async () => (await stats()).shots, { timeout: 20_000 }).toBeGreaterThanOrEqual(150);
	await expect.poll(async () => (await stats()).piles, { timeout: 10_000 }).toBe(50);

	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.freeze());
	await page.waitForTimeout(500);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`combat-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.05,
	});
});
