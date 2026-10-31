import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname } from "node:path";
import type { SimOptions, SimReport } from "./lib";
import { runSim } from "./lib";
import { checkTargets, summarize } from "./report";

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : undefined;
}

const KNOWN = new Set([
	"--seed",
	"--runs",
	"--rounds",
	"--difficulty",
	"--weapon",
	"--ossuary",
	"--out",
	"--check",
	"--jobs",
]);

/**
 * Usage: bun run sim -- [--runs 200] [--seed 1] [--rounds 10] [--difficulty normal] [--weapon sword]
 *   [--ossuary flesh_1,steel_1] [--jobs 4] [--out reports/x.json] [--check]
 * Run i uses seed (seed + i). `--check` exits 3 when a GDD 25 target is missed (skipped targets do not count).
 */
/** Runs the batches on worker threads (one per job); a single job runs in-process. */
async function simulate(all: SimOptions[], jobs: number): Promise<SimReport[]> {
	if (jobs <= 1 || all.length <= 1) return all.map((options) => runSim(options));
	const batches: SimOptions[][] = Array.from({ length: jobs }, () => []);
	for (const [i, options] of all.entries()) batches[i % jobs]?.push(options);
	const parts = await Promise.all(
		batches
			.filter((batch) => batch.length > 0)
			.map(
				(batch) =>
					new Promise<SimReport[]>((resolve, reject) => {
						const worker = new Worker(new URL("./worker.ts", import.meta.url));
						worker.onmessage = (event: MessageEvent<SimReport[]>) => {
							worker.terminate();
							resolve(event.data);
						};
						worker.onerror = (event) => reject(new Error(event.message));
						worker.postMessage(batch);
					}),
			),
	);
	return parts.flat().sort((a, b) => a.seed - b.seed);
}

async function main(argv: string[]): Promise<number> {
	const unknown = argv.filter((arg) => arg.startsWith("--") && !KNOWN.has(arg));
	if (unknown.length > 0) {
		console.error(`sim: unknown option ${unknown[0]}`);
		return 2;
	}
	const seed = Number(flag(argv, "--seed") ?? 1);
	const rounds = Number(flag(argv, "--rounds") ?? 5);
	const runs = Number(flag(argv, "--runs") ?? 1);
	if (![seed, rounds, runs].every(Number.isInteger) || rounds < 1 || runs < 1) {
		console.error("sim: --seed, --rounds and --runs must be integers (rounds, runs >= 1)");
		return 1;
	}
	const difficulty = flag(argv, "--difficulty") ?? "normal";
	const weapon = flag(argv, "--weapon");
	const ossuary = flag(argv, "--ossuary")?.split(",").filter(Boolean);

	const jobs = Number(flag(argv, "--jobs") ?? Math.min(8, Math.max(1, cpus().length - 1)));
	const all: SimOptions[] = Array.from({ length: runs }, (_, i) => ({
		seed: seed + i,
		rounds,
		difficulty,
		...(weapon !== undefined && { weapon }),
		...(ossuary !== undefined && { ossuary }),
	}));
	const reports = await simulate(all, jobs);
	const metrics = summarize(reports);
	const checks = checkTargets(metrics, rounds);

	const date = new Date().toLocaleDateString("sv-SE");
	const out = flag(argv, "--out") ?? `reports/sim-${date}-seed${seed}-runs${runs}.json`;
	// Bun on Windows throws EEXIST for recursive mkdir of an existing relative dir such as "..".
	if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
	const payload =
		runs === 1
			? { report: reports[0], metrics, checks }
			: {
					options: { seed, runs, rounds, difficulty },
					metrics,
					checks,
					runs: reports.map((r) => ({
						seed: r.seed,
						outcome: r.outcome,
						roundReached: r.roundReached,
						kills: r.kills,
						worldHash: r.worldHash,
					})),
				};
	writeFileSync(out, `${JSON.stringify(payload, null, "\t")}\n`);

	console.log(
		`sim: ${runs} run(s), death round p50 ${metrics.deathRound.p50} (IQR ${metrics.deathRound.iqr.toFixed(1)}, stdev ${metrics.deathRound.stdev.toFixed(2)}, ${metrics.survivors} alive at the end) -> ${out}`,
	);
	let failed = false;
	for (const check of checks) {
		const status = check.skipped ? "skip" : check.ok ? "ok  " : "FAIL";
		if (!check.skipped && !check.ok) failed = true;
		console.log(
			`  ${status} ${check.id}: ${check.value === null ? "n/a" : Number(check.value).toFixed(2)} (target ${check.target})`,
		);
	}
	return argv.includes("--check") && failed ? 3 : 0;
}

try {
	process.exit(await main(process.argv.slice(2)));
} catch (error) {
	console.error(`sim: ${error instanceof Error ? error.message : "failed"}`);
	process.exit(1);
}
