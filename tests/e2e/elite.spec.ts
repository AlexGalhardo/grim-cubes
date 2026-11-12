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
test("an elite always drops one fragment, which the HUD counts and the run keeps fighting", async ({
	page,
}) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const state = (): Promise<{ run: string }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state() ?? { run: "" });
	await expect.poll(async () => (await state()).run, { timeout: 10_000 }).toBe("Round");
	await expect(page.getByTestId("hud-fragments")).toContainText("0");

	await page.evaluate(() => {
		const debug = (window as unknown as DebugGc).gc?.debug;
		debug?.spawnElite(0);
		debug?.killElites();
	});

	await expect(page.getByTestId("hud-fragments")).toContainText("1", { timeout: 10_000 });
	expect((await state()).run).toBe("Round");
	await expect(page.locator('[data-testid^="levelup-card-"]')).toHaveCount(0);
});
