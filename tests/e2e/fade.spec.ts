import { expect, test } from "@playwright/test";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			tallProp(): { x: number; z: number; radius: number } | null;
			teleport(x: number, z: number): void;
			minPropAlpha(): number;
			freeze(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The camera looks north from the south, so a tall prop one unit south of
// the hero stands between the two: it must fade and the hero must stay visible (P-02-03).
test("a tall prop between the camera and the hero fades out", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-1080", "one viewport is enough for the fade capture");
	test.slow();
	await page.goto("/?debug=1&seed=42");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.tallProp !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	// Chunks load two per simulation step once the run starts.
	const tallProp = (): Promise<{ x: number; z: number; radius: number } | null | undefined> =>
		page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.tallProp());
	await expect
		.poll(tallProp, { timeout: 15_000, message: "a tall prop is loaded around the spawn" })
		.not.toBeNull();
	const prop = await tallProp();
	if (!prop) throw new Error("tall prop disappeared");

	const alpha = (): Promise<number> =>
		page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.minPropAlpha() ?? 1);
	await page.evaluate(
		([x, z]) => (window as unknown as DebugWindow).gc?.debug?.teleport(x ?? 0, z ?? 0),
		[prop.x, prop.z + prop.radius + 0.6],
	);
	await expect.poll(alpha, { timeout: 10_000 }).toBeLessThan(0.5);

	// Let the camera and the fade settle, then stop the world so consecutive captures are identical.
	await page.waitForTimeout(1500);
	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.freeze());
	await expect(page.locator("canvas#game")).toHaveScreenshot("fade-desktop-1080.png", {
		animations: "disabled",
		maxDiffPixelRatio: 0.03,
	});

	// Walking away from the prop (far to the north) clears the line of sight again.
	await page.evaluate(
		([x, z]) => (window as unknown as DebugWindow).gc?.debug?.teleport(x ?? 0, z ?? 0),
		[prop.x, prop.z + 9],
	);
	await expect.poll(alpha, { timeout: 10_000 }).toBeGreaterThan(0.95);
});
