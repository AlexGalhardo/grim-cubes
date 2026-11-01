/**
 * Browser soak test (R-01-02, `?bench=soak`, debug builds only): the greedy bot plays whole runs on an immortal hero
 * while this module records frame times, the JS heap and errors, one report for all the runs. Every run is a page
 * load (the game restarts that way for a player too), so the report lives in `sessionStorage` between them and
 * `reset=1` starts over. Pure apart from the storage and clock it is given, so it is unit tested.
 */

export interface SoakOptions {
	/** Runs to play one after the other. */
	runs: number;
	/** Rounds each run must reach. */
	rounds: number;
	/** Seed of the first run; run `i` uses `startSeed + i`. */
	startSeed: number;
	/** Game speed of the loop (1 is real time; 3 shortens a 60-round run a lot but loads the frame more). */
	speed: 1 | 2 | 3;
}

export type SoakOutcome = "completed" | "died" | "stalled";

export interface SoakRunReport {
	seed: number;
	outcome: SoakOutcome;
	roundReached: number;
	steps: number;
	seconds: number;
	frames: number;
	fps: { avg: number; low1Percent: number };
	frameMs: { p50: number; p99: number; max: number };
	/** `performance.memory` is Chrome only: null elsewhere. */
	heapMB: { start: number; peak: number; end: number } | null;
}

export interface SoakReport {
	startedAt: string;
	userAgent: string;
	gpu: string | null;
	options: SoakOptions;
	runs: SoakRunReport[];
	errors: string[];
	done: boolean;
	/** Heap at the end of the last run minus the end of the first (MB): memory that keeps growing between runs. */
	heapGrowthMB: number | null;
}

export interface SoakEnv {
	userAgent: string;
	/** Wall-clock milliseconds. */
	now(): number;
	/** `performance.memory.usedJSHeapSize` in megabytes, or null when the browser does not tell. */
	heapMB(): number | null;
}

export interface Soak {
	/** Seed of the run being played. */
	readonly seed: number;
	readonly runIndex: number;
	/** True once every planned run has a report. */
	readonly done: boolean;
	readonly options: SoakOptions;
	/** Call once per rendered frame. */
	frame(): void;
	noteError(message: string): void;
	setGpu(gpu: string): void;
	/** Closes the current run and reports whether another one follows. */
	finishRun(result: { outcome: SoakOutcome; roundReached: number; steps: number }): { next: boolean };
	report(): SoakReport;
	reset(): void;
}

export const SOAK_STORAGE_KEY = "gc.soak";
export const HEAP_SAMPLE_MS = 5000;
const MAX_ERRORS = 100;
/** Frame-time histogram: 0.5 ms buckets up to 250 ms, the last bucket takes everything slower. */
const BUCKET_MS = 0.5;
const BUCKETS = 500;

