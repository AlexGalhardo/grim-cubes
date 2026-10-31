import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAX_CREDITS, type FetchFn, parsePrompts, run } from "./lib";

const PROMPTS_PATH = fileURLToPath(new URL("../../assets/src/audio/prompts.json", import.meta.url));
const DEFAULT_OUT_DIR = fileURLToPath(new URL("../../assets/src/audio", import.meta.url));

function flagValue(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: string[]): Promise<number> {
	const prompts = parsePrompts(JSON.parse(await readFile(PROMPTS_PATH, "utf8")) as unknown);
	const maxCredits = Number(flagValue(argv, "--max-credits") ?? DEFAULT_MAX_CREDITS);
	if (!Number.isFinite(maxCredits)) {
		console.error("error: --max-credits must be a number");
		return 1;
	}
	const only = flagValue(argv, "--only");
	return run({
		prompts,
		outDir: flagValue(argv, "--out") ?? DEFAULT_OUT_DIR,
		env: process.env,
		dryRun: argv.includes("--dry-run"),
		force: argv.includes("--force"),
		allowFree: argv.includes("--allow-free"),
		...(only !== undefined && { only }),
		maxCredits,
		fetch: fetch as unknown as FetchFn,
		log: (line) => console.log(line),
	});
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
