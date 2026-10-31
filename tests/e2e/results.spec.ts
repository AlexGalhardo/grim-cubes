import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			killHero(): void;
			meta(): { souls: number; record: number; runs: number };
		};
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("dying shows the results, credits souls and the record, and they survive a reload", async ({
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
	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.killHero());

	await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId("results-round")).toHaveText("1");
	await expect(page.getByTestId("results-seed")).toHaveText("1");
	await expect(page.getByTestId("results-souls")).toHaveText("5", { timeout: 10_000 });
	await expect(page).toHaveScreenshot(`results-${testInfo.project.name}.png`, { animations: "disabled" });

	// The save is written asynchronously after the run ends.
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.meta().souls))
		.toBe(5);
	await page.waitForTimeout(500);

	await page.reload();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const meta = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.meta());
	expect(meta).toEqual({ souls: 5, record: 1, runs: 1 });
});
