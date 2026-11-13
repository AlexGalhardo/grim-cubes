import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: { ready?: boolean; debug?: { state(): { run: string } } };
}

/** The hero and the 6 u ring around it, as shares of the viewport (x 660..1260, y 340..740 at 1920x1080). */
const FORBIDDEN = { x0: 660 / 1920, x1: 1260 / 1920, y0: 340 / 1080, y1: 740 / 1080 };
const CLUSTERS = ["hud-vitals", "hud-round", "hud-wallet", "hud-corner", "hud-loadout"];

interface Box {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

const overlaps = (a: Box, b: Box): boolean =>
	a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("the HUD clusters stay out of the hero's central area and do not overlap each other", async ({
	page,
}, testInfo) => {
	await page.goto("/?debug=1&seed=7");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state().run), {
			timeout: 40_000,
		})
		.toBe("Round");
	// The round plate is mounted only once the clock is running; state flips a frame ahead of that.
	await expect(page.getByTestId("hud-round")).toBeVisible();

	const { viewport, boxes } = await page.evaluate(() => {
		const out: { id: string; x: number; y: number; w: number; h: number }[] = [];
		for (const el of document.querySelectorAll('[data-testid^="hud-"]')) {
			const id = el.getAttribute("data-testid") ?? "";
			if (id === "hud-root" || id === "hud-vignette") continue;
			const r = el.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) out.push({ id, x: r.x, y: r.y, w: r.width, h: r.height });
		}
		return { viewport: { w: window.innerWidth, h: window.innerHeight }, boxes: out };
	});

	for (const id of CLUSTERS)
		expect(
			boxes.some((b) => b.id === id),
			`${id} is on screen`,
		).toBe(true);

	const centre: Box = {
		id: "centre",
		x: FORBIDDEN.x0 * viewport.w,
		y: FORBIDDEN.y0 * viewport.h,
		w: (FORBIDDEN.x1 - FORBIDDEN.x0) * viewport.w,
		h: (FORBIDDEN.y1 - FORBIDDEN.y0) * viewport.h,
	};
	for (const box of boxes) {
		expect(overlaps(box, centre), `${box.id} covers the hero area`).toBe(false);
		expect(box.x, `${box.id} left edge`).toBeGreaterThanOrEqual(0);
		expect(box.y, `${box.id} top edge`).toBeGreaterThanOrEqual(0);
		expect(box.x + box.w, `${box.id} right edge`).toBeLessThanOrEqual(viewport.w);
		expect(box.y + box.h, `${box.id} bottom edge`).toBeLessThanOrEqual(viewport.h);
	}

	const clusters = boxes.filter((b) => CLUSTERS.includes(b.id));
	for (const [i, a] of clusters.entries()) {
		for (const b of clusters.slice(i + 1)) {
			expect(overlaps(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
		}
	}

	if (testInfo.project.use.hasTouch) {
		const sizes = await page.evaluate(() =>
			["pause-open", "speed-toggle", "options-open"].flatMap((id) => {
				const el = document.querySelector(`[data-testid="${id}"]`);
				const r = el?.getBoundingClientRect();
				return r ? [{ id, w: r.width, h: r.height }] : [];
			}),
		);
		for (const s of sizes) {
			expect(s.w, `${s.id} width`).toBeGreaterThanOrEqual(48);
			expect(s.h, `${s.id} height`).toBeGreaterThanOrEqual(48);
		}
		const joystick = await page.getByTestId("joystick-region").boundingBox();
		expect(joystick, "the joystick region is on screen").not.toBeNull();
		if (joystick) {
			for (const box of clusters) {
				expect(
					overlaps(box, {
						id: "joystick",
						x: joystick.x,
						y: joystick.y,
						w: joystick.width,
						h: joystick.height,
					}),
					`${box.id} sits on the joystick`,
				).toBe(false);
			}
		}
	}
	await page.screenshot({ path: testInfo.outputPath("hud-layout.png") });
});
