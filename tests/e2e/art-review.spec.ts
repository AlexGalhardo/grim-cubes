import { mkdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

interface Manifest {
	entries: Record<string, { kind: string }>;
}

const REVIEW_DIR = "docs/art/review";
const SILHOUETTE_DIR = `${REVIEW_DIR}/silhouette`;

// Needs a build made with GC_DEBUG_API=1: the `?art=` route is compiled out of release builds.
// Writes docs/art/review/<id>.png (one fixed three-quarter shot per model) and the 64 px solid-black silhouette
// docs/art/review/silhouette/<id>.png (Art Bible §5.3). Approval of the silhouettes belongs to the PO.
test("captures every model and its 64 px silhouette for the art review", async ({
	page,
	request,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-1080", "one viewport is enough for the review captures");
	// One page load per model and per mode under SwiftShader: this is a batch job, not a flaky wait.
	test.setTimeout(600_000);

	const manifest = (await (await request.get("/assets/manifest.json")).json()) as Manifest;
	const ids = Object.entries(manifest.entries)
		.filter(([, entry]) => entry.kind === "model")
		.map(([id]) => id)
		.sort();
	expect(ids.length).toBeGreaterThan(0);
	mkdirSync(SILHOUETTE_DIR, { recursive: true });

	for (const id of ids) {
		await page.setViewportSize({ width: 640, height: 640 });
		await page.goto(`/?debug=1&art=${id}`);
		await page.waitForFunction(
			() => (window as unknown as { gc?: { ready?: boolean } }).gc?.ready === true,
		);
		await page.locator("#game").screenshot({ path: `${REVIEW_DIR}/${id}.png` });

		await page.setViewportSize({ width: 64, height: 64 });
		await page.goto(`/?debug=1&art=${id}&silhouette=1`);
		await page.waitForFunction(
			() => (window as unknown as { gc?: { ready?: boolean } }).gc?.ready === true,
		);
		const path = `${SILHOUETTE_DIR}/${id}.png`;
		await page.locator("#game").screenshot({ path });

		// The silhouette must exist: some solid black, some background, neither dominating the frame.
		const png = PNG.sync.read(readFileSync(path));
		let dark = 0;
		for (let i = 0; i < png.data.length; i += 4) {
			if ((png.data[i] ?? 255) < 40 && (png.data[i + 1] ?? 255) < 40 && (png.data[i + 2] ?? 255) < 40)
				dark++;
		}
		const share = dark / (png.width * png.height);
		expect([id, share > 0.02 && share < 0.9]).toEqual([id, true]);
	}
});
