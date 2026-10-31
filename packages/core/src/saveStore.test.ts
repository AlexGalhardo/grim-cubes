import { expect, test } from "vitest";
import { createMetaState, serializeSave } from "./save";
import {
	loadMeta,
	persistRun,
	type RunResult,
	SAVE_BACKUP_KEY,
	SAVE_CORRUPT_KEY,
	SAVE_CORRUPT_PREVIOUS_KEY,
	SAVE_KEY,
	type SaveIO,
	updateMeta,
} from "./saveStore";

function memory(
	initial: Record<string, string> = {},
): SaveIO & { data: Map<string, string>; writes: string[] } {
	const data = new Map(Object.entries(initial));
	const writes: string[] = [];
	return {
		data,
		writes,
		read: async (key) => data.get(key) ?? null,
		write: async (key, value) => {
			writes.push(key);
			data.set(key, value);
		},
	};
}

const metaWith = (souls: number) => ({ ...createMetaState(), souls });
const saved = (souls: number, version = "0.1.0") => serializeSave(metaWith(souls), version);

test("an empty store starts fresh and writable", async () => {
	expect(await loadMeta(memory())).toMatchObject({ readOnly: false, notice: null, meta: { souls: 0 } });
});

test("a healthy save loads without warnings", async () => {
	const io = memory({ [SAVE_KEY]: await saved(40) });
	expect(await loadMeta(io)).toMatchObject({ readOnly: false, notice: null, meta: { souls: 40 } });
});

test("a corrupt main save falls back to the backup and warns", async () => {
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: await saved(30) });
	const loaded = await loadMeta(io);
	expect(loaded).toMatchObject({ readOnly: false, notice: "recovered", meta: { souls: 30 } });
	expect(io.writes).toEqual([]);
});

test("when both are unreadable the bad text is kept aside", async () => {
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: "also bad" });
	const loaded = await loadMeta(io);
	expect(loaded).toMatchObject({ notice: "corrupt", meta: { souls: 0 } });
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
	await loadMeta(io);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
});

test("a save from a newer version is read-only and left untouched", async () => {
	const newer = JSON.parse(await saved(99)) as Record<string, unknown>;
	newer.schemaVersion = 7;
	const text = JSON.stringify(newer);
	const io = memory({ [SAVE_KEY]: text, [SAVE_BACKUP_KEY]: await saved(10) });
	const loaded = await loadMeta(io);
	expect(loaded).toMatchObject({ readOnly: true, notice: "newer" });
	expect(io.writes).toEqual([]);
	expect(io.data.get(SAVE_KEY)).toBe(text);
});

test("a storage failure is read-only and writes nothing", async () => {
	const io: SaveIO = {
		read: async () => {
			throw new Error("IndexedDB is unavailable");
		},
		write: async () => {
			throw new Error("must not write");
		},
	};
	expect(await loadMeta(io)).toMatchObject({ readOnly: true, notice: "unavailable" });
});

const run = (souls: number, over: Partial<RunResult> = {}): RunResult => ({
	souls,
	round: 3,
	difficulty: "normal",
	kills: 10,
	bossKills: 0,
	elitesKilled: 0,
	...over,
});

test("persist adds the run to what is stored and keeps the last readable save as the backup", async () => {
	const io = memory({ [SAVE_KEY]: await saved(10) });
	const merged = await persistRun(io, run(15), "0.2.0");
	expect(io.writes).toEqual([SAVE_BACKUP_KEY, SAVE_KEY]);
	expect(merged.souls).toBe(25);
	expect(merged.stats.runs).toBe(1);
	expect((await loadMeta(io)).meta.souls).toBe(25);
	const backup = await loadMeta(
		memory({ [SAVE_KEY]: "{x", [SAVE_BACKUP_KEY]: io.data.get(SAVE_BACKUP_KEY) ?? "" }),
	);
	expect(backup.meta.souls).toBe(10);
});

test("two tabs that both finish a run keep each other's souls", async () => {
	const io = memory({ [SAVE_KEY]: await saved(100) });
	// Both tabs loaded 100 souls; A earns 50 and B earns 30.
	const tabA = persistRun(io, run(50, { round: 5 }), "0.2.0");
	await tabA;
	await persistRun(io, run(30, { round: 9 }), "0.2.0");
	const final = (await loadMeta(io)).meta;
	expect(final.souls).toBe(180);
	expect(final.records.normal).toBe(9);
	expect(final.stats.runs).toBe(2);
	expect(final.stats.kills).toBe(20);
	const lower = await persistRun(io, run(1, { round: 2 }), "0.2.0");
	expect(lower.records.normal).toBe(9);
});

test("concurrent persists under the shared lock never lose an update", async () => {
	const io = memory({ [SAVE_KEY]: await saved(0) });
	let tail: Promise<unknown> = Promise.resolve();
	io.withLock = <T>(fn: () => Promise<T>): Promise<T> => {
		const next = tail.then(fn, fn);
		tail = next.catch(() => undefined);
		return next;
	};
	await Promise.all([persistRun(io, run(50), "0.2.0"), persistRun(io, run(30), "0.2.0")]);
	expect((await loadMeta(io)).meta.souls).toBe(80);
});

test("persist continues from the backup when the main save is unreadable and keeps the bad text", async () => {
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: await saved(40) });
	const merged = await persistRun(io, run(5), "0.2.0");
	expect(merged.souls).toBe(45);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
});

test("persist refuses to write over a newer save", async () => {
	const newer = JSON.parse(await saved(99)) as Record<string, unknown>;
	newer.schemaVersion = 8;
	const text = JSON.stringify(newer);
	const io = memory({ [SAVE_KEY]: text });
	await expect(persistRun(io, run(5), "0.2.0")).rejects.toMatchObject({ code: "newer" });
	expect(io.data.get(SAVE_KEY)).toBe(text);
	expect(io.writes).toEqual([]);
});

test("a newer backup next to a broken main save is read-only too", async () => {
	const newer = JSON.parse(await saved(99)) as Record<string, unknown>;
	newer.schemaVersion = 8;
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: JSON.stringify(newer) });
	expect(await loadMeta(io)).toMatchObject({ readOnly: true, notice: "newer" });
	expect(io.writes).toEqual([]);
});

test("the two latest corrupt texts are kept", async () => {
	const io = memory({ [SAVE_KEY]: "first bad" });
	await loadMeta(io);
	io.data.set(SAVE_KEY, "second bad");
	await loadMeta(io);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("second bad");
	expect(io.data.get(SAVE_CORRUPT_PREVIOUS_KEY)).toBe("first bad");
	io.data.set(SAVE_KEY, "third bad");
	await loadMeta(io);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("third bad");
	expect(io.data.get(SAVE_CORRUPT_PREVIOUS_KEY)).toBe("second bad");
});

test("updateMeta applies a change to the stored save and a refusing mutate writes nothing", async () => {
	const io = memory({ [SAVE_KEY]: await saved(100) });
	const merged = await updateMeta(
		io,
		(m) => {
			m.souls -= 50;
			m.ossuary.flesh_1 = true;
		},
		"0.2.0",
	);
	expect(merged.souls).toBe(50);
	expect((await loadMeta(io)).meta.ossuary.flesh_1).toBe(true);
	const writes = io.writes.length;
	await expect(
		updateMeta(
			io,
			() => {
				throw new Error("not enough souls");
			},
			"0.2.0",
		),
	).rejects.toThrow("not enough souls");
	expect(io.writes.length).toBe(writes);
});
