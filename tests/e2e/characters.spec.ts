import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

interface DebugWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			toRound(round: number): void;
			freeze(): void;
			holdIdle(): void;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1. The hero is a skeleton rig with its weapon in the socket (P-06-06).
test("the hero is drawn as a skeleton character with its weapon", async ({ page }, testInfo) => {
	await openFrozenAtIntro(page, "/?debug=1&seed=42");
	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.freeze();
		debug?.holdIdle();
	});
	await page.clock.runFor(50);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`hero-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
});

test("the Gravedigger is drawn as a skeleton character, not as a Husk", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=42");
	await page.waitForFunction(() => (window as unknown as DebugWindow).gc?.ready === true);
	const hasDebug = await page.evaluate(
		() => (window as unknown as DebugWindow).gc?.debug?.toRound !== undefined,
	);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.state().run), {
			timeout: 15_000,
		})
		.toBe("Round");
	await page.evaluate(() => (window as unknown as DebugWindow).gc?.debug?.toRound(10));
	// Like boss.spec: the shop opens first, then the boss intro and the fight.
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 15_000 });
	await page.keyboard.press("Enter");
	await expect(page.getByTestId("boss-bar")).toBeVisible({ timeout: 15_000 });
	await page.evaluate(() => {
		const debug = (window as unknown as DebugWindow).gc?.debug;
		debug?.freeze();
		debug?.holdIdle();
	});
	await page.waitForTimeout(300);
	await expect(page.locator("canvas#game")).toHaveScreenshot(`gravedigger-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.15,
	});
});
