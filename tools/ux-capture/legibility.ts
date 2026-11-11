/**
 * Value-separation check (S-01-03): freezes a combat frame in the sunken cemetery (seed 7) with four enemies in front
 * of the hero, measures the mean WCAG relative luminance of the ground, the hero and the enemies from the screenshot
 * and writes `reports/legibility.json`. Exits 1 when hero/ground is under 3:1 or enemy/ground under 2.5:1.
 *
 * Usage: `bun tools/ux-capture/legibility.ts [--url http://localhost:5199] [--shots dir]`. Without `--url` it serves the
 * build of `GC_DEBUG_API=1 bun run build` with `vite preview`. The sample windows come from projecting the world
 * offsets of the spawns through the camera of `data/render.json`, so no engine internals are read.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
// biome-ignore lint/correctness/noUnresolvedImports: Biome cannot follow the `export *` re-exports of @playwright/test.
import { chromium, type Page } from "@playwright/test";
import render from "../../data/render.json";

const flag = (name: string, fallback: string): string => {
	const i = process.argv.indexOf(name);
	return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const PORT = 4375;
const urlArg = flag("--url", "");
const base = urlArg || `http://localhost:${PORT}`;
const shots = flag("--shots", "");
const OUT = "reports/legibility.json";

const HERO_RATIO_MIN = 3;
const ENEMY_RATIO_MIN = 2.5;
/** Enemy offsets from the hero in world units (x right, z north) and the enemy type each stands for. */
const ENEMIES = [
	{ type: 0, x: -4, z: 4 },
	{ type: 1, x: -1.5, z: 5 },
	{ type: 2, x: 1.5, z: 5 },
	{ type: 3, x: 4, z: 4 },
];
/** Ground points around the hero, away from the characters; the median of their windows is the ground luminance. */
const GROUND: { x: number; z: number }[] = [];
for (const x of [-9, -6, -3, 3, 6, 9]) for (const z of [-6, -3, 0, 8, 11]) GROUND.push({ x, z });

const TARGETS = [
	{ name: "1920x1080", width: 1920, height: 1080, mobile: false },
	{ name: "896x414", width: 896, height: 414, mobile: true },
] as const;

interface Point {
	px: number;
	py: number;
}

interface Group {
	windows: Point[];
	half: number;
}

/** Pinhole projection of a world offset from the hero (camera on the hero, looking north along beta and radius). */
function project(width: number, height: number, radius: number, x: number, y: number, z: number): Point {
	const beta = Math.PI / 2 - (render.camera.elevationDegrees * Math.PI) / 180;
	const cam = { y: radius * Math.cos(beta), z: -radius * Math.sin(beta) };
	const f = { y: -Math.cos(beta), z: Math.sin(beta) };
	const up = { y: Math.sin(beta), z: Math.cos(beta) };
	const rel = { x, y: y - cam.y, z: z - cam.z };
	const depth = rel.y * f.y + rel.z * f.z;
	const focal = height / 2 / Math.tan(render.camera.fov / 2);
	return {
		px: width / 2 + (rel.x / depth) * focal,
		py: height / 2 - ((rel.y * up.y + rel.z * up.z) / depth) * focal,
	};
}

/** Mean relative luminance (WCAG 2.x) of each group's windows, computed in the page; the ground uses the median. */
async function measure(
	page: Page,
	png: Buffer,
	groups: Record<string, Group>,
): Promise<Record<string, number>> {
	return page.evaluate(
		async ({ b64, spec }) => {
			const bitmap = await createImageBitmap(
				await (await fetch(`data:image/png;base64,${b64}`)).blob(),
			);
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("no 2d context");
			ctx.drawImage(bitmap, 0, 0);
			const lin = (c: number): number => {
				const s = c / 255;
				return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			};
			const out: Record<string, number> = {};
			for (const [name, { windows, half }] of Object.entries(spec)) {
				const means: number[] = [];
				for (const w of windows) {
					const x0 = Math.max(0, Math.round(w.px - half));
					const y0 = Math.max(0, Math.round(w.py - half));
					const size = Math.max(1, Math.round(half * 2));
					const { data } = ctx.getImageData(x0, y0, size, size);
					let sum = 0;
					for (let i = 0; i < data.length; i += 4) {
						sum +=
							0.2126 * lin(data[i] ?? 0) +
							0.7152 * lin(data[i + 1] ?? 0) +
							0.0722 * lin(data[i + 2] ?? 0);
					}
					means.push(sum / (data.length / 4));
				}
				const sorted = [...means].sort((a, b) => a - b);
				const mid = Math.floor(sorted.length / 2);
				const median =
					sorted.length % 2
						? (sorted[mid] ?? 0)
						: ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
				out[name] = name === "ground" ? median : means.reduce((a, b) => a + b, 0) / means.length;
			}
			return out;
		},
		{ b64: png.toString("base64"), spec: groups },
	);
}

