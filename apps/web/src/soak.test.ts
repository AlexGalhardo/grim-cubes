import { expect, test } from "vitest";
import { createSoak, percentileMs, SOAK_STORAGE_KEY, type SoakEnv, soakOptionsFrom } from "./soak";

function memory(): Pick<Storage, "getItem" | "setItem" | "removeItem"> & { data: Map<string, string> } {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (k) => data.get(k) ?? null,
		setItem: (k, v) => void data.set(k, v),
		removeItem: (k) => void data.delete(k),
	};
}

function env(heap: (() => number | null) | null = () => 100): SoakEnv & { clock: { now: number } } {
	const clock = { now: 1_000_000 };
	return { clock, userAgent: "test", now: () => clock.now, heapMB: heap ?? (() => null) };
}

const options = { runs: 2, rounds: 60, startSeed: 5, speed: 1 as const };

test("the options come from the URL with safe defaults", () => {
	expect(soakOptionsFrom(new URLSearchParams(""))).toEqual({
		runs: 10,
		rounds: 60,
		startSeed: 1,
		speed: 1,
	});
	expect(soakOptionsFrom(new URLSearchParams("runs=3&rounds=20&seed=9&speed=3"))).toEqual({
		runs: 3,
		rounds: 20,
		startSeed: 9,
		speed: 3,
	});
	expect(soakOptionsFrom(new URLSearchParams("runs=-1&rounds=x&speed=7")).speed).toBe(1);
	expect(soakOptionsFrom(new URLSearchParams("runs=99999")).runs).toBe(10);
});

test("frame times become fps, percentiles and a heap summary per run", () => {
	const e = env();
	const soak = createSoak(memory(), options, e);
	for (let i = 0; i < 100; i++) {
		soak.frame();
		e.clock.now += i % 25 === 0 ? 100 : 10;
	}
	soak.frame();
	expect(soak.seed).toBe(5);
	expect(soak.finishRun({ outcome: "completed", roundReached: 60, steps: 1234 }).next).toBe(true);
	const run = soak.report().runs[0];
	expect(run?.frames).toBe(100);
	expect(run?.fps.avg).toBeCloseTo(1000 / 13.6, 0);
	expect(run?.frameMs.p50).toBeCloseTo(10.5, 0);
	expect(run?.frameMs.max).toBeGreaterThanOrEqual(100);
	expect(run?.fps.low1Percent).toBeLessThan(15);
	expect(run?.heapMB).toEqual({ start: 100, peak: 100, end: 100 });
	expect(run).toMatchObject({ seed: 5, outcome: "completed", roundReached: 60, steps: 1234 });
});

test("the report survives the page reload between runs, the next run gets the next seed, and the last one closes it", () => {
	const storage = memory();
	let heap = 100;
	const first = createSoak(
		storage,
		options,
		env(() => heap),
	);
	first.frame();
	expect(first.finishRun({ outcome: "completed", roundReached: 60, steps: 1 }).next).toBe(true);
	heap = 130;
	// A new page load: the options in the URL are ignored in favour of the stored plan.
	const second = createSoak(
		storage,
		{ ...options, runs: 99, startSeed: 77 },
		env(() => heap),
	);
	expect(second.runIndex).toBe(1);
	expect(second.seed).toBe(6);
	expect(second.options.runs).toBe(2);
	second.noteError("boom");
	expect(second.finishRun({ outcome: "died", roundReached: 12, steps: 2 }).next).toBe(false);
	const report = second.report();
	expect(report.done).toBe(true);
	expect(report.errors).toEqual(["run 2: boom"]);
	expect(report.heapGrowthMB).toBe(30);
	expect(report.runs.map((r) => r.outcome)).toEqual(["completed", "died"]);
});

test("a browser without performance.memory gives no heap numbers, and reset or a fresh start drops old state", () => {
	const storage = memory();
	const soak = createSoak(storage, options, env(null));
	soak.frame();
	soak.finishRun({ outcome: "stalled", roundReached: 3, steps: 9 });
	expect(soak.report().runs[0]?.heapMB).toBeNull();
	expect(soak.report().heapGrowthMB).toBeNull();
	expect(storage.data.has(SOAK_STORAGE_KEY)).toBe(true);
	soak.reset();
	expect(storage.data.has(SOAK_STORAGE_KEY)).toBe(false);
	createSoak(storage, options, env()).finishRun({ outcome: "completed", roundReached: 60, steps: 1 });
	expect(createSoak(storage, options, env(), true).runIndex).toBe(0);
});

test("a corrupt stored report is ignored", () => {
	const storage = memory();
	storage.setItem(SOAK_STORAGE_KEY, "{nope");
	expect(createSoak(storage, options, env()).runIndex).toBe(0);
});

test("percentiles read the histogram", () => {
	const h = new Uint32Array(10);
	h[2] = 90;
	h[9] = 10;
	expect(percentileMs(h, 100, 0.5)).toBe(1.5);
	expect(percentileMs(h, 100, 0.99)).toBe(5);
	expect(percentileMs(h, 0, 0.5)).toBe(0);
});
