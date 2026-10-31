import { expect, test } from "@playwright/test";
import { openFrozenAtIntro } from "./frozen";

test("boots, renders on software GL and matches the baseline", async ({ page }, testInfo) => {
	const problems: string[] = [];
	page.on("pageerror", (error) => problems.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") problems.push(message.text());
	});

	await openFrozenAtIntro(page, "/?seed=1");

	const renderer = await page.evaluate(() => {
		const gl = document.querySelector<HTMLCanvasElement>("canvas#game")?.getContext("webgl2");
		if (!gl) return null;
		const info = gl.getExtension("WEBGL_debug_renderer_info");
		return {
			masked: String(gl.getParameter(gl.RENDERER)),
			unmasked: info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "",
		};
	});
	expect(renderer, "game canvas has a WebGL2 context").not.toBeNull();
	// Recorded in the HTML report (console output is banned by lint).
	testInfo.annotations.push({
		type: "gl-renderer",
		description: `${renderer?.masked} | ${renderer?.unmasked}`,
	});
	// Chromium masks RENDERER by default; the unmasked value proves we are on SwiftShader/ANGLE.
	expect(renderer?.unmasked).toMatch(/swiftshader|angle/i);

	// Async asset loading (slow under CPU load) shifts the 3D frame by up to several percent: this is a coarse "the scene rendered" check; `ui-*` is exact.
	await expect(page).toHaveScreenshot(`boot-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.1,
	});
	// UI layer alone, exact: the canvas is hidden (not masked: a mask would also cover the HUD drawn over it).
	await expect(page).toHaveScreenshot(`ui-${testInfo.project.name}.png`, {
		animations: "disabled",
		stylePath: "tests/e2e/hide-canvas.css",
		maxDiffPixels: 0,
	});
	expect(problems).toEqual([]);
});
