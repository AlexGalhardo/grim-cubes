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
				run(warmupMs: number, measureMs: number): Promise<Record<string, unknown>>;
			};
		};
	};
}

for (const scenario of ["horde100", "round20"] as const) {
	test(`bench ${scenario}`, async ({ page }, testInfo) => {
		test.setTimeout(WARMUP_MS + MEASURE_MS + 90_000);
		await page.goto(`/?debug=1&bench=${scenario}`);
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

		expect(measured.enemies).toBeGreaterThan(0);
		expect(measured.metrics.frames as number).toBeGreaterThan(0);
	});
}
