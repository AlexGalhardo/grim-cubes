/**
 * Balance tuning helper (A-02-03): runs the simulator in-process with temporary overrides on the loaded data, so a
 * round of experiments needs no edits to `data/*.json`. Nothing is written; copy the winning numbers into the JSON.
 *
 * Usage: bun tools/sim/tune.ts [flags]
 *   --damage-base 0.2        multiplies every enemy damageBase
 *   --damage-growth 1.2      multiplies every enemy damagePerRound
 *   --hp-growth 1.5          multiplies every enemy hpPerRound
 *   --boss-hp 4800,9000,10000      hpBaseRound10 per boss (bosses.json order)
 *   --boss-contact 0.12      multiplies rounds.boss contactDamageBase / PerRound
 *   --boss-mult 1,2,2        contactDamageMult per boss
 *   --pattern mud_pool.damageMult=2   override one boss pattern param (repeatable)
 *   --rounds-data '{"xp":{"base":8,"perLevel":5}}'   deep-assign onto rounds.json groups
 *   --runs 16 --rounds 35 --seed 1    (defaults; runs are split across worker threads)
 * Prints the death rounds ("S" = still alive at the end), the GDD 25 checks and who killed the dead runs.
 */
import { cpus } from "node:os";
import type { SimReport } from "./lib";
import { checkTargets, summarize } from "./report";
import { parseTuneArgs } from "./tuneArgs";

const options = parseTuneArgs(process.argv.slice(2));
const jobs = Math.max(1, Math.min(options.runs, cpus().length - 1));
const seeds = Array.from({ length: options.runs }, (_, i) => options.seed + i);
const batches = Array.from({ length: jobs }, (_, j) => seeds.filter((_, i) => i % jobs === j));

const parts = await Promise.all(
	batches.map(
		(batch) =>
			new Promise<SimReport[]>((resolve, reject) => {
				const worker = new Worker(new URL("./tuneWorker.ts", import.meta.url));
				worker.onmessage = (event: MessageEvent<SimReport[]>) => {
					worker.terminate();
					resolve(event.data);
				};
				worker.onerror = (event) => reject(new Error(event.message));
				worker.postMessage({ options, seeds: batch });
			}),
	),
);
const reports = parts.flat().sort((x, y) => x.seed - y.seed);
const metrics = summarize(reports);
console.log("deaths", reports.map((r) => (r.outcome === "died" ? r.roundReached : "S")).join(","));
for (const c of checkTargets(metrics, 30)) {
	console.log(
		c.ok ? "ok  " : "FAIL",
		c.id,
		c.value === null ? "n/a" : Number(c.value).toFixed(2),
		c.target,
	);
}
const killers: Record<string, number> = {};
for (const r of reports) {
	if (r.outcome === "died") {
		const key = `${r.roundReached}:${r.killedBy}`;
		killers[key] = (killers[key] ?? 0) + 1;
	}
}
console.log(JSON.stringify(killers));
