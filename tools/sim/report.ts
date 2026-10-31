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
	/**
	 * Round each run ended in, over ALL runs: a survivor counts as the round it reached (the requested horizon),
	 * i.e. right-censored. A bot with linear stats gives a bimodal distribution, so the spread is the interquartile
	 * range; the standard deviation is kept as information (GDD 25, decision of 2026-10-31).
	 */
	deathRound: { p50: number; p25: number; p75: number; iqr: number; mean: number; stdev: number };
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

/** Linear-interpolated percentile (0..1) of an unsorted list. */
export function percentile(values: readonly number[], p: number): number {
	if (values.length === 0) return Number.NaN;
	const sorted = [...values].sort((a, b) => a - b);
	const at = p * (sorted.length - 1);
	const lo = Math.floor(at);
	const hi = Math.ceil(at);
	return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (at - lo);
}

function stdev(values: readonly number[]): number {
	const m = mean(values);
	return values.length === 0 ? Number.NaN : Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function summarize(reports: readonly SimReport[]): Metrics {
	const dead = reports.filter((r) => r.outcome === "died");
	const rounds = reports.map((r) => r.roundReached);
	const p25 = percentile(rounds, 0.25);
	const p75 = percentile(rounds, 0.75);
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
		deathRound: {
			p50: median(rounds),
			p25,
			p75,
			iqr: p75 - p25,
			mean: mean(rounds),
			stdev: stdev(rounds),
		},
		survivors: reports.length - dead.length,
		bosses,
		goldPerPrice: ratios.length > 0 ? mean(ratios) : null,
		levelUpsPerRound: levelUps.length > 0 ? mean(levelUps) : null,
	};
}

const within = (value: number | null, lo: number, hi: number): boolean =>
	value !== null && Number.isFinite(value) && value >= lo && value <= hi;

/**
 * Spread limit of the death round for the greedy bot (GDD 25): provisional until the B-04 playtests. The product
 * target for real players stays at 10 rounds.
 */
export const IQR_LIMIT = 25;

/**
 * Share of runs still alive at the horizon (GDD 25, decision of 2026-10-31). Survivors count as the horizon, so with
 * about half of the runs alive the median jumps from ~24 to ~30 for small changes: keeping this under the limit keeps
 * the p50 away from that cliff.
 */
export const ALIVE_LIMIT = 0.45;

export type Difficulty = "normal" | "grim" | "nightmare";
export type PolicyName = "greedy" | "tank";
export interface Profile {
	difficulty: Difficulty;
	policy: PolicyName;
}

interface Ranges {
	p50: readonly [number, number];
	alive: number;
	/** Highest median boss kill time in seconds (the lower bound is the one of GDD 25). */
	killMax: { gravedigger: number; other: number };
	/** Boss enrage stacks must stay below this (a Nightmare tank may reach 3). */
	enrageBelow: number;
}

/**
 * GDD 25.1 ranges per difficulty and policy (decision of the Orq, 2026-10-31). Grim and Nightmare are calibrated with
 * the reference Ossuary profiles of the GDD (`--ossuary`); without them the bot dies far earlier.
 */
export function rangesFor({ difficulty, policy }: Profile): Ranges {
	if (policy === "greedy") {
		const p50 = { normal: [18, 26], grim: [14, 22], nightmare: [11, 18] } as const;
		return {
			p50: p50[difficulty],
			alive: ALIVE_LIMIT,
			killMax: { gravedigger: 90, other: 120 },
			enrageBelow: 3,
		};
	}
	const nightmare = difficulty === "nightmare";
	return {
		p50: nightmare ? [30, 35] : [26, 35],
		alive: nightmare ? 0.7 : 0.65,
		killMax: nightmare ? { gravedigger: 190, other: 190 } : { gravedigger: 150, other: 150 },
		enrageBelow: nightmare ? 4 : 3,
	};
}

/** GDD 25 targets for the given profile (default: Normal, greedy). A check is skipped when the runs were too short. */
export function checkTargets(
	metrics: Metrics,
	roundsRequested: number,
	profile: Profile = { difficulty: "normal", policy: "greedy" },
): Check[] {
	const checks: Check[] = [];
	const ranges = rangesFor(profile);
	const longEnough = roundsRequested >= 30;
	checks.push({
		id: "death-round-p50",
		target: `${ranges.p50[0]}-${ranges.p50[1]}`,
		value: metrics.deathRound.p50,
		ok: within(metrics.deathRound.p50, ranges.p50[0], ranges.p50[1]),
		skipped: !longEnough,
	});
	checks.push({
		id: "death-round-iqr",
		target: `<= ${IQR_LIMIT}`,
		value: metrics.deathRound.iqr,
		ok: Number.isFinite(metrics.deathRound.iqr) && metrics.deathRound.iqr <= IQR_LIMIT,
		skipped: !longEnough,
	});
	const alive = metrics.runs > 0 ? metrics.survivors / metrics.runs : null;
	checks.push({
		id: "alive-fraction-at-horizon",
		target: `<= ${ranges.alive}`,
		value: alive,
		ok: alive !== null && alive <= ranges.alive,
		skipped: !longEnough || alive === null,
	});
	for (const [id, entry] of Object.entries(metrics.bosses)) {
		const lo = id === "gravedigger" ? 45 : 60;
		const hi = id === "gravedigger" ? ranges.killMax.gravedigger : ranges.killMax.other;
		checks.push({
			id: `boss-kill-seconds:${id}`,
			target: `${lo}-${hi}`,
			value: entry.medianKillSeconds,
			ok: within(entry.medianKillSeconds, lo, hi),
			skipped: entry.killed === 0 && entry.fought === 0,
		});
		checks.push({
			id: `boss-enrage-stacks:${id}`,
			target: `< ${ranges.enrageBelow}`,
			value: entry.medianEnrageStacks,
			ok: entry.medianEnrageStacks !== null && entry.medianEnrageStacks < ranges.enrageBelow,
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
