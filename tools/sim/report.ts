import type { SimReport } from "./lib";

export interface Check {
	id: string;
	/** GDD section 25 target, as text. */
	target: string;
	value: number | null;
	ok: boolean;
	/** True when the run did not reach far enough to judge the metric. */
	skipped: boolean;
}

export interface Metrics {
	runs: number;
	/** Death rounds of the runs that died; runs that reached the requested round alive are counted in `survivors`. */
	deathRound: { p50: number; mean: number; stdev: number };
	survivors: number;
	/** Per boss id: runs that fought it, that killed it, and the median kill time. */
	bosses: Record<
		string,
		{
			fought: number;
			killed: number;
			medianKillSeconds: number | null;
			medianEnrageStacks: number | null;
		}
	>;
	/** Mean of (gold picked up in a round / mean item price of the next shop). */
	goldPerPrice: number | null;
	/** Mean level-ups per round over rounds 5-20. */
	levelUpsPerRound: number | null;
}

export function median(values: readonly number[]): number {
	if (values.length === 0) return Number.NaN;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function mean(values: readonly number[]): number {
	return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: readonly number[]): number {
	const m = mean(values);
	return values.length === 0 ? Number.NaN : Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function summarize(reports: readonly SimReport[]): Metrics {
	const dead = reports.filter((r) => r.outcome === "died");
	const rounds = dead.map((r) => r.roundReached);
	const bosses: Metrics["bosses"] = {};
	for (const report of reports) {
		for (const fight of report.bosses) {
			const entry = bosses[fight.boss] ?? {
				fought: 0,
				killed: 0,
				medianKillSeconds: null,
				medianEnrageStacks: null,
			};
			entry.fought++;
			if (fight.killSeconds !== null) entry.killed++;
			bosses[fight.boss] = entry;
		}
	}
	for (const [id, entry] of Object.entries(bosses)) {
		const times = reports.flatMap((r) =>
			r.bosses.flatMap((f) => (f.boss === id && f.killSeconds !== null ? [f.killSeconds] : [])),
		);
		entry.medianKillSeconds = times.length > 0 ? median(times) : null;
		const stacks = reports.flatMap((r) =>
			r.bosses.filter((f) => f.boss === id).map((f) => f.enrageStacks),
		);
		entry.medianEnrageStacks = stacks.length > 0 ? median(stacks) : null;
	}
	const ratios = reports.flatMap((r) =>
		r.perRound.flatMap((p) => (p.avgItemPrice > 0 ? [p.goldEarned / p.avgItemPrice] : [])),
	);
	const levelUps = reports.flatMap((r) =>
		r.perRound.flatMap((p) => (p.round >= 5 && p.round <= 20 ? [p.levelUps] : [])),
	);
	return {
		runs: reports.length,
		deathRound: { p50: median(rounds), mean: mean(rounds), stdev: stdev(rounds) },
		survivors: reports.length - dead.length,
		bosses,
		goldPerPrice: ratios.length > 0 ? mean(ratios) : null,
		levelUpsPerRound: levelUps.length > 0 ? mean(levelUps) : null,
	};
}

const within = (value: number | null, lo: number, hi: number): boolean =>
	value !== null && Number.isFinite(value) && value >= lo && value <= hi;

/** GDD 25 targets for Normal. A check is skipped when the runs were too short to judge it. */
export function checkTargets(metrics: Metrics, roundsRequested: number): Check[] {
	const checks: Check[] = [];
	const longEnough = roundsRequested >= 30;
	checks.push({
		id: "death-round-p50",
		target: "18-26",
		value: metrics.deathRound.p50,
		ok: within(metrics.deathRound.p50, 18, 26),
		skipped: !longEnough,
	});
	checks.push({
		id: "death-round-stdev",
		target: "<= 4",
		value: metrics.deathRound.stdev,
		ok: Number.isFinite(metrics.deathRound.stdev) && metrics.deathRound.stdev <= 4,
		skipped: !longEnough,
	});
	for (const [id, entry] of Object.entries(metrics.bosses)) {
		const [lo, hi] = id === "gravedigger" ? [45, 90] : [60, 120];
		checks.push({
			id: `boss-kill-seconds:${id}`,
			target: `${lo}-${hi}`,
			value: entry.medianKillSeconds,
			ok: within(entry.medianKillSeconds, lo, hi),
			skipped: entry.killed === 0 && entry.fought === 0,
		});
		checks.push({
			id: `boss-enrage-stacks:${id}`,
			target: "< 3",
			value: entry.medianEnrageStacks,
			ok: entry.medianEnrageStacks !== null && entry.medianEnrageStacks < 3,
			skipped: entry.fought === 0,
		});
	}
	checks.push({
		id: "gold-per-item-price",
		target: "1.2-1.8",
		value: metrics.goldPerPrice,
		ok: within(metrics.goldPerPrice, 1.2, 1.8),
		skipped: metrics.goldPerPrice === null,
	});
	checks.push({
		id: "level-ups-per-round-5-20",
		target: "1-2",
		value: metrics.levelUpsPerRound,
		ok: within(metrics.levelUpsPerRound, 1, 2),
		skipped: metrics.levelUpsPerRound === null,
	});
	return checks;
}
