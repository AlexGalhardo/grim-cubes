import { defineConfig } from "@playwright/test";

// Not vite's default 4173, and never reuse a running server: another worktree's `vite preview` on 4173 was silently
// being served instead of this build (different HUD, thousands of diff pixels). Override with GC_E2E_PORT.
const PORT = Number(process.env.GC_E2E_PORT ?? 4273);

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
	// One baseline per OS (text anti-aliasing differs): boot-<project>-linux.png, boot-<project>-win32.png.
	// The linux ones come from the Playwright container (see .github/workflows/update-snapshots.yml).
	snapshotPathTemplate: "tests/visual/__screenshots__/{arg}-{platform}{ext}",
	fullyParallel: true,
	// SwiftShader renders the full scene on the CPU; more than one worker times out at 1080p/1440p.
	workers: 1,
	// Default 30 s is too short for the full scene on SwiftShader at 1080p/1440p (levelup.spec raises it per test too).
	timeout: 90_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
	expect: {
		// SwiftShader needs several seconds per frame at 1440p; stabilization takes two identical captures.
		timeout: 20_000,
		toHaveScreenshot: {
			// Same-OS baselines: allow a few stray pixels (SwiftShader rasterization noise) and small color shifts.
			maxDiffPixels: 100,
			threshold: 0.2,
			// Hides the build version label so a release bump does not invalidate every baseline.
			stylePath: "tests/e2e/screenshot.css",
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
		{ name: "mobile-s", use: viewport(800, 360, true) },
	],
	// Serves the existing build (dist/); run `bun run build` first.
	webServer: {
		command: `bunx vite preview --config apps/web/vite.config.ts --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
		timeout: 60_000,
	},
});
