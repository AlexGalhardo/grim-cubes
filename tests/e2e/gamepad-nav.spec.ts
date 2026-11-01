import { expect, test } from "@playwright/test";

interface PadGc {
	gc?: {
		ready?: boolean;
		debug?: { gamepad?: { connect(): void; tap(index: number, ms?: number): Promise<void> } };
	};
}

const A = 0;
const B = 1;
const START = 9;
const DPAD_UP = 12;

// Needs a build made with GC_DEBUG_API=1 (the virtual pad is compiled out of release builds). Not run in CI.
test("menu, slots, difficulty and pause can all be reached with the gamepad alone", async ({ page }) => {
	test.slow();
	await page.goto("/?gamepad=1");
	await page.waitForFunction(() => (window as unknown as PadGc).gc?.ready === true);
	const hasPad = await page.evaluate(() => (window as unknown as PadGc).gc?.debug?.gamepad !== undefined);
	test.skip(!hasPad, "build without GC_DEBUG_API");

	const pad = {
		connect: () => page.evaluate("window.gc.debug.gamepad.connect()"),
		tap: (index: number) => page.evaluate(`window.gc.debug.gamepad.tap(${index})`),
	};
	await expect(page.getByTestId("menu")).toBeVisible();
	await pad.connect();
	// A screen's first poll only records the pad state.
	await page.waitForTimeout(200);

	await pad.tap(A);
	await expect(page.getByTestId("slots")).toBeVisible();
	await page.waitForTimeout(200);
	await pad.tap(A);
	await expect(page.getByRole("dialog", { name: "Dificuldade" })).toBeVisible();
	await page.waitForTimeout(200);
	// Up from the first control wraps to the last one, "Começar".
	await pad.tap(DPAD_UP);
	await expect(page.getByRole("button", { name: "Começar" })).toBeFocused();
	await pad.tap(A);

	// The page reloads into the run; the pad starts disconnected again.
	await page.waitForFunction(() => (window as unknown as PadGc).gc?.ready === true);
	await expect(page.getByTestId("menu")).toHaveCount(0);
	await pad.connect();
	await page.waitForTimeout(300);
	await pad.tap(START);
	await expect(page.getByTestId("pause-menu")).toBeVisible();
	await page.waitForTimeout(200);
	await pad.tap(B);
	await expect(page.getByTestId("pause-menu")).toHaveCount(0);
});
