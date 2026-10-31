import { expect, test } from "vitest";
import {
	consoleSink,
	createErrorReporter,
	createTelemetry,
	noopSink,
	type TelemetryEvent,
} from "./telemetry";

function setup(on = true, extra: { maxQueue?: number; flushAt?: number } = {}) {
	const state = { on, now: 1000 };
	const batches: TelemetryEvent[][] = [];
	const telemetry = createTelemetry({
		enabled: () => state.on,
		sink: { send: (batch) => batches.push([...batch]) },
		now: () => state.now,
		...extra,
	});
	return { state, batches, telemetry };
}

test("telemetry is silent while off: nothing is queued and nothing is sent", () => {
	const { telemetry, batches } = setup(false);
	telemetry.track("run_start", { difficulty: "normal" });
	telemetry.flush();
	expect(telemetry.queued).toBe(0);
	expect(batches).toEqual([]);
});

test("turning it on starts collecting, and turning it off drops what was queued", () => {
	const { telemetry, state, batches } = setup(true);
	state.now = 1500;
	telemetry.track("run_end", { round: 12, kills: 340, died: true });
	expect(telemetry.queued).toBe(1);
	state.on = false;
	telemetry.flush();
	expect(telemetry.queued).toBe(0);
	expect(batches).toEqual([]);
	state.on = true;
	telemetry.track("session_start");
	telemetry.flush();
	expect(batches[0]?.[0]).toEqual({ name: "session_start", t: 500, props: {} });
});

test("props are cleaned: bad keys, non-finite numbers and long text never leave", () => {
	const { telemetry, batches } = setup();
	telemetry.track("error", {
		message: "x".repeat(500),
		"Bad Key": 1,
		nan: Number.NaN,
		ok: 3,
	});
	telemetry.flush();
	const props = batches[0]?.[0]?.props ?? {};
	expect(Object.keys(props).sort()).toEqual(["message", "ok"]);
	expect(String(props.message)).toHaveLength(64);
});

test("the queue drops its oldest event when full and flushes by itself at the batch size", () => {
	const full = setup(true, { maxQueue: 3, flushAt: 99 });
	for (let i = 0; i < 5; i++) full.telemetry.track("boss_killed", { round: i });
	full.telemetry.flush();
	expect(full.batches[0]?.map((e) => e.props.round)).toEqual([2, 3, 4]);

	const auto = setup(true, { flushAt: 2 });
	auto.telemetry.track("run_start");
	expect(auto.batches).toHaveLength(0);
	auto.telemetry.track("run_start");
	expect(auto.batches).toHaveLength(1);
	expect(auto.telemetry.queued).toBe(0);
});

test("the console sink writes one JSON line per event and the no-op sink swallows batches", () => {
	const lines: string[] = [];
	consoleSink((line) => lines.push(line)).send([{ name: "run_start", t: 5, props: { round: 1 } }]);
	expect(JSON.parse(lines[0] ?? "")).toEqual({ name: "run_start", t: 5, props: { round: 1 } });
	expect(() => noopSink.send([])).not.toThrow();
});

test("errors are reported by kind and name only, never the message, and stop after five", () => {
	const { telemetry, batches } = setup();
	const report = createErrorReporter(telemetry);
	report("error", new TypeError("C:Usersalexsecret.txt is missing"));
	report("rejection", "a plain string");
	for (let i = 0; i < 10; i++) report("error", new RangeError("x"));
	telemetry.flush();
	const events = batches[0] ?? [];
	expect(events).toHaveLength(5);
	expect(events[0]?.props).toEqual({ kind: "error", name: "TypeError" });
	expect(events[1]?.props).toEqual({ kind: "rejection", name: "Error" });
	expect(JSON.stringify(events)).not.toContain("secret");
});

test("errors met while telemetry is off do not use up the budget of five", () => {
	const { telemetry, batches, state } = setup(false);
	const report = createErrorReporter(telemetry);
	for (let i = 0; i < 20; i++) report("error", new Error("off"));
	state.on = true;
	for (let i = 0; i < 8; i++) report("rejection", new TypeError("on"));
	telemetry.flush();
	expect(batches[0]).toHaveLength(5);
	expect(batches[0]?.[0]?.props).toEqual({ kind: "rejection", name: "TypeError" });
	expect(telemetry.enabled).toBe(true);
});
