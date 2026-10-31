import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: { state(): { run: string; round: number }; toRound(n: number): void; killBoss(): void };
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("round 10: boss intro, boss bar, death, boss chest (keep 2 of 3) and back to the shop", async ({
	page,
}, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string; round: number }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "", round: 0 });
	await expect.poll(async () => (await state()).run, { timeout: 10_000 }).toBe("Round");

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.toRound(10));
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 15_000 });
	await page.keyboard.press("Enter");

	await expect(page.getByTestId("boss-intro")).toBeVisible({ timeout: 10_000 });
	await expect(page.getByTestId("boss-intro")).toHaveText("O Coveiro");
	await expect(page.getByTestId("boss-bar")).toBeVisible({ timeout: 10_000 });
	await expect(page.getByRole("progressbar", { name: "O Coveiro" })).toHaveAttribute(
		"aria-valuemax",
		"1200",
	);
	await expect(page).toHaveScreenshot(`boss-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.killBoss());
	const cards = page.locator('[data-testid^="levelup-card-"]');
	await expect(cards).toHaveCount(3, { timeout: 10_000 });
	await page.keyboard.press("1");
	await expect(cards).toHaveCount(2);
	await page.keyboard.press("1");
	await expect(cards).toHaveCount(0);
	await expect(page.getByTestId("boss-bar")).toHaveCount(0);
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 15_000 });
});
