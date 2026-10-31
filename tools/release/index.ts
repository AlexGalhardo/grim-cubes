import { readFileSync, writeFileSync } from "node:fs";
import { type Bump, extractNotes, runRelease } from "./lib";

const BUMPS: readonly string[] = ["patch", "minor", "major", "rc"];
const USAGE =
	"usage: bun run release <patch|minor|major|rc> [--version X.Y.Z] [--dry-run] [--publish]\n       bun tools/release/index.ts notes <X.Y.Z>";

function flagValue(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

function exec(command: string, args: string[]): string {
	const result = Bun.spawnSync([command, ...args]);
	if (result.exitCode !== 0)
		throw new Error(`${command} ${args[0] ?? ""} failed: ${result.stderr.toString().trim()}`);
	return result.stdout.toString().trim();
}

function main(argv: string[]): number {
	const [command] = argv;
	if (command === "notes") {
		const version = argv[1];
		if (!version) throw new Error(USAGE);
		process.stdout.write(extractNotes(readFileSync("CHANGELOG.md", "utf8"), version));
		return 0;
	}
	if (command === undefined || !BUMPS.includes(command)) {
		console.error(USAGE);
		return 1;
	}
	const versionOverride = flagValue(argv, "--version");
	return runRelease(
		{
			bump: command as Bump,
			dryRun: argv.includes("--dry-run"),
			publish: argv.includes("--publish"),
			// Local date: toISOString() is UTC and rolls over to the next day after 21:00 at UTC-3.
			date: new Date().toLocaleDateString("sv-SE"),
			...(versionOverride !== undefined && { versionOverride }),
		},
		{
			read: (path) => readFileSync(path, "utf8"),
			write: (path, content) => writeFileSync(path, content),
			log: (line) => console.log(line),
			exec,
		},
	);
}

if (import.meta.main) {
	try {
		process.exit(main(process.argv.slice(2)));
	} catch (error) {
		console.error(`release: ${error instanceof Error ? error.message : "failed"}`);
		process.exit(1);
	}
}
