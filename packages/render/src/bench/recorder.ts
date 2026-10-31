import type { Engine } from "@babylonjs/core/Engines/engine";
import type { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import type { Scene } from "@babylonjs/core/scene";

/** SDD 14 §4: `{ fpsAvg, fpsP1, frameP99, drawCalls, activeMeshes, heapMB }`, plus a few supporting numbers. */
export interface BenchResult {
	frames: number;
	seconds: number;
	fpsAvg: number;
	/** 1000 / p99 frame time: the frame rate of the slowest 1% of frames. */
	fpsP1: number;
	frameP99: number;
	frameMsAvg: number;
	/** Peak and mean draw calls per frame (SceneInstrumentation). */
	drawCalls: number;
	drawCallsAvg: number;
	activeMeshes: number;
	/** Mesh names at the peak (only rewritten when the peak grows), to see what fills the budget. */
	activeMeshNames: string[];
	/** `performance.memory.usedJSHeapSize` in MB at start and end; null where the browser does not expose it. */
	heapMB: { start: number; end: number; delta: number } | null;
}

export interface BenchRecorder {
	start(): void;
	stop(): BenchResult;
	readonly recording: boolean;
}

interface ChromeMemory {
	memory?: { usedJSHeapSize: number };
}

const heapMB = (): number | null => {
	const used = (performance as unknown as ChromeMemory).memory?.usedJSHeapSize;
	return used === undefined ? null : used / (1024 * 1024);
};

/** Frame time at percentile `p` (0..1) of an ascending-sorted array. */
export function percentile(sorted: Float64Array, p: number): number {
	if (sorted.length === 0) return 0;
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))] ?? 0;
}

/**
 * Records frame times in the engine's `onEndFrameObservable` with `performance.now()` into a preallocated buffer, so the
 * recording itself adds no allocation per frame. `capacity` frames are kept (default: 10 min at 60 fps).
 */
export function createBenchRecorder(
	scene: Scene,
	engine: Engine | NullEngine,
	capacity = 36_000,
	now: () => number = () => performance.now(),
): BenchRecorder {
	const instrumentation = new SceneInstrumentation(scene);
	instrumentation.captureFrameTime = false;
	const frameTimes = new Float64Array(capacity);
	let count = 0;
	let last = -1;
	let startTime = 0;
	let startHeap: number | null = null;
	let drawSum = 0;
	let drawMax = 0;
	let activeMax = 0;
	let activeNames: string[] = [];
	let recording = false;

	engine.onEndFrameObservable.add(() => {
		const t = now();
		if (recording && last >= 0 && count < capacity) {
			frameTimes[count++] = t - last;
			const draws = instrumentation.drawCallsCounter.current;
			drawSum += draws;
			if (draws > drawMax) drawMax = draws;
			const active = scene.getActiveMeshes().length;
			if (active > activeMax) {
				activeMax = active;
				activeNames = scene
					.getActiveMeshes()
					.data.slice(0, active)
					.map((m) => m.name);
			}
		}
		last = t;
	});

	return {
		get recording(): boolean {
			return recording;
		},
		start(): void {
			count = 0;
			drawSum = 0;
			drawMax = 0;
			activeMax = 0;
			activeNames = [];
			startHeap = heapMB();
			startTime = now();
			recording = true;
		},
		stop(): BenchResult {
			recording = false;
			const seconds = (now() - startTime) / 1000;
			const sorted = frameTimes.slice(0, count).sort();
			const total = sorted.reduce((sum, v) => sum + v, 0);
			const p99 = percentile(sorted, 0.99);
			const endHeap = heapMB();
			return {
				frames: count,
				seconds,
				fpsAvg: seconds > 0 ? count / seconds : 0,
				fpsP1: p99 > 0 ? 1000 / p99 : 0,
				frameP99: p99,
				frameMsAvg: count > 0 ? total / count : 0,
				drawCalls: drawMax,
				drawCallsAvg: count > 0 ? drawSum / count : 0,
				activeMeshes: activeMax,
				activeMeshNames: activeNames,
				heapMB:
					startHeap !== null && endHeap !== null
						? { start: startHeap, end: endHeap, delta: endHeap - startHeap }
						: null,
			};
		},
	};
}
