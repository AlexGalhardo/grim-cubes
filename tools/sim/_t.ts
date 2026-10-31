import { bossesData, enemiesData, roundsData } from "../../packages/game/src/index";
import { runSim } from "./lib";
import { checkTargets, summarize } from "./report";

const [a, b, hp, runsArg, bossDmgArg, roundsArg, hpGrowArg] = process.argv.slice(2);
const baseScale = Number(a ?? 1);
const growScale = Number(b ?? 1);
const bossHp = (hp ?? "1200,2800,5000").split(",").map(Number);
const runs = Number(runsArg ?? 30);
const bossDmg = Number(bossDmgArg ?? 1);
const rounds = Number(roundsArg ?? 30);
const hpGrow = Number(hpGrowArg ?? 1);
for (const e of enemiesData as unknown as {
	damageBase: number;
	damagePerRound: number;
	hpPerRound: number;
}[]) {
	e.damageBase *= baseScale;
	e.damagePerRound *= growScale;
	e.hpPerRound *= hpGrow;
}
roundsData.boss.contactDamageBase *= bossDmg;
roundsData.boss.contactDamagePerRound *= bossDmg;
for (const [i, boss] of bossesData.entries())
	(boss as { hpBaseRound10: number }).hpBaseRound10 = bossHp[i] ?? boss.hpBaseRound10;
const reports = [];
for (let seed = 1; seed <= runs; seed++) reports.push(runSim({ seed, rounds, difficulty: "normal" }));
const m = summarize(reports);
console.log("deaths", reports.map((r) => (r.outcome === "died" ? r.roundReached : "S")).join(","));
for (const c of checkTargets(m, 30))
	console.log(
		c.ok ? "ok  " : "FAIL",
		c.id,
		c.value === null ? "n/a" : Number(c.value).toFixed(2),
		c.target,
	);
const by: Record<string, number> = {};
for (const r of reports)
	if (r.outcome === "died")
		by[`${r.roundReached}:${r.killedBy}`] = (by[`${r.roundReached}:${r.killedBy}`] ?? 0) + 1;
console.log(JSON.stringify(by));
