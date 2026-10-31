import { expect, test } from "@playwright/test";

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: { state(): { run: string }; killHero(): void; saveNotice(): string | null };
	};
}

const NEWER = JSON.stringify({
	schemaVersion: 99,
	app: "grim-cubes",
	appVersion: "9.9.9",
	checksum: "x",
	data: {},
});

// Needs a build made with GC_DEBUG_API=1 (the debug API is compiled out of release builds).
test("a save from a newer version is reported and survives a finished run untouched", async ({ page }) => {
	test.slow();
	await page.goto("/?debug=1&seed=1");
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	const hasDebug = await page.evaluate(() => (window as unknown as DebugGc).gc?.debug !== undefined);
	test.skip(!hasDebug, "build without GC_DEBUG_API");

	const put = (text: string): Promise<void> =>
		page.evaluate(
			(value) =>
				new Promise<void>((resolve, reject) => {
					const open = indexedDB.open("grim-cubes", 1);
					open.onerror = () => reject(open.error);
					open.onsuccess = () => {
						const tx = open.result.transaction("kv", "readwrite");
						tx.objectStore("kv").put(value, "save");
						tx.oncomplete = () => resolve();
					};
				}),
			text,
		);
	const get = (): Promise<string | null> =>
		page.evaluate(
			() =>
				new Promise<string | null>((resolve, reject) => {
					const open = indexedDB.open("grim-cubes", 1);
					open.onerror = () => reject(open.error);
					open.onsuccess = () => {
						const req = open.result.transaction("kv").objectStore("kv").get("save");
						req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
					};
				}),
		);

	await put(NEWER);
	await page.reload();
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true);
	await expect(page.getByTestId("save-notice")).toContainText("versão mais nova");
	expect(await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.saveNotice())).toBe("newer");

	await expect
		.poll(() => page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state().run), {
			timeout: 10_000,
		})
		.toBe("Round");
	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.killHero());
	await expect(page.getByTestId("results-souls")).toHaveText("5", { timeout: 15_000 });
	await page.waitForTimeout(500);
	expect(await get()).toBe(NEWER);
});
