import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadSimData, runSim } from "./lib";

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

/** Usage: bun run sim -- --seed 42 --rounds 5 [--difficulty normal] [--weapon sword] [--out reports/x.json] */
function main(argv: string[]): number {
	const seed = Number(flag(argv, "--seed") ?? 1);
	const rounds = Number(flag(argv, "--rounds") ?? 5);
	if (!Number.isInteger(seed) || !Number.isInteger(rounds) || rounds < 1) {
		console.error("sim: --seed and --rounds must be integers (rounds >= 1)");
		return 1;
	}
	const difficulty = flag(argv, "--difficulty") ?? "normal";
	const weapon = flag(argv, "--weapon");
	const report = runSim(loadSimData(), {
		seed,
		rounds,
		difficulty,
		...(weapon !== undefined && { weapon }),
	});

	const date = new Date().toLocaleDateString("sv-SE");
	const out = flag(argv, "--out") ?? `reports/sim-${date}-seed${seed}.json`;
	mkdirSync(dirname(out), { recursive: true });
	writeFileSync(out, `${JSON.stringify(report, null, "\t")}\n`);
	console.log(
		`sim: seed ${seed}, ${report.outcome} at round ${report.roundReached}/${rounds}, ${report.kills} kills, ` +
			`${Math.round(report.damageTaken)} damage taken, ${report.gold} gold -> ${out}`,
	);
	return 0;
}

try {
	process.exit(main(process.argv.slice(2)));
} catch (error) {
	console.error(`sim: ${error instanceof Error ? error.message : "failed"}`);
	process.exit(1);
}
