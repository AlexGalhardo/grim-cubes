import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** One scenario of `reports/perf-<project>.json` (see bench.spec.ts). */
export interface ScenarioReport {
	drawCalls: number;
	activeMeshes: number;
	frameP99: number;
	fpsAvg?: number;
}

export type BenchReport = Record<string, ScenarioReport>;

export interface Summary {
	/** drawCalls and activeMeshes are deterministic; frameP99 is the median of the runs. */
	scenarios: Record<string, { drawCalls: number; activeMeshes: number; frameP99: number }>;
}

export interface Comparison {
	summary: Summary;
	/** Blocking: deterministic metrics, or a median frameP99 more than 10% worse than the baseline. */
	failures: string[];
	/** Informative: frameP99 changes inside the 10% band (SwiftShader CPU time is noisy). */
	notes: string[];
}

const SCENARIOS = ["horde100", "round20"] as const;
/** ROADMAP A-01-03: frameP99 may move this far before the job fails, so a noisy runner does not block. */
const FRAME_P99_BAND = 10;

export function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function summarize(runs: readonly BenchReport[]): { summary: Summary; failures: string[] } {
	const failures: string[] = [];
	const scenarios: Summary["scenarios"] = {};
	for (const name of SCENARIOS) {
		const found = runs
			.map((report) => report[name])
			.filter((scenario): scenario is ScenarioReport => scenario !== undefined);
		const first = found[0];
		if (!first) continue;
		for (const metric of ["drawCalls", "activeMeshes"] as const) {
			const values = new Set(found.map((scenario) => scenario[metric]));
			if (values.size > 1)
				failures.push(`${name}.${metric} differs between runs: ${[...values].join(", ")}`);
		}
		scenarios[name] = {
			drawCalls: first.drawCalls,
			activeMeshes: first.activeMeshes,
			frameP99: Math.round(median(found.map((scenario) => scenario.frameP99)) * 10) / 10,
		};
	}
	return { summary: { scenarios }, failures };
}

export function compare(runs: readonly BenchReport[], baseline: Summary | undefined): Comparison {
	const { summary, failures } = summarize(runs);
	const notes: string[] = [];
	if (!baseline) notes.push("no baseline from main yet: nothing to compare against");
	for (const [name, now] of Object.entries(summary.scenarios)) {
		const before = baseline?.scenarios[name];
		if (!before) continue;
		for (const metric of ["drawCalls", "activeMeshes"] as const) {
			if (now[metric] !== before[metric])
				failures.push(`${name}.${metric}: ${before[metric]} -> ${now[metric]}`);
		}
		if (before.frameP99 > 0) {
			const delta = ((now.frameP99 - before.frameP99) / before.frameP99) * 100;
			const line = `${name}.frameP99 median ${before.frameP99} -> ${now.frameP99} ms (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%)`;
			if (delta > FRAME_P99_BAND) failures.push(`${line} (>${FRAME_P99_BAND}%)`);
			else notes.push(`${line}, informative`);
		}
	}
	return { summary, failures, notes };
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Usage: bun tools/perf/compare.ts --runs perf-runs --baseline baseline [--project desktop-1080] [--out perf-current.json] */
function main(argv: string[]): number {
	const flag = (name: string, fallback: string): string => {
		const index = argv.indexOf(name);
		return index >= 0 ? (argv[index + 1] ?? fallback) : fallback;
	};
	const runsDir = flag("--runs", "perf-runs");
	const project = flag("--project", "desktop-1080");
	const out = flag("--out", "perf-current.json");
	const runs = readdirSync(runsDir)
		.map((dir) => join(runsDir, dir, `perf-${project}.json`))
		.filter((file) => existsSync(file))
		.map((file) => readJson<BenchReport>(file));
	if (runs.length === 0) throw new Error(`no perf-${project}.json under ${runsDir}`);
	const baselineFile = join(flag("--baseline", "baseline"), out);
	const result = compare(runs, existsSync(baselineFile) ? readJson<Summary>(baselineFile) : undefined);

	mkdirSync(join(out, ".."), { recursive: true });
	writeFileSync(out, `${JSON.stringify(result.summary, null, "\t")}\n`);
	const lines = [
		`perf (${runs.length} runs, ${project})`,
		...Object.entries(result.summary.scenarios).map(
			([name, scenario]) =>
				`- ${name}: drawCalls ${scenario.drawCalls}, activeMeshes ${scenario.activeMeshes}, frameP99 median ${scenario.frameP99} ms`,
		),
		...result.notes.map((note) => `- ${note}`),
		...result.failures.map((failure) => `- FAIL ${failure}`),
	];
	console.log(lines.join("\n"));
	const summaryFile = process.env.GITHUB_STEP_SUMMARY;
	if (summaryFile) writeFileSync(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
	return result.failures.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
