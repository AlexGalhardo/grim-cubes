import { expect, test } from "@playwright/test";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			teleport(x: number, z: number): void;
			biome(): { id: string; loaded: boolean };
			freeze(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The hero stands on the 120 u boundary between the cemetery and the swamp:
// the fog is halfway between the two colours and chunks of both biomes are on screen (A-02-01).
test("the 120 u border mixes the fog and shows both biomes", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=42");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.biome !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.state().run), {
			timeout: 15_000,
		})
		.toBe("Round");
	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.teleport(120, 0));
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.biome()), {
			timeout: 20_000,
		})
		.toMatchObject({ loaded: true });
	await page.waitForTimeout(800);
	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.freeze());
	await page.waitForTimeout(300);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`biome-border-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.2,
	});
});
