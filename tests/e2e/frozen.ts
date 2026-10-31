// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot follow the `export *` re-exports of @playwright/test.
import { expect, type Page } from "@playwright/test";

interface GcWindow {
	gc?: { ready?: boolean };
}

/**
 * Opens `path` under a fake, frozen clock and stops at game time 1.8 s, inside the 2 s round intro. The run is live
 * from boot (enemies spawn after the intro) and at 1440p SwiftShader needs seconds per capture, so a free-running
 * page never produces two equal frames; a frozen one does, on every machine.
 */
export async function openFrozenAtIntro(page: Page, path: string): Promise<void> {
	await page.clock.install({ time: 0 });
	await page.goto(path);
	await expect(page.locator("canvas#game")).toBeVisible();
	const isReady = (): Promise<boolean> =>
		page.evaluate(() => (window as unknown as GcWindow).gc?.ready === true);
	// Ready is awaited with tiny fake-clock ticks and real pauses, so even a slow machine (1440p in a container) stays
	// well inside the 1.8 s of game time.
	for (let i = 0; i < 4000 && !(await isReady()); i++) {
		await page.clock.runFor(1);
		await page.waitForTimeout(20);
	}
	expect(await isReady(), "gc.ready under the fake clock").toBe(true);
	// Assets and chunks load in real time, so the fake clock moves in slices with real pauses in between and every
	// run ends on the same frame.
	const gameTime = (): Promise<number> => page.evaluate(() => performance.now());
	expect(await gameTime(), "ready before the intro ends").toBeLessThan(1800);
	for (let now = await gameTime(); now < 1800; now = await gameTime()) {
		await page.clock.runFor(Math.min(200, 1800 - now));
		await page.waitForTimeout(150);
	}
	// Let slow loads (cold server) finish in real time, then render one more frame (1.816 s, still in the intro).
	await page.waitForTimeout(2000);
	await page.clock.runFor(16);
	await page.clock.pauseAt(1_000_000);
}
