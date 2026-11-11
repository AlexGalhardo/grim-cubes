/// <reference lib="dom" />
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/** SDD 14 §4: 5 s of warm-up (discarded) and 30 s of measurement on a fixed seed. */
const WARMUP_MS = 5_000;
const MEASURE_MS = 30_000;
const REPORTS_DIR = "reports";

interface BenchWindow {
	gc?: {
		ready?: boolean;
		debug?: {
			bench?: {
				scenario: string;
				enemies(): number;
				projectiles(): number;
				run(warmupMs: number, measureMs: number): Promise<Record<string, unknown>>;
			};
		};
	};
}

/**
 * `gore` sends death events for living enemies (the real render death path) until the floor-mark pool is full and recycling (S-11-01); it
 * runs at the Ultra cap (600) and at the default preset. The others pin no preset (the debug default).
 */
const RUNS = [
	{ name: "horde100", bench: "horde100", preset: "" },
	{ name: "round20", bench: "round20", preset: "" },
	{ name: "gore-ultra", bench: "gore", preset: "ultra" },
	{ name: "gore-high", bench: "gore", preset: "high" },
] as const;

for (const { name: scenario, bench: benchId, preset } of RUNS) {
	test(`bench ${scenario}`, async ({ page }, testInfo) => {
		test.setTimeout(WARMUP_MS + MEASURE_MS + 90_000);
		await page.goto(`/?debug=1&bench=${benchId}${preset ? `&preset=${preset}` : ""}`);
		await page.waitForFunction(() => (window as unknown as BenchWindow).gc?.ready === true);
		const hasBench = await page.evaluate(
			() => (window as unknown as BenchWindow).gc?.debug?.bench !== undefined,
		);
		test.skip(!hasBench, "build without GC_DEBUG_API");

		const gl = await page.evaluate(() => {
			const context = document.querySelector<HTMLCanvasElement>("canvas#game")?.getContext("webgl2");
			const info = context?.getExtension("WEBGL_debug_renderer_info");
			return context && info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
		});
		const measured = await page.evaluate(
			async ([warmup, measure]) => {
				const bench = (window as unknown as BenchWindow).gc?.debug?.bench;
				if (!bench) throw new Error("bench API missing");
				const metrics = await bench.run(warmup as number, measure as number);
				return { metrics, enemies: bench.enemies() };
			},
			[WARMUP_MS, MEASURE_MS],
		);

		mkdirSync(REPORTS_DIR, { recursive: true });
		const file = `${REPORTS_DIR}/perf-${testInfo.project.name}.json`;
		const previous = existsSync(file)
			? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>)
			: {};
		writeFileSync(
			file,
			`${JSON.stringify(
				{
					...previous,
					renderer: gl,
					[scenario]: {
						seed: 42,
						warmupMs: WARMUP_MS,
						measureMs: MEASURE_MS,
						enemies: measured.enemies,
						...measured.metrics,
					},
				},
				null,
				"\t",
			)}\n`,
		);

		expect(measured.metrics.frames as number).toBeGreaterThan(0);
		// The report only means something if the load was there: SDD 14 §1 asks for 100 enemies (and, for
		// round20, ~200 projectiles). Elite and decals stay provisional until P-05-06 and the decal pool lands in
		// the bench.
		expect(measured.metrics.enemiesAvg as number).toBeGreaterThanOrEqual(95);
		if (benchId === "gore") {
			// Full and still discarding while measured: the cost of a mark at the cap is what this scenario prices.
			const decals = measured.metrics.decals as { live: number; limit: number; recycled: number };
			expect(decals.live).toBe(decals.limit);
			expect(decals.recycled).toBeGreaterThan(0);
		}
		if (scenario === "round20")
			expect(measured.metrics.projectilesAvg as number).toBeGreaterThanOrEqual(150);
	});
}
