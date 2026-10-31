import { defineConfig } from "@playwright/test";

const PORT = 4173;

// Software GL so the same pixels render on CI (no GPU) and on dev machines (SDD 11 §2).
const swiftShaderArgs = [
	"--use-gl=angle",
	"--use-angle=swiftshader",
	"--enable-unsafe-swiftshader",
	"--ignore-gpu-blocklist",
];

const viewport = (width: number, height: number, mobile = false) => ({
	viewport: { width, height },
	deviceScaleFactor: 1,
	...(mobile && { isMobile: true, hasTouch: true }),
});

export default defineConfig({
	testDir: "tests/e2e",
	// Baselines are shared across OS: tests/visual/__screenshots__/boot-<project>.png
	snapshotPathTemplate: "tests/visual/__screenshots__/{arg}{ext}",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
	expect: {
		toHaveScreenshot: {
			// 2%: text anti-aliasing differs slightly between the Windows dev machine and the Linux CI image;
			// the 3D scene itself is software-rendered and stable. Tighten once baselines come only from CI.
			maxDiffPixelRatio: 0.02,
		},
	},
	use: {
		baseURL: `http://localhost:${PORT}`,
		launchOptions: { args: swiftShaderArgs },
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop-1080", use: viewport(1920, 1080) },
		{ name: "desktop-1440", use: viewport(2560, 1440) },
		{ name: "mobile-l", use: viewport(896, 414, true) },
		{ name: "mobile-s", use: viewport(800, 360) },
	],
	// Serves the existing build (dist/); run `bun run build` first.
	webServer: {
		command: `bunx vite preview --config apps/web/vite.config.ts --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
