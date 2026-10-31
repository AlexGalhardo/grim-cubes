import { expect, test } from "@playwright/test";

interface GcWindow {
	gc?: { ready?: boolean };
}

// P-01-03 capture: the Cemetery floor and props at the start of a run, before the first spawn reaches the screen,
// so the frame is deterministic for the fixed seed. Only the canvas is compared (no HUD).
test("renders the Cemetery world and matches the baseline", async ({ page }, testInfo) => {
	await page.goto("/?seed=42");
	await page.waitForFunction(() => (window as unknown as GcWindow).gc?.ready === true);
	await expect(page.locator("canvas#game")).toHaveScreenshot(
		`world-cemetery-${testInfo.project.name}.png`,
		{
			animations: "disabled",
		},
	);
});
