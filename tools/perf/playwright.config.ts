import { defineConfig } from "@playwright/test";

const PORT = 4174;

/**
 * Performance bench (SDD 14 §4). Needs a build made with GC_DEBUG_API=1 (the `?bench=` scenarios are compiled out
 * of release builds). Run: `GC_DEBUG_API=1 bun run build && bunx playwright test --config tools/perf/playwright.config.ts`.
 * Numbers from SwiftShader (the default here) are only a relative regression signal; absolute numbers come from a
 * run on real hardware, e.g. `BENCH_GPU=1` to drop the software-GL flags.
 */
const softwareGl = process.env.BENCH_GPU
	? []
	: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
	testDir: ".",
	testMatch: "bench.spec.ts",
	// One scenario at a time: the bench itself must own the CPU.
	workers: 1,
	fullyParallel: false,
	reporter: [["list"]],
	use: {
		baseURL: `http://localhost:${PORT}`,
		launchOptions: { args: softwareGl },
	},
	projects: [
		{ name: "desktop-1080", use: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 } },
		{ name: "desktop-1440", use: { viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 } },
	],
	webServer: {
		command: `bunx vite preview --config apps/web/vite.config.ts --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		cwd: "../..",
		reuseExistingServer: !process.env.CI,
	},
});
