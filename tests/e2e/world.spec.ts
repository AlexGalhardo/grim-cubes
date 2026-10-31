import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

// P-01-03 capture: the Cemetery floor and props at the start of a run, before the first spawn reaches the screen,
// so the frame is deterministic for the fixed seed. Only the canvas is compared (no HUD).
test("renders the Cemetery world and matches the baseline", async ({ page }, testInfo) => {
	await openFrozenAtIntro(page, "/?seed=42");
	await expect(page.locator("canvas#game")).toHaveScreenshot(
		`world-cemetery-${testInfo.project.name}.png`,
		{
			animations: "disabled",
			// Coarse like boot-*: asset loading timing moves the 3D frame by several percent under CPU load.
			maxDiffPixelRatio: 0.1,
		},
	);
});
