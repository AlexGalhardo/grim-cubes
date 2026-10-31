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

const BIOMES = [
	{ id: "sunken_cemetery", x: 60 },
	{ id: "bone_swamp", x: 190 },
	{ id: "infernal_forge", x: 340 },
	{ id: "biomech_nest", x: 520 },
];

// Needs a build made with GC_DEBUG_API=1. One capture per biome: floor tint, fog and props (A-02-01).
for (const biome of BIOMES) {
	test(`the ${biome.id} biome is drawn with its own floor, fog and props`, async ({ page }, testInfo) => {
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
		await page.evaluate((x) => (window as unknown as DebugWindow).gc?.debug?.teleport(x, 0), biome.x);
		await expect
			.poll(() => page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.biome()), {
				timeout: 20_000,
			})
			.toEqual({ id: biome.id, loaded: true });
		await page.waitForTimeout(800);
		await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.freeze());
		await page.waitForTimeout(300);
		await expect(page.locator("canvas#game")).toHaveScreenshot(
			`biome-${biome.id}-${testInfo.project.name}.png`,
			{
				animations: "disabled",
				maxDiffPixelRatio: 0.2,
			},
		);
	});
}