const ratio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function main(): Promise<number> {
	const server = urlArg
		? null
		: Bun.spawn(
				[
					"bunx",
					"vite",
					"preview",
					"--config",
					"apps/web/vite.config.ts",
					"--port",
					String(PORT),
					"--strictPort",
				],
				{ stdout: "ignore", stderr: "inherit" },
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
		const targets: Record<string, unknown> = {};
		let failed = false;
		for (const target of TARGETS) {
			const context = await browser.newContext({
				viewport: { width: target.width, height: target.height },
				deviceScaleFactor: 1,
				...(target.mobile && { isMobile: true, hasTouch: true }),
			});
			const page = await context.newPage();
			page.setDefaultTimeout(60_000);
			page.on("pageerror", (e) => console.log(`page error: ${e.message}`));
			await page.goto(`${base}/?debug=1&seed=7`);
			await page.waitForFunction(
				() => (window as unknown as { gc?: { ready?: boolean } }).gc?.ready === true,
				null,
				{
					timeout: 90_000,
				},
			);
			await page.waitForTimeout(3000);
			await page.evaluate((enemies) => {
				const debug = (
					window as unknown as { gc: { debug: { stillLife(list: typeof enemies): void } } }
				).gc.debug;
				debug.stillLife(enemies);
			}, ENEMIES);
			await page.waitForTimeout(400);
			const png = await page.screenshot();
			if (shots) {
				mkdirSync(shots, { recursive: true });
				writeFileSync(`${shots}/s01-legibility-${target.name}.png`, png);
			}
			const radius = target.mobile ? render.camera.radiusMobile : render.camera.radius;
			const at = (x: number, y: number, z: number): Point =>
				project(target.width, target.height, radius, x, y, z);
			const half = target.height * 0.012;
			const result = await measure(page, png, {
				ground: { windows: GROUND.map((g) => at(g.x, 0, g.z)), half },
				hero: { windows: [at(0, 0.8, 0)], half },
				enemies: { windows: ENEMIES.map((e) => at(e.x, 0.3, e.z)), half },
			});
			const ground = result.ground ?? 0;
			const hero = result.hero ?? 0;
			const enemies = result.enemies ?? 0;
			const heroRatio = ratio(hero, ground);
			const enemyRatio = ratio(enemies, ground);
			const ok = heroRatio >= HERO_RATIO_MIN && enemyRatio >= ENEMY_RATIO_MIN;
			failed ||= !ok;
			targets[target.name] = {
				meanLuminance: { ground, hero, enemies },
				heroOverGround: Number(heroRatio.toFixed(3)),
				enemyOverGround: Number(enemyRatio.toFixed(3)),
				pass: ok,
			};
			console.log(
				`${target.name}: ground ${ground.toFixed(4)} hero ${hero.toFixed(4)} enemies ${enemies.toFixed(4)} -> ${heroRatio.toFixed(2)}:1, ${enemyRatio.toFixed(2)}:1 ${ok ? "ok" : "FAIL"}`,
			);
			await context.close();
		}
		await browser.close();
		mkdirSync(dirname(OUT), { recursive: true });
		const report = {
			seed: 7,
			biome: "sunken_cemetery",
			metric: "mean WCAG relative luminance (0..1); ratio = (Lhi + 0.05) / (Llo + 0.05)",
			thresholds: { heroOverGround: HERO_RATIO_MIN, enemyOverGround: ENEMY_RATIO_MIN },
			targets,
		};
		writeFileSync(OUT, `${JSON.stringify(report, null, "\t")}\n`);
		return failed ? 1 : 0;
	} finally {
		server?.kill();
	}
}

process.exit(await main());
