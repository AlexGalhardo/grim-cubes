/**
 * Local UI-scale capture (not run in CI): sets the HUD scale in Options, then screenshots the HUD, the level-up
 * dialog and the Shop at the four target screens and reports anything that leaves the viewport or scrolls.
 *
 * Needs a build with the debug API: `GC_DEBUG_API=1 bunx vite build --config apps/web/vite.config.ts --mode web-demo`
 * (after `bun run assets:build`). Usage: `bun tools/ux-capture/capture.ts [--scale 150] [--out docs/ux] [--port 4373]`.
 * The captures are for review only; they are not Playwright baselines.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot follow the `export *` re-exports of @playwright/test.
import { type Browser, chromium, type Page } from "@playwright/test";

const flag = (name: string, fallback: string): string => {
	const i = process.argv.indexOf(name);
	return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const scale = Number(flag("--scale", "150"));
const outDir = flag("--out", "docs/ux");
const port = Number(flag("--port", "4373"));
const only = flag("--only", "");
const base = `http://localhost:${port}`;

const TARGETS = [
	{ name: "1920x1080", width: 1920, height: 1080, mobile: false },
	{ name: "2560x1440", width: 2560, height: 1440, mobile: false },
	{ name: "896x414", width: 896, height: 414, mobile: true },
	{ name: "800x360", width: 800, height: 360, mobile: true },
] as const;

interface DebugGc {
	gc?: {
		ready?: boolean;
		debug?: {
			state(): { run: string };
			grantXp(n: number): void;
			grantGold(n: number): void;
			endRound(): void;
		};
	};
}

/** Elements of the open UI that stick out of the viewport, or whose own box scrolls. */
async function findCuts(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const out: string[] = [];
		const w = window.innerWidth;
		const h = window.innerHeight;
		const roots = document.querySelectorAll<HTMLElement>('[role="dialog"], [data-testid]');
		for (const el of roots) {
			const r = el.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			const id = el.getAttribute("data-testid") ?? el.getAttribute("role") ?? el.tagName;
			// Children of a dialog that scrolls are reached by scrolling; the dialog itself is reported once.
			const scrollParent = el.parentElement?.closest<HTMLElement>('[role="dialog"]');
			if (
				scrollParent &&
				scrollParent !== el &&
				scrollParent.scrollHeight > scrollParent.clientHeight + 1
			)
				continue;
			if (r.right > w + 1 || r.bottom > h + 1 || r.left < -1 || r.top < -1) {
				out.push(
					`${id} leaves the screen (${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} in ${w}x${h})`,
				);
			}
			if (el.getAttribute("role") === "dialog" && el.scrollHeight > el.clientHeight + 1) {
				out.push(`${id} scrolls (${el.scrollHeight}px of content in ${el.clientHeight}px)`);
			}
		}
		return out;
	});
}

async function waitReady(page: Page): Promise<void> {
	await page.waitForFunction(() => (window as unknown as DebugGc).gc?.ready === true, undefined, {
		timeout: 60_000,
	});
}

async function captureTarget(browser: Browser, target: (typeof TARGETS)[number]): Promise<string[]> {
	const report: string[] = [];
	const context = await browser.newContext({
		viewport: { width: target.width, height: target.height },
		deviceScaleFactor: 1,
		...(target.mobile && { isMobile: true, hasTouch: true }),
	});
	const page = await context.newPage();
	page.setDefaultTimeout(30_000);
	page.on("pageerror", (e) => console.log(`page error: ${e.message}`));

	// 1. Title menu -> Options -> HUD scale. The setting is saved in this context's storage.
	console.log("  title menu");
	await page.goto(base);
	await waitReady(page);
	await page.getByRole("dialog").getByRole("button", { name: "Opções" }).click();
	await page.getByTestId("options-uiscale").selectOption(String(scale));
	await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();

	// 2. A debug run in the same context (same saved scale).
	await page.goto(`${base}/?debug=1&seed=1`);
	await waitReady(page);
	const state = (): Promise<string> =>
		page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.state().run ?? "");
	await page.waitForFunction(
		() => (window as unknown as DebugGc).gc?.debug?.state().run === "Round",
		undefined,
		{ timeout: 30_000 },
	);
	await page.waitForTimeout(1500);

	const shot = async (screen: string): Promise<void> => {
		await page.screenshot({ path: join(outDir, `ui-${scale}-${screen}-${target.name}.png`) });
		for (const cut of await findCuts(page)) report.push(`${target.name} ${screen}: ${cut}`);
	};

	await shot("hud");

	await page.evaluate(() => (window as unknown as DebugGc).gc?.debug?.grantXp(10));
	await page.getByRole("dialog").waitFor({ timeout: 15_000 });
	await shot("levelup");
	await page.locator('[data-testid^="levelup-card-"]').first().click();

	await page.evaluate(() => {
		const debug = (window as unknown as DebugGc).gc?.debug;
		debug?.grantGold(500);
		debug?.endRound();
	});
	await page.getByRole("dialog").waitFor({ timeout: 15_000 });
	await page.locator('[data-testid^="shop-slot-"]').first().waitFor();
	await shot("shop");
	if ((await state()) === "") report.push(`${target.name}: lost the debug API`);

	await context.close();
	return report;
}

async function main(): Promise<number> {
	mkdirSync(outDir, { recursive: true });
	const server = Bun.spawn(
		[
			"bunx",
			"vite",
			"preview",
			"--config",
			"apps/web/vite.config.ts",
			"--port",
			String(port),
			"--strictPort",
		],
		{
			stdout: "ignore",
			stderr: "inherit",
		},
	);
	try {
		for (let i = 0; i < 60; i++) {
			try {
				if ((await fetch(base)).ok) break;
			} catch {
				await Bun.sleep(500);
			}
		}
		const browser = await chromium.launch({
			args: [
				"--use-gl=angle",
				"--use-angle=swiftshader",
				"--enable-unsafe-swiftshader",
				"--ignore-gpu-blocklist",
			],
		});
		const cuts: string[] = [];
		for (const target of TARGETS.filter((t) => only === "" || t.name === only)) {
			console.log(`capturing ${target.name} at ${scale}%`);
			cuts.push(...(await captureTarget(browser, target)));
		}
		await browser.close();
		console.log(cuts.length === 0 ? "nothing leaves the screen or scrolls" : cuts.join("\n"));
		return 0;
	} finally {
		server.kill();
	}
}

process.exit(await main());
