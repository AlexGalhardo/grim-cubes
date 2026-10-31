import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const enemies = JSON.parse(readFileSync("data/enemies.json", "utf8")) as { id: string }[];

// Needs a build made with GC_DEBUG_API=1 (the `?art=` review route is compiled out of release builds). One capture
// per enemy type at each target: the model as the review scene draws it, with the shared character atlas (A-02-02b).
for (const { id } of enemies) {
	test(`the ${id} model is drawn`, async ({ page }, testInfo) => {
		await page.goto(`/?debug=1&art=${id}`);
		await page.waitForFunction(
			() => (window as unknown as { gc?: { ready?: boolean } }).gc?.ready === true,
		);
		await expect(page.locator("canvas#game")).toHaveScreenshot(
			`enemy-${id}-${testInfo.project.name}.png`,
			{
				animations: "disabled",
				maxDiffPixelRatio: 0.05,
			},
		);
	});
}
