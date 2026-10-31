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
 *   --runs 16 --rounds 35 --seed 1    (defaults; keep to <= 35 rounds and 16 runs, long runs take minutes)
 * Prints the death rounds ("S" = still alive at the end), the GDD 25 checks and who killed the dead runs.
 */
import { bossesData, enemiesData, roundsData } from "../../packages/game/src/index";
import { runSim, type SimReport } from "./lib";
import { checkTargets, summarize } from "./report";
import { parseTuneArgs } from "./tuneArgs";

const options = parseTuneArgs(process.argv.slice(2));

for (const enemy of enemiesData as unknown as {
	damageBase: number;
	damagePerRound: number;
	hpPerRound: number;
}[]) {
	enemy.damageBase *= options.damageBase;
	enemy.damagePerRound *= options.damageGrowth;
	enemy.hpPerRound *= options.hpGrowth;
}
roundsData.boss.contactDamageBase *= options.bossContact;
roundsData.boss.contactDamagePerRound *= options.bossContact;
for (const [i, boss] of bossesData.entries()) {
	const mutable = boss as unknown as { hpBaseRound10: number; contactDamageMult?: number };
	mutable.hpBaseRound10 = options.bossHp[i] ?? mutable.hpBaseRound10;
	mutable.contactDamageMult = options.bossMult[i] ?? mutable.contactDamageMult ?? 1;
}
for (const { pattern, param, value } of options.patterns) {
	let found = false;
	for (const boss of bossesData) {
		for (const p of boss.patterns) {
			if (p.id !== pattern) continue;
			p.params = { ...p.params, [param]: value };
			found = true;
		}
	}
	if (!found) throw new Error(`no boss pattern "${pattern}"`);
}
for (const [group, values] of Object.entries(options.rounds_data)) {
	const target = (roundsData as unknown as Record<string, Record<string, number>>)[group];
	if (!target) throw new Error(`rounds.json has no group "${group}"`);
	Object.assign(target, values);
}

const reports: SimReport[] = [];
for (let i = 0; i < options.runs; i++) {
	reports.push(runSim({ seed: options.seed + i, rounds: options.rounds, difficulty: "normal" }));
}
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
	if (r.outcome === "died")
		killers[`${r.roundReached}:${r.killedBy}`] = (killers[`${r.roundReached}:${r.killedBy}`] ?? 0) + 1;
}
console.log(JSON.stringify(killers));
