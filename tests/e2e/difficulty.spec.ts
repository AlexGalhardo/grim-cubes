import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string; round: number };
			killHero(): void;
			toRound(n: number): void;
			difficulty(): string;
		};
	};
}

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("Nightmare stays locked below a Grim record of 20, Grim is open, and the typed seed and difficulty reach the next run", async ({
	page,
}, testInfo) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const debug = <T>(run: (d: NonNullable<NonNullable<DebugGc["gc"]>["debug"]>) => T): Promise<T> =>
		page.evaluate(`(${run.toString()})(window.gc.debug)`) as Promise<T>;
	await expect.poll(() => debug((d) => d.state().run), { timeout: 10_000 }).toBe("Round");
	expect(await debug((d) => d.difficulty())).toBe("normal");

	await debug((d) => d.toRound(20));
	await expect(page.getByTestId("shop-slot-0")).toBeVisible({ timeout: 15_000 });
	await page.keyboard.press("Enter");
	await expect.poll(() => debug((d) => d.state().round), { timeout: 15_000 }).toBe(20);
	await debug((d) => d.killHero());
	await expect(page.getByTestId("results-round")).toHaveText("20", { timeout: 20_000 });
	await expect(page.getByTestId("results-record")).toContainText("20", { timeout: 10_000 });

	await page.getByRole("button", { name: "Jogar de novo" }).click();
	await expect(page.getByRole("dialog", { name: "Dificuldade" })).toBeVisible();
	await expect(page.getByTestId("difficulty-grim")).toBeEnabled();
	await expect(page.getByTestId("difficulty-nightmare")).toBeDisabled();
	await expect(page).toHaveScreenshot(`difficulty-${testInfo.project.name}.png`, {
		animations: "disabled",
		timeout: 30_000,
	});

	await page.getByTestId("difficulty-grim").click();
	await page.getByTestId("difficulty-seed").fill("7");
	await page.getByRole("button", { name: "Começar" }).click();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	expect(new URL(page.url()).searchParams.get("seed")).toBe("7");
	expect(new URL(page.url()).searchParams.get("difficulty")).toBe("grim");
	expect(await debug((d) => d.difficulty())).toBe("grim");
});
