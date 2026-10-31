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

	// A fake, frozen clock makes the frame deterministic: the run is live from boot (enemies spawn after the
	// 2 s intro), and at 1440p SwiftShader needs seconds per capture, so a free-running page never stabilizes.
	await page.clock.install({ time: 0 });
	await page.goto("/?seed=1");
	await expect(page.locator("canvas#game")).toBeVisible();
	const isReady = (): Promise<boolean> =>
		page.evaluate(() => (window as unknown as GcWindow).gc?.ready === true);
	// Ready is awaited with small fake-clock ticks and real pauses, so a slow machine never advances game time.
	for (let i = 0; i < 400 && !(await isReady()); i++) {
		await page.clock.runFor(16);
		await page.waitForTimeout(50);
	}
	expect(await isReady(), "gc.ready under the fake clock").toBe(true);
	// Freeze at a fixed game time (1.8 s, inside the 2 s intro). Assets and chunks load in real time, so the fake
	// clock moves in slices with real pauses in between and every run ends on the same frame.
	const gameTime = (): Promise<number> => page.evaluate(() => performance.now());
	expect(await gameTime(), "ready before the intro ends").toBeLessThan(1800);
	while ((await gameTime()) < 1800) {
		await page.clock.runFor(Math.min(200, 1800 - (await gameTime())));
		await page.waitForTimeout(150);
	}
	// Let slow loads (cold server) finish in real time, then render one more frame (1.816 s, still in the intro).
	await page.waitForTimeout(2000);
	await page.clock.runFor(16);
	await page.clock.pauseAt(1_000_000);

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

	// Async asset loading (slow under CPU load) shifts the 3D frame by up to a few percent: this is a coarse "the scene rendered" check; `ui-*` is exact.
	await expect(page).toHaveScreenshot(`boot-${testInfo.project.name}.png`, {
		animations: "disabled",
		maxDiffPixelRatio: 0.05,
	});
	// UI layer alone, exact: the canvas is hidden (not masked: a mask would also cover the HUD drawn over it).
	await expect(page).toHaveScreenshot(`ui-${testInfo.project.name}.png`, {
		animations: "disabled",
		stylePath: "tests/e2e/hide-canvas.css",
		maxDiffPixels: 0,
	});
	expect(problems).toEqual([]);
});
