import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createBenchRecorder, percentile } from "./recorder";

describe("percentile", () => {
	it("picks the nearest-rank value of a sorted array", () => {
		const sorted = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(percentile(sorted, 0.5)).toBe(5);
		expect(percentile(sorted, 0.99)).toBe(10);
		expect(percentile(sorted, 0)).toBe(1);
		expect(percentile(new Float64Array(0), 0.99)).toBe(0);
	});
});

describe("bench recorder", () => {
	it("records frame times from engine.onEndFrameObservable and reports the SDD 14 metrics", () => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		let clock = 0;
		const recorder = createBenchRecorder(scene, engine, 100, () => clock);
		engine.onEndFrameObservable.notifyObservers(engine); // first frame only primes the previous timestamp

		recorder.start();
		// 99 frames of 10 ms and one 50 ms spike.
		for (let i = 0; i < 100; i++) {
			clock += i === 40 ? 50 : 10;
			engine.onEndFrameObservable.notifyObservers(engine);
		}
		const result = recorder.stop();

		expect(result.frames).toBe(100);
		expect(result.frameP99).toBe(10);
		expect(result.fpsP1).toBeCloseTo(100, 6);
		expect(result.frameMsAvg).toBeCloseTo(10.4, 6);
		expect(result.fpsAvg).toBeCloseTo(100 / 1.04, 6);
		expect(result.drawCalls).toBe(0);
		scene.dispose();
		dispose();
	});

	it("keeps recording bounded by its capacity and ignores frames while stopped", () => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		let clock = 0;
		const recorder = createBenchRecorder(scene, engine, 5, () => clock);
		for (let i = 0; i < 3; i++) {
			clock += 16;
			engine.onEndFrameObservable.notifyObservers(engine);
		}
		recorder.start();
		for (let i = 0; i < 20; i++) {
			clock += 16;
			engine.onEndFrameObservable.notifyObservers(engine);
		}
		expect(recorder.stop().frames).toBe(5);
		expect(recorder.recording).toBe(false);
		scene.dispose();
		dispose();
	});
});
