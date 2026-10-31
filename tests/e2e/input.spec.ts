import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: { ready?: boolean; debug?: { hero(): { x: number; z: number } } };
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
// Hero speed is 6 u/s (data/hero.json). SwiftShader can render only a few frames per second at 1440p, and the loop
// then advances at most 0.25 s per frame, so the test holds the input until the hero has covered 3 u instead of
// timing exactly 1 s.
test("input moves the hero: key D on desktop, a joystick drag on touch", async ({ page }, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	test.skip(
		!(await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined)),
		"build without GC_DEBUG_API",
	);
	const hero = (): Promise<{ x: number; z: number }> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.hero() ?? { x: 0, z: 0 });
	const start = await hero();
	const moved = async (): Promise<number> => {
		const now = await hero();
		return Math.hypot(now.x - start.x, now.z - start.z);
	};

	if (testInfo.project.name.startsWith("desktop")) {
		await page.keyboard.down("KeyD");
		await expect.poll(moved, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
		await page.keyboard.up("KeyD");
	} else {
		const box = await page.getByTestId("joystick-region").boundingBox();
		if (!box) throw new Error("joystick region has no box");
		const x = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		// Real touch events through CDP, so the browser creates genuine pointers (setPointerCapture needs one).
		const cdp = await page.context().newCDPSession(page);
		const touch = (type: "touchStart" | "touchMove" | "touchEnd", px: number): Promise<unknown> =>
			cdp.send("Input.dispatchTouchEvent", {
				type,
				touchPoints: type === "touchEnd" ? [] : [{ x: px, y }],
			});
		await touch("touchStart", x);
		await touch("touchMove", x + 90);
		await expect.poll(moved, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
		await touch("touchEnd", x + 90);
	}

	const end = await hero();
	expect(end.x - start.x, "moved along +x").toBeGreaterThan(0);
	// Released input stops the hero (instant stop, GDD 7.2).
	await page.waitForTimeout(500);
	const after = await hero();
	expect(Math.hypot(after.x - end.x, after.z - end.z)).toBeLessThan(1.5);
});
