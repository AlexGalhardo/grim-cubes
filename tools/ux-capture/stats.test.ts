import { expect, test } from "vitest";
import { median, medianByGroup } from "./stats";

test("median takes the middle value, or the mean of the two middle ones", () => {
	expect(median([0.46, 0.14, 0.2])).toBe(0.2);
	expect(median([4, 1, 3, 2])).toBe(2.5);
	expect(median([7])).toBe(7);
});

test("median refuses an empty list", () => {
	expect(() => median([])).toThrow();
});

test("an outlier frame does not move the per-group median", () => {
	const samples = [
		{ hero: 0.2, ground: 0.05 },
		{ hero: 0.46, ground: 0.05 },
		{ hero: 0.21, ground: 0.06 },
		{ hero: 0.19, ground: 0.05 },
		{ hero: 0.14, ground: 0.05 },
	];
	expect(medianByGroup(samples)).toEqual({ hero: 0.2, ground: 0.05 });
});
