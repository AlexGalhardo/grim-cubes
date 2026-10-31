import { runSim, type SimReport } from "./lib";
import { applyTuning } from "./tuneApply";
import type { TuneOptions } from "./tuneArgs";

declare const self: {
	onmessage: ((event: { data: { options: TuneOptions; seeds: number[] } }) => void) | null;
	postMessage(message: SimReport[]): void;
};

/** Applies the overrides once, then runs its share of the seeds. */
self.onmessage = (event) => {
	const { options, seeds } = event.data;
	applyTuning(options);
	self.postMessage(seeds.map((seed) => runSim({ seed, rounds: options.rounds, difficulty: "normal" })));
};
