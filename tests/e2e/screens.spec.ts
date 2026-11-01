// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot follow the `export *` re-exports of @playwright/test.
import { expect, type Page, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			gamepad?: {
				connect(): void;
				press(index: number): void;
				release(index: number): void;
			};
		};
	};
}

/** Standard mapping: Start. The same button the gamepad spec uses to pause. */
const START = 9;

function watch(page: Page): string[] {
	const problems: string[] = [];
	page.on("pageerror", (error) => problems.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") problems.push(message.text());
	});
	return problems;
}

async function boot(page: Page, path: string): Promise<void> {
	await page.goto(path);
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true, undefined, {
		timeout: 60_000,
	});
}

test("the key-art menu matches the baseline", async ({ page }, testInfo) => {
	const problems = watch(page);
	await boot(page, "/");
	await expect(page.getByTestId("menu")).toBeVisible();
	await expect(page).toHaveScreenshot(`menu-${testInfo.project.name}.png`, { animations: "disabled" });
	expect(problems).toEqual([]);
});

test("save slots match the baseline", async ({ page }, testInfo) => {
	const problems = watch(page);
	await boot(page, "/");
	await page.getByTestId("menu-play").click();
	await expect(page.getByTestId("slots")).toBeVisible();
	await expect(page).toHaveScreenshot(`slots-${testInfo.project.name}.png`, { animations: "disabled" });
	expect(problems).toEqual([]);
});

test("options match the baseline", async ({ page }, testInfo) => {
	const problems = watch(page);
	await boot(page, "/");
	await page.getByRole("button", { name: "Opções" }).click();
	await expect(page.getByRole("dialog", { name: "Opções" })).toBeVisible();
	await expect(page).toHaveScreenshot(`options-${testInfo.project.name}.png`, {
		animations: "disabled",
	});
	expect(problems).toEqual([]);
});

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("pause matches the baseline", async ({ page }, testInfo) => {
	test.slow();
	const problems = watch(page);
	await boot(page, "/?debug=1&seed=1&gamepad=1");
	const hasPad = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.gamepad !== undefined);
	test.skip(!hasPad, "build without GC_DEBUG_API");
	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state().run ?? ""))
		.toBe("Round");
	// Pause is a button held across a frame. Playwright's keys never reach the window listener
	// the keyboard source polls, so this holds Start on the virtual pad (same path as gamepad-nav).
	// A level-up or chest eats that edge: release, pick the card, and hold again.
	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.gamepad?.connect());
	let held = false;
	let heldAt = 0;
	const release = async (): Promise<void> => {
		if (!held) return;
		held = false;
		await page.evaluate(
			(button) => (window as unknown as DebugGc).gc?.debug?.gamepad?.release(button),
			START,
		);
	};
	try {
		await expect
			.poll(async () => {
				if (await page.getByTestId("pause-menu").isVisible()) return "paused";
				for (const name of ["Novo nível", "Baú Lendário"]) {
					const dialog = page.getByRole("dialog", { name });
					if (await dialog.isVisible()) {
						await release();
						await dialog.getByRole("button").first().click();
						return "offer";
					}
				}
				if (!held) {
					held = true;
					heldAt = Date.now();
					await page.evaluate(
						(button) => (window as unknown as DebugGc).gc?.debug?.gamepad?.press(button),
						START,
					);
					return "holding";
				}
				if (Date.now() - heldAt > 750) {
					await release();
					return "rearm";
				}
				return "holding";
			})
			.toBe("paused");
	} finally {
		await release();
	}
	// The paused scene keeps redrawing on SwiftShader, so the capture is the HUD and the dialog (same as boot's ui shot).
	await expect(page).toHaveScreenshot(`pause-${testInfo.project.name}.png`, {
		animations: "disabled",
		stylePath: "tests/e2e/hide-canvas.css",
	});
	expect(problems).toEqual([]);
});
