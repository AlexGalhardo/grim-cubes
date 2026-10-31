/**
 * Opt-in telemetry (A-06-04, GDD 26.2). Off unless the player turns it on in Options. Events are a closed list of
 * names with flat numeric or short-text properties: no free text, no ids of the player, no device data. Nothing leaves
 * the process here: a sink receives batches, and today the only sinks are `consoleSink` and `noopSink`.
 */
export const TELEMETRY_EVENTS = ["session_start", "run_start", "run_end", "boss_killed", "error"] as const;
export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[number];

export type TelemetryValue = number | boolean | string;
export type TelemetryProps = Readonly<Record<string, TelemetryValue>>;

export interface TelemetryEvent {
	name: TelemetryEventName;
	/** Milliseconds since the session started (not a wall-clock time). */
	t: number;
	props: TelemetryProps;
}

export interface TelemetrySink {
	send(batch: readonly TelemetryEvent[]): void;
}

export const noopSink: TelemetrySink = { send: () => undefined };

/** Writes each batch as one JSONL line per event through `write` (the logger in the app). */
export function consoleSink(write: (line: string) => void): TelemetrySink {
	return {
		send(batch): void {
			for (const event of batch) write(JSON.stringify(event));
		},
	};
}

export interface TelemetryOptions {
	enabled: () => boolean;
	sink: TelemetrySink;
	/** Monotonic milliseconds. */
	now: () => number;
	/** Events kept before the oldest is dropped (default 200). */
	maxQueue?: number;
	/** Events that trigger a flush on their own (default 50: a batch stays under the 50 KB goal of the endpoint). */
	flushAt?: number;
}

export interface Telemetry {
	track(name: TelemetryEventName, props?: TelemetryProps): void;
	/** Sends what is queued; does nothing when empty or when telemetry is off. */
	flush(): void;
	readonly queued: number;
}

const MAX_PROPS = 12;
const MAX_TEXT = 64;
const KEY = /^[a-z][a-z0-9_]{0,31}$/;

/** Keeps only well-formed keys and values: numbers must be finite and text is cut, so nothing free-form escapes. */
function clean(props: TelemetryProps): TelemetryProps {
	const out: Record<string, TelemetryValue> = {};
	let count = 0;
	for (const [key, value] of Object.entries(props)) {
		if (count >= MAX_PROPS || !KEY.test(key)) continue;
		if (typeof value === "number" && !Number.isFinite(value)) continue;
		out[key] = typeof value === "string" ? value.slice(0, MAX_TEXT) : value;
		count++;
	}
	return out;
}

export function createTelemetry(options: TelemetryOptions): Telemetry {
	const { enabled, sink, now } = options;
	const maxQueue = options.maxQueue ?? 200;
	const flushAt = options.flushAt ?? 50;
	const started = now();
	const queue: TelemetryEvent[] = [];

	const telemetry: Telemetry = {
		track(name, props = {}): void {
			// Off means nothing is even kept in memory.
			if (!enabled()) return;
			if (queue.length >= maxQueue) queue.shift();
			queue.push({ name, t: Math.round(now() - started), props: clean(props) });
			if (queue.length >= flushAt) telemetry.flush();
		},
		flush(): void {
			if (queue.length === 0) return;
			if (!enabled()) {
				queue.length = 0;
				return;
			}
			sink.send(queue.splice(0));
		},
		get queued(): number {
			return queue.length;
		},
	};
	return telemetry;
}

/**
 * Reports crashes by kind and error name only (never the message, stack or a path, which could carry personal data),
 * and stops after `max` a session so a loop of errors cannot flood the queue.
 */
export function createErrorReporter(
	telemetry: Telemetry,
	max = 5,
): (kind: "error" | "rejection", reason: unknown) => void {
	let reported = 0;
	return (kind, reason) => {
		if (reported++ >= max) return;
		telemetry.track("error", { kind, name: reason instanceof Error ? reason.name : "Error" });
	};
}
