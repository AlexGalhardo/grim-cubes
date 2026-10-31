import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			spawnElite(modifier?: number): void;
			killElites(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("an elite dies, drops a legendary chest and it opens with 2 choices", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "" });
	await expect.poll(async () => (await state()).run, { timeout: 10_000 }).toBe("Round");

	await page.evaluate(() => {
		const debug = (window as unknown as DebugGc).gc?.debug;
		debug?.spawnElite(0);
		debug?.killElites();
	});

	const cards = page.locator('[data-testid^="levelup-card-"]');
	await expect(cards).toHaveCount(2, { timeout: 10_000 });
	await expect(page.getByRole("heading", { name: "Baú Lendário" })).toBeVisible();
	expect((await state()).run).toBe("Paused");
	await expect(page).toHaveScreenshot(`chest-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});

	await page.keyboard.press("1");
	await expect(cards).toHaveCount(0);
	await expect.poll(async () => (await state()).run).toBe("Round");
});
