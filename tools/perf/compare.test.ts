import { describe, expect, it } from "vitest";
import { type BenchReport, compare, median, type Summary } from "./compare";

const run = (draw: number, meshes: number, p99: number): BenchReport => ({
	horde100: { drawCalls: draw, activeMeshes: meshes, frameP99: p99 },
});
const baseline: Summary = { scenarios: { horde100: { drawCalls: 10, activeMeshes: 18, frameP99: 100 } } };

describe("perf compare", () => {
	it("takes the median", () => {
		expect(median([5, 1, 3])).toBe(3);
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it("passes when drawCalls and activeMeshes match and reports frameP99 as a note", () => {
		const result = compare([run(10, 18, 90), run(10, 18, 150), run(10, 18, 120)], baseline);
		expect(result.failures).toEqual([]);
		expect(result.summary.scenarios.horde100?.frameP99).toBe(120);
		expect(result.notes.join("\n")).toContain("+20.0%");
	});

	it("never blocks on frameP99, however much it grows", () => {
		expect(compare([run(10, 18, 900), run(10, 18, 950), run(10, 18, 990)], baseline).failures).toEqual(
			[],
		);
	});

	it("blocks on drawCalls or activeMeshes against the baseline", () => {
		const failures = compare([run(11, 19, 100), run(11, 19, 100), run(11, 19, 100)], baseline).failures;
		expect(failures).toEqual(["horde100.drawCalls: 10 -> 11", "horde100.activeMeshes: 18 -> 19"]);
	});

	it("blocks when the deterministic metrics differ between the runs", () => {
		const failures = compare([run(10, 18, 100), run(12, 18, 100), run(10, 18, 100)], undefined).failures;
		expect(failures[0]).toContain("differs between runs");
	});

	it("does not block without a baseline", () => {
		const result = compare([run(10, 18, 100)], undefined);
		expect(result.failures).toEqual([]);
		expect(result.notes[0]).toContain("no baseline");
	});
});
