import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			grantGold(amount: number): void;
			endRound(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("the shop opens after a round, sells an offer and the next round starts", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string; round: number }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "", round: 0 });
	await expect.poll(async () => (await state()).run, { timeout: 10_000 }).toBe("Round");
	await page.evaluate(() => {
		const debug = (window as unknown as DebugGc).gc?.debug;
		debug?.grantGold(500);
		debug?.endRound();
	});

	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('[data-testid^="shop-slot-"]')).toHaveCount(4);
	const goldBefore = Number.parseInt(
		((await page.getByTestId("shop-gold").textContent()) ?? "").replace(/\D+/g, ""),
		10,
	);

	await page.getByTestId("shop-lock-1").click();
	await expect(page.getByTestId("shop-lock-1")).toHaveAttribute("aria-pressed", "true");
	await expect(page).toHaveScreenshot(`shop-${testInfo.project.name}.png`, { animations: "disabled" });

	await page.getByTestId("shop-buy-0").click();
	await expect(page.getByTestId("shop-buy-0")).toHaveText("Vendido");
	const goldAfter = Number.parseInt(
		((await page.getByTestId("shop-gold").textContent()) ?? "").replace(/\D+/g, ""),
		10,
	);
	expect(goldAfter).toBeLessThan(goldBefore);

	await page.keyboard.press("Enter");
	await expect(dialog).toHaveCount(0);
	await expect.poll(async () => (await state()).round).toBe(2);
});
