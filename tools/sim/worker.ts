import { runSim, type SimOptions, type SimReport } from "./lib";

declare const self: {
	onmessage: ((event: { data: SimOptions[] }) => void) | null;
	postMessage(message: SimReport[]): void;
};

/** A batch of runs in, their reports out; the parent splits the seeds across workers. */
self.onmessage = (event) => {
	self.postMessage(event.data.map((options) => runSim(options)));
};
