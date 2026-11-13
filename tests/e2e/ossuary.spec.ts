import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			meta(): { souls: number };
			grantSouls(amount: number): void;
			openOssuary(): void;
		};
	};
}

const debug = <T>(
	page: import("@playwright/test").Page,
	run: (d: NonNullable<NonNullable<DebugGc["gc"]>["debug"]>) => T,
): Promise<T> => page.evaluate(`(${run.toString()})(window.gc.debug)`) as Promise<T>;

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("buying the first Shockwave square spends 20 souls and stays bought", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	await debug(page, (d) => d.grantSouls(50));
	await expect.poll(() => debug(page, (d) => d.meta().souls)).toBe(50);

	await debug(page, (d) => d.openOssuary());
	await expect(page.getByRole("dialog", { name: "Ossuário" })).toBeVisible();
	await expect(page.getByTestId("ossuary-souls")).toContainText("50");
	// Level 3 needs the square below it. The first square of each spell is level 2.
	await expect(page.getByTestId("ossuary-node-warrior_shockwave_3")).toBeDisabled();
	await expect(page).toHaveScreenshot(`ossuary-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});

	await page.getByTestId("ossuary-node-warrior_shockwave_2").click();
	await expect(page.getByTestId("ossuary-node-warrior_shockwave_2")).toHaveAttribute("data-state", "owned");
	await expect(page.getByTestId("ossuary-souls")).toContainText("30 almas");

	await page.reload();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	await debug(page, (d) => d.openOssuary());
	await expect(page.getByTestId("ossuary-node-warrior_shockwave_2")).toHaveAttribute("data-state", "owned");
	expect(await debug(page, (d) => d.meta().souls)).toBe(30);
});
