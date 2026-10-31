import { expect, test } from "@playwright/test";

interface GcWindow {
	gc?: { ready?: boolean };
}

test("boots, renders on software GL and matches the baseline", async ({ page }, testInfo) => {
	const problems: string[] = [];
	page.on("pageerror", (error) => problems.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") problems.push(message.text());
	});

	await page.goto("/");
	await expect(page.locator("canvas#game")).toBeVisible();
	await page.waitForFunction(() => (window as unknown as GcWindow).gc?.ready === true);

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

	await expect(page).toHaveScreenshot(`boot-${testInfo.project.name}.png`, { animations: "disabled" });
	expect(problems).toEqual([]);
});
