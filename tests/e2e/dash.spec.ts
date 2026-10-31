import { expect, test } from "@playwright/test";

interface Debug {
	grantSouls(amount: number): void;
	openOssuary(): void;
	heroPos(): { x: number; z: number };
	state(): { run: string };
}
interface DebugGc {
	gc?: { ready?: boolean; debug?: Debug };
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("the dash is locked until the Ossuary sells it, then moves the hero about 4 u", async ({ page }) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const debug = <T>(run: (d: Debug) => T): Promise<T> =>
		page.evaluate(`(${run.toString()})(window.gc.debug)`) as Promise<T>;
	await expect.poll(() => debug((d) => d.state().run), { timeout: 10_000 }).toBe("Round");
	await expect(page.getByTestId("dash-button")).toHaveCount(0);

	await debug((d) => d.grantSouls(150));
	await debug((d) => d.openOssuary());
	await expect(page.getByTestId("ossuary-souls")).toContainText("150");
	const tab = page.getByRole("tab", { name: "Sombra" });
	if (await tab.isVisible()) await tab.click();
	await page.getByTestId("ossuary-node-shadow_1").click();
	await expect(page.getByTestId("ossuary-node-shadow_1")).toHaveAttribute("data-state", "owned");
	await page.getByTestId("ossuary-node-shadow_2").click();
	await expect(page.getByTestId("ossuary-node-shadow_2")).toHaveAttribute("data-state", "owned");

	await page.reload();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	await expect.poll(() => debug((d) => d.state().run), { timeout: 10_000 }).toBe("Round");
	const before = await debug((d) => d.heroPos());
	const touch = (await page.getByTestId("dash-button").count()) > 0;
	if (touch) {
		const box = await page.getByTestId("dash-button").boundingBox();
		if (!box) throw new Error("dash button has no box");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		// The input is polled once per frame, so a press shorter than a frame is lost.
		await page.waitForTimeout(150);
		await page.mouse.up();
	} else {
		await page.keyboard.down("Space");
		await page.waitForTimeout(150);
		await page.keyboard.up("Space");
	}
	await page.waitForTimeout(600);
	const after = await debug((d) => d.heroPos());
	const moved = Math.hypot(after.x - before.x, after.z - before.z);
	expect(moved).toBeGreaterThan(3);
	expect(moved).toBeLessThan(5);
});
