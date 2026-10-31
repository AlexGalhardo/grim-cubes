import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			meta(): { souls: number };
			grantSouls(amount: number): void;
			openOssuary(): void;
			heroMaxHp(): number;
		};
	};
}

const debug = <T>(
	page: import("@playwright/test").Page,
	run: (d: NonNullable<NonNullable<DebugGc["gc"]>["debug"]>) => T,
): Promise<T> => page.evaluate(`(${run.toString()})(window.gc.debug)`) as Promise<T>;

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("buying flesh_1 with 50 souls adds 10 max HP on the next run", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const base = await debug(page, (d) => d.heroMaxHp());
	await debug(page, (d) => d.grantSouls(50));
	await expect.poll(() => debug(page, (d) => d.meta().souls)).toBe(50);

	await debug(page, (d) => d.openOssuary());
	await expect(page.getByRole("dialog", { name: "Ossuário" })).toBeVisible();
	await expect(page.getByTestId("ossuary-souls")).toContainText("50");
	await expect(page.getByTestId("ossuary-node-flesh_2")).toBeDisabled();
	await expect(page).toHaveScreenshot(`ossuary-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});

	// The mobile layout shows one branch at a time; the desktop shows all of them.
	await page.getByTestId("ossuary-node-flesh_1").click();
	await expect(page.getByTestId("ossuary-node-flesh_1")).toHaveAttribute("data-state", "owned");
	await expect(page.getByTestId("ossuary-souls")).toContainText("0 almas");

	await page.reload();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	await expect.poll(() => debug(page, (d) => d.heroMaxHp())).toBe(base + 10);
	expect(await debug(page, (d) => d.meta().souls)).toBe(0);
});
