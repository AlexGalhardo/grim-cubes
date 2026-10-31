import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
// Namespace import: Biome cannot follow @playwright/test's `export *` re-export of `chromium`.
import * as playwright from "@playwright/test";
import {
	bypassHeaders,
	type ConsoleEntry,
	debugApiProblems,
	errorsFrom,
	parseArgs,
	sameOrigin,
	withDebugParam,
} from "./lib";

const SWIFTSHADER_ARGS = [
	"--use-gl=angle",
	"--use-angle=swiftshader",
	"--enable-unsafe-swiftshader",
	"--ignore-gpu-blocklist",
];

async function smoke(argv: string[]): Promise<number> {
	const args = parseArgs(argv);
	const headers = bypassHeaders(process.env);
	const entries: ConsoleEntry[] = [];
	const pageErrors: string[] = [];
	let debugPresent = false;

	const browser = await playwright.chromium.launch({ args: SWIFTSHADER_ARGS });
	try {
		const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
		if (Object.keys(headers).length > 0) {
			// Same origin only: the bypass secret must not leak to third-party hosts the page might load.
			await context.route("**/*", (route) => {
				const request = route.request();
				if (sameOrigin(request.url(), args.url)) {
					void route.continue({ headers: { ...request.headers(), ...headers } });
				} else {
					void route.continue();
				}
			});
		}
		const page = await context.newPage();
		page.on("console", (message) =>
			entries.push({ type: message.type(), text: message.text(), url: message.location().url }),
		);
		page.on("pageerror", (error) => pageErrors.push(error.message));

		const response = await page.goto(args.url, { waitUntil: "load", timeout: args.timeoutMs });
		if (!response?.ok()) {
			console.error(`smoke: ${args.url} responded ${response?.status() ?? "no response"}`);
			return 1;
		}
		// String expression: the tools tsconfig has no DOM lib.
		await page.waitForFunction("window.gc?.ready === true", undefined, { timeout: args.timeoutMs });
		mkdirSync(dirname(args.out), { recursive: true });
		await page.screenshot({ path: args.out });
		// Second load with ?debug=1: a build made with GC_DEBUG_API=1 only installs the debug API under that parameter.
		await page.goto(withDebugParam(args.url), { waitUntil: "load", timeout: args.timeoutMs });
		await page.waitForFunction("window.gc?.ready === true", undefined, { timeout: args.timeoutMs });
		debugPresent = (await page.evaluate("window.gc?.debug !== undefined")) === true;
	} catch (error) {
		console.error(
			`smoke: ${error instanceof Error ? (error.message.split("\n")[0] ?? "failed") : "failed"}`,
		);
		return 1;
	} finally {
		await browser.close();
	}

	const problems = [...errorsFrom(entries), ...pageErrors];
	for (const problem of problems) console.error(`smoke: console error: ${problem}`);
	const debugProblems = debugApiProblems(debugPresent);
	for (const problem of debugProblems) console.error(`smoke: ${problem}`);
	if (problems.length > 0 || debugProblems.length > 0) return 1;
	console.log(`smoke: OK ${args.url} (gc.ready, screenshot ${args.out}, 0 console errors)`);
	return 0;
}

process.exit(
	await smoke(process.argv.slice(2)).catch((error: unknown) => {
		console.error(`smoke: ${error instanceof Error ? error.message : "failed"}`);
		return 1;
	}),
);
