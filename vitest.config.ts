import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json-summary"],
			reportsDirectory: "coverage",
			include: ["packages/*/src/**/*.{ts,tsx}"],
			exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
			// Per package, a few points under what A-07-03 measured, so the numbers only go up (targets in SDD 11 §1:
			// game >= 80%, core >= 85%, ui >= 60% lines). Measured: core 96.7/78.7, game 97.4/70.4, platform 100/83.6,
			// render 88.5/61.4, ui 92.9/60.1 (lines/branches).
			thresholds: {
				"packages/core/**": { lines: 93, statements: 92, functions: 93, branches: 75 },
				"packages/game/**": { lines: 94, statements: 92, functions: 90, branches: 67 },
				"packages/platform/**": { lines: 97, statements: 96, functions: 93, branches: 80 },
				"packages/render/**": { lines: 85, statements: 83, functions: 83, branches: 58 },
				"packages/ui/**": { lines: 89, statements: 88, functions: 89, branches: 57 },
			},
		},
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: ["packages/{core,game,render,platform}/**/*.test.ts", "tools/**/*.test.ts"],
				},
			},
			{
				test: {
					name: "unit-ui",
					environment: "jsdom",
					include: ["packages/ui/**/*.test.{ts,tsx}"],
					setupFiles: ["tests/setup/i18n.ts"],
				},
			},
			{
				test: {
					name: "integration",
					environment: "node",
					include: ["tests/integration/**/*.test.ts"],
				},
			},
		],
	},
});
