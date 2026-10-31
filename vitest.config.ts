import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json-summary"],
			reportsDirectory: "coverage",
			include: ["packages/*/src/**/*.{ts,tsx}"],
			exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
			// Initial thresholds are 0; targets (SDD 11 §1): >= 80% lines in game and core, >= 60% in ui.
			thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
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
