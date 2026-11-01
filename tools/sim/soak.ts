import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { runSim } from "./lib";

/**
 * Headless soak (R-01-02): `runs` immortal runs of `rounds` rounds each, one after the other in this process, to catch
 * crashes, dropped events and memory that keeps growing. Usage: `bun tools/sim/soak.ts [--runs 10] [--rounds 60]
 * [--out reports/soak-1.0.json]`. The heap is read after a forced GC at the end of every run; the delta compares the
 * last run with the first (the first one pays for module loading and caches).
 */
const arg = (name: string, fallback: string): string => {
	const i = process.argv.indexOf(name);
	return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const runs = Number(arg("--runs", "10"));
const rounds = Number(arg("--rounds", "60"));
const out = arg("--out", "reports/soak-1.0.json");

const heapMB = (): number => {
	Bun.gc(true);
	return Math.round((process.memoryUsage().heapUsed / 1048576) * 10) / 10;
};

const perRun: {
	seed: number;
	outcome: string;
	roundReached: number;
	steps: number;
	eventsDropped: number;
	heapMB: number;
	seconds: number;
}[] = [];
const errors: string[] = [];
for (let seed = 1; seed <= runs; seed++) {
	const started = performance.now();
	try {
		const report = runSim({ seed, rounds, difficulty: "normal", immortal: true });
		perRun.push({
			seed,
			outcome: report.outcome,
			roundReached: report.roundReached,
			steps: report.steps,
			eventsDropped: report.eventsDropped,
			heapMB: heapMB(),
			seconds: Math.round((performance.now() - started) / 100) / 10,
		});
	} catch (error) {
		errors.push(`seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
	}
	const last = perRun.at(-1);
	console.log(
		`seed ${seed}: ${last ? `${last.outcome} round ${last.roundReached}, heap ${last.heapMB} MB` : "ERROR"}`,
	);
}

const first = perRun[0]?.heapMB ?? 0;
const final = perRun.at(-1)?.heapMB ?? 0;
const payload = {
	gpu: null,
	headless: true,
	runs: perRun.length,
	rounds,
	heapDeltaMB: Math.round((final - first) * 10) / 10,
	errors: errors.length,
	errorMessages: errors,
	eventsDropped: perRun.reduce((sum, r) => sum + r.eventsDropped, 0),
	allReachedRound: perRun.every((r) => r.roundReached >= rounds),
	/** Runs that used up their step budget without finishing: a boss the immortal bot never killed. */
	timeouts: perRun
		.filter((r) => r.outcome === "timeout")
		.map((r) => ({ seed: r.seed, round: r.roundReached })),
	perRun,
};
// Bun on Windows throws EEXIST for a recursive mkdir of an existing relative directory.
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload, null, "\t")}\n`);
console.log(
	`soak: ${payload.runs} runs x ${rounds} rounds, heap delta ${payload.heapDeltaMB} MB, ${payload.errors} errors, ${payload.eventsDropped} events dropped -> ${out}`,
);
process.exit(payload.errors === 0 && payload.heapDeltaMB < 20 && payload.eventsDropped === 0 ? 0 : 1);
