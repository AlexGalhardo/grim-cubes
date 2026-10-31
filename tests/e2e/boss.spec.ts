// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot follow the `export *` re-exports of @playwright/test.
import { expect, type Page, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			toRound(n: number): void;
			killBoss(): void;
			freeze(): void;
		};
	};
}

/** Opens round 10 and returns once the boss bar is up. Needs a build made with GC_DEBUG_API=1. */
async function openBossRound(page: Page): Promise<void> {
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string; round: number }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "", round: 0 });
	await expect.poll(async () => (await state()).run, { timeout: 40_000 }).toBe("Round");

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.toRound(10));
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 40_000 });
	await page.keyboard.press("Enter");

	await expect(page.getByTestId("boss-intro")).toBeVisible({ timeout: 40_000 });
	await expect(page.getByTestId("boss-intro")).toHaveText("O Coveiro");
	await expect(page.getByTestId("boss-bar")).toBeVisible({ timeout: 40_000 });
	await expect(page.getByRole("progressbar", { name: "O Coveiro" })).toHaveAttribute(
		"aria-valuemax",
		"1200",
	);
}

// SwiftShader renders the boss scene at a few fps at 1080p and 1440p, and game time keeps running while Playwright
// waits for a stable screenshot: the hero dies before the test can kill the boss. So the capture and the flow are
// separate tests, and the capture freezes the simulation first.
test("round 10: the boss scene matches the baseline", async ({ page }, testInfo) => {
	test.slow();
	await openBossRound(page);
	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.freeze());
	await expect(page).toHaveScreenshot(`boss-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});
});

test("round 10: boss death, boss chest (keep 2 of 3) and back to the shop", async ({ page }) => {
	test.slow();
	await openBossRound(page);

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.killBoss());
	const cards = page.locator('[data-testid^="levelup-card-"]');
	await expect(cards).toHaveCount(3, { timeout: 40_000 });
	await page.keyboard.press("1");
	await expect(cards).toHaveCount(2);
	await page.keyboard.press("1");
	await expect(cards).toHaveCount(0);
	await expect(page.getByTestId("boss-bar")).toHaveCount(0);
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 40_000 });
});