const clampInt = (text: string | null, fallback: number, min: number, max: number): number => {
	if (text === null) return fallback;
	const n = Number(text);
	return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

export function soakOptionsFrom(params: URLSearchParams): SoakOptions {
	const speed = clampInt(params.get("speed"), 1, 1, 3);
	return {
		runs: clampInt(params.get("runs"), 10, 1, 1000),
		rounds: clampInt(params.get("rounds"), 60, 1, 200),
		startSeed: clampInt(params.get("seed"), 1, 0, 2 ** 31 - 1),
		speed: speed === 3 ? 3 : speed === 2 ? 2 : 1,
	};
}

/** Percentiles of a frame-time histogram; `fromTop` is the fraction of the slowest frames (0.01 = the 1% worst). */
export function percentileMs(histogram: ArrayLike<number>, total: number, fraction: number): number {
	if (total === 0) return 0;
	const target = Math.ceil(total * fraction);
	let seen = 0;
	for (let i = 0; i < histogram.length; i++) {
		seen += histogram[i] ?? 0;
		if (seen >= target) return (i + 1) * BUCKET_MS;
	}
	return histogram.length * BUCKET_MS;
}

interface Stored {
	report: SoakReport;
}

type KeyValue = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createSoak(storage: KeyValue, options: SoakOptions, env: SoakEnv, fresh = false): Soak {
	const load = (): SoakReport | null => {
		try {
			const text = storage.getItem(SOAK_STORAGE_KEY);
			if (!text) return null;
			const parsed = (JSON.parse(text) as Partial<Stored>).report;
			return parsed && Array.isArray(parsed.runs) && Array.isArray(parsed.errors) ? parsed : null;
		} catch {
			return null;
		}
	};
	const blank = (): SoakReport => ({
		startedAt: new Date(env.now()).toISOString(),
		userAgent: env.userAgent,
		gpu: null,
		options,
		runs: [],
		errors: [],
		done: false,
		heapGrowthMB: null,
	});
	if (fresh) storage.removeItem(SOAK_STORAGE_KEY);
	const report = load() ?? blank();
	// The plan of the first load wins: later loads only carry the run's own seed.
	const plan = report.options;
	const save = (): void => {
		try {
			storage.setItem(SOAK_STORAGE_KEY, JSON.stringify({ report }));
		} catch {
			// A full or blocked storage loses the report, not the run.
		}
	};

	const histogram = new Uint32Array(BUCKETS);
	let frames = 0;
	let frameSum = 0;
	let lastFrameAt = Number.NaN;
	const runStartedAt = env.now();
	let heap: { start: number; peak: number; end: number } | null = null;
	let lastHeapAt = Number.NEGATIVE_INFINITY;

	const sampleHeap = (now: number): void => {
		if (now - lastHeapAt < HEAP_SAMPLE_MS) return;
		lastHeapAt = now;
		const mb = env.heapMB();
		if (mb === null) return;
		heap = heap
			? { start: heap.start, peak: Math.max(heap.peak, mb), end: mb }
			: { start: mb, peak: mb, end: mb };
	};

	return {
		get seed(): number {
			return plan.startSeed + report.runs.length;
		},
		get runIndex(): number {
			return report.runs.length;
		},
		get done(): boolean {
			return report.done;
		},
		options: plan,
		frame(): void {
			const now = env.now();
			if (!Number.isNaN(lastFrameAt)) {
				const dt = now - lastFrameAt;
				const bucket = Math.min(BUCKETS - 1, Math.floor(dt / BUCKET_MS));
				histogram[bucket] = (histogram[bucket] ?? 0) + 1;
				frames++;
				frameSum += dt;
			}
			lastFrameAt = now;
			sampleHeap(now);
		},
		noteError(message): void {
			if (report.errors.length < MAX_ERRORS)
				report.errors.push(`run ${report.runs.length + 1}: ${message}`);
			save();
		},
		setGpu(gpu): void {
			report.gpu = gpu;
		},
		finishRun(result): { next: boolean } {
			const now = env.now();
			const seconds = (now - runStartedAt) / 1000;
			const mean = frames > 0 ? frameSum / frames : 0;
			const p99 = percentileMs(histogram, frames, 0.99);
			let slowest = 0;
			for (let i = BUCKETS - 1; i >= 0 && slowest === 0; i--)
				if ((histogram[i] ?? 0) > 0) slowest = (i + 1) * BUCKET_MS;
			const sample = env.heapMB();
			if (sample !== null) {
				heap = heap
					? { start: heap.start, peak: Math.max(heap.peak, sample), end: sample }
					: { start: sample, peak: sample, end: sample };
			}
			report.runs.push({
				seed: plan.startSeed + report.runs.length,
				outcome: result.outcome,
				roundReached: result.roundReached,
				steps: result.steps,
				seconds: Math.round(seconds * 10) / 10,
				frames,
				fps: {
					avg: mean > 0 ? Math.round((1000 / mean) * 10) / 10 : 0,
					low1Percent: p99 > 0 ? Math.round((1000 / p99) * 10) / 10 : 0,
				},
				frameMs: {
					p50: percentileMs(histogram, frames, 0.5),
					p99,
					max: slowest,
				},
				heapMB: heap && {
					start: Math.round(heap.start * 10) / 10,
					peak: Math.round(heap.peak * 10) / 10,
					end: Math.round(heap.end * 10) / 10,
				},
			});
			report.done = report.runs.length >= plan.runs;
			const first = report.runs[0]?.heapMB;
			const last = report.runs.at(-1)?.heapMB;
			report.heapGrowthMB =
				first && last && report.runs.length > 1 ? Math.round((last.end - first.end) * 10) / 10 : null;
			save();
			return { next: !report.done };
		},
		report: () => report,
		reset(): void {
			storage.removeItem(SOAK_STORAGE_KEY);
		},
	};
}
