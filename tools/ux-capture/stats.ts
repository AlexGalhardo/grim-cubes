/** Median of a non-empty list; the mean of the two middle values when the count is even. */
export function median(values: readonly number[]): number {
	if (values.length === 0) throw new Error("median of an empty list");
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Per-group median across several measurements, so an animated frame (the hero mid-stride) cannot swing the result. */
export function medianByGroup(samples: readonly Record<string, number>[]): Record<string, number> {
	const first = samples[0];
	if (!first) throw new Error("no samples");
	return Object.fromEntries(Object.keys(first).map((k) => [k, median(samples.map((s) => s[k] ?? 0))]));
}
