import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: { state(): { run: string; level: number }; grantXp(amount: number): void };
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("a level-up shows three cards, key 1 picks one and the run resumes", async ({ page }, testInfo) => {
	// SwiftShader renders the full 49-chunk world slowly at 1080p and 1440p.
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string; level: number }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "", level: 0 });
	await expect.poll(async () => (await state()).run, { timeout: 10_000 }).toBe("Round");

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.grantXp(10));
	const cards = page.locator('[data-testid^="levelup-card-"]');
	await expect(cards).toHaveCount(3);
	expect((await state()).run).toBe("Paused");
	await expect(page).toHaveScreenshot(`levelup-${testInfo.project.name}.png`, { animations: "disabled" });

	await page.keyboard.press("1");
	await expect(cards).toHaveCount(0);
	await expect.poll(async () => (await state()).run).toBe("Round");
});
