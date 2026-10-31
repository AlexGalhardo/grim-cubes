import { expect, test } from "vitest";
import {
	checksumOf,
	createMetaState,
	createSettings,
	type MetaState,
	profileOf,
	serializeGlobal,
	serializeSave,
} from "./save";
import {
	eraseSlot,
	loadGlobal,
	loadMeta,
	loadSlot,
	persistRun,
	type RunResult,
	readSlots,
	SAVE_BACKUP_KEY,
	SAVE_CORRUPT_KEY,
	SAVE_CORRUPT_PREVIOUS_KEY,
	SAVE_KEY,
	type SaveIO,
	slotBackupKey,
	slotKey,
	updateMeta,
} from "./saveStore";

const V = "0.2.0";

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

const metaWith = (souls: number): MetaState => ({ ...createMetaState(), souls });
const saved = (souls: number) => serializeSave(metaWith(souls), "0.1.0");
const newerThan = (text: string): string => {
	const copy = JSON.parse(text) as Record<string, unknown>;
	copy.schemaVersion = 99;
	return JSON.stringify(copy);
};

test("an empty store starts fresh and writable", async () => {
	expect(await loadMeta(memory(), 1, V)).toMatchObject({
		readOnly: false,
		notice: null,
		meta: { souls: 0, run: null },
	});
});

test("a healthy slot loads without warnings", async () => {
	const io = memory({ [slotKey(2)]: await saved(40) });
	expect(await loadMeta(io, 2, V)).toMatchObject({ readOnly: false, notice: null, meta: { souls: 40 } });
	expect((await loadMeta(io, 1, V)).meta.souls).toBe(0);
});

test("the settings are shared by every slot and never stored in one", async () => {
	const settings = { ...createSettings(), gameSpeed: 2 as const, lastSlot: 3 };
	const io = memory({ [SAVE_KEY]: await serializeGlobal(settings, "0.1.0"), [slotKey(1)]: await saved(5) });
	expect((await loadMeta(io, 1, V)).meta.settings.gameSpeed).toBe(2);
	expect((await loadMeta(io, 3, V)).meta.settings.gameSpeed).toBe(2);
	expect(io.data.get(slotKey(1))).not.toContain("gameSpeed");
});

test("a corrupt main slot falls back to the backup and warns", async () => {
	const io = memory({ [slotKey(1)]: "{broken", [slotBackupKey(1)]: await saved(30) });
	const loaded = await loadMeta(io, 1, V);
	expect(loaded).toMatchObject({ readOnly: false, notice: "recovered", meta: { souls: 30 } });
	expect(io.writes).toEqual([]);
});

test("when both are unreadable the bad text is kept aside", async () => {
	const io = memory({ [slotKey(1)]: "{broken", [slotBackupKey(1)]: "also bad" });
	const loaded = await loadMeta(io, 1, V);
	expect(loaded).toMatchObject({ notice: "corrupt", meta: { souls: 0 } });
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
	await loadMeta(io, 1, V);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
});

test("a slot or settings file from a newer version is read-only and left untouched", async () => {
	const newer = newerThan(await saved(99));
	const io = memory({ [slotKey(1)]: newer, [slotBackupKey(1)]: await saved(10) });
	expect(await loadMeta(io, 1, V)).toMatchObject({ readOnly: true, notice: "newer" });
	expect(io.writes).toEqual([]);
	expect(io.data.get(slotKey(1))).toBe(newer);
	const global = memory({ [SAVE_KEY]: newerThan(await serializeGlobal(createSettings(), "0.1.0")) });
	expect(await loadMeta(global, 1, V)).toMatchObject({ readOnly: true, notice: "newer" });
	expect(global.writes).toEqual([]);
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
	expect(await loadMeta(io, 1, V)).toMatchObject({ readOnly: true, notice: "unavailable" });
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

test("persist adds the run to the slot and keeps the last readable version as its backup", async () => {
	const io = memory({ [slotKey(1)]: await saved(10) });
	const merged = await persistRun(io, 1, run(15), V);
	expect(io.writes).toEqual([slotBackupKey(1), slotKey(1), SAVE_KEY]);
	expect(merged.souls).toBe(25);
	expect(merged.stats.runs).toBe(1);
	expect((await loadMeta(io, 1, V)).meta.souls).toBe(25);
	const backup = await loadSlot(
		memory({ [slotKey(1)]: "{x", [slotBackupKey(1)]: io.data.get(slotBackupKey(1)) ?? "" }),
		1,
	);
	expect(backup.profile.souls).toBe(10);
});

test("a run in one slot leaves the other slots alone", async () => {
	const io = memory({ [slotKey(1)]: await saved(10), [slotKey(2)]: await saved(70) });
	await persistRun(io, 2, run(5), V);
	expect((await loadMeta(io, 1, V)).meta.souls).toBe(10);
	expect((await loadMeta(io, 2, V)).meta.souls).toBe(75);
});

test("two tabs that both finish a run keep each other's souls", async () => {
	const io = memory({ [slotKey(1)]: await saved(100) });
	await persistRun(io, 1, run(50, { round: 5 }), V);
	await persistRun(io, 1, run(30, { round: 9 }), V);
	const final = (await loadMeta(io, 1, V)).meta;
	expect(final.souls).toBe(180);
	expect(final.records.normal).toBe(9);
	expect(final.stats.runs).toBe(2);
	expect(final.stats.kills).toBe(20);
	const lower = await persistRun(io, 1, run(1, { round: 2 }), V);
	expect(lower.records.normal).toBe(9);
});

test("concurrent persists under the shared lock never lose an update", async () => {
	const io = memory({ [slotKey(1)]: await saved(0) });
	let tail: Promise<unknown> = Promise.resolve();
	io.withLock = <T>(fn: () => Promise<T>): Promise<T> => {
		const next = tail.then(fn, fn);
		tail = next.catch(() => undefined);
		return next;
	};
	await Promise.all([persistRun(io, 1, run(50), V), persistRun(io, 1, run(30), V)]);
	expect((await loadMeta(io, 1, V)).meta.souls).toBe(80);
});

test("persist continues from the backup when the slot is unreadable and keeps the bad text", async () => {
	const io = memory({ [slotKey(1)]: "{broken", [slotBackupKey(1)]: await saved(40) });
	const merged = await persistRun(io, 1, run(5), V);
	expect(merged.souls).toBe(45);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
});

test("persist refuses to write over a newer slot", async () => {
	const text = newerThan(await saved(99));
	const io = memory({ [slotKey(1)]: text });
	await expect(persistRun(io, 1, run(5), V)).rejects.toMatchObject({ code: "newer" });
	expect(io.data.get(slotKey(1))).toBe(text);
	expect(io.writes).toEqual([]);
});

test("a newer backup next to a broken slot is read-only too", async () => {
	const io = memory({ [slotKey(1)]: "{broken", [slotBackupKey(1)]: newerThan(await saved(99)) });
	expect(await loadMeta(io, 1, V)).toMatchObject({ readOnly: true, notice: "newer" });
	expect(io.writes).toEqual([]);
});

test("the two latest corrupt texts are kept", async () => {
	const io = memory({ [slotKey(1)]: "first bad" });
	await loadMeta(io, 1, V);
	io.data.set(slotKey(1), "second bad");
	await loadMeta(io, 1, V);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("second bad");
	expect(io.data.get(SAVE_CORRUPT_PREVIOUS_KEY)).toBe("first bad");
	io.data.set(slotKey(1), "third bad");
	await loadMeta(io, 1, V);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("third bad");
	expect(io.data.get(SAVE_CORRUPT_PREVIOUS_KEY)).toBe("second bad");
});

test("updateMeta applies a change and a refusing mutate writes nothing", async () => {
	const io = memory({ [slotKey(1)]: await saved(100) });
	const merged = await updateMeta(
		io,
		1,
		(m) => {
			m.souls -= 50;
			m.ossuary.flesh_1 = true;
		},
		V,
	);
	expect(merged.souls).toBe(50);
	expect((await loadMeta(io, 1, V)).meta.ossuary.flesh_1).toBe(true);
	const writes = io.writes.length;
	await expect(
		updateMeta(
			io,
			1,
			() => {
				throw new Error("not enough souls");
			},
			V,
		),
	).rejects.toThrow("not enough souls");
	expect(io.writes.length).toBe(writes);
});

test("updateMeta writes only the file that changed", async () => {
	const io = memory({
		[slotKey(1)]: await saved(1),
		[SAVE_KEY]: await serializeGlobal(createSettings(), "0.1.0"),
	});
	await updateMeta(
		io,
		1,
		(m) => {
			m.settings.gameSpeed = 3;
		},
		V,
	);
	expect(io.writes).toEqual([SAVE_BACKUP_KEY, SAVE_KEY]);
	io.writes.length = 0;
	await updateMeta(
		io,
		1,
		(m) => {
			m.souls += 1;
		},
		V,
	);
	expect(io.writes).toEqual([slotBackupKey(1), slotKey(1)]);
});

/** The single save as schema 9 wrote it, with its checksum. */
async function singleSave(souls: number): Promise<string> {
	const data = { ...profileOf(metaWith(souls)), settings: createSettings() } as Record<string, unknown>;
	delete data.run;
	data.records = { normal: 0, grim: 0, nightmare: 0 };
	const settings = { ...createSettings() } as Record<string, unknown>;
	delete settings.lastSlot;
	data.settings = settings;
	return JSON.stringify({
		schemaVersion: 9,
		savedAt: "2026-10-30T10:00:00.000Z",
		app: "grim-cubes",
		appVersion: "0.1.0",
		checksum: await checksumOf(data),
		data,
	});
}

test("the single save of schema 9 moves into slot 1 and its settings become the global ones", async () => {
	const io = memory({ [SAVE_KEY]: await singleSave(285) });
	const loaded = await loadMeta(io, 1, V);
	expect(loaded).toMatchObject({ readOnly: false, notice: null, meta: { souls: 285 } });
	expect(loaded.meta.settings.lastSlot).toBe(1);
	expect((await loadSlot(io, 1)).profile.souls).toBe(285);
	expect((await loadGlobal(io, V)).settings.lastSlot).toBe(1);
	expect((await loadMeta(io, 2, V)).meta.souls).toBe(0);
	// Run again over what it wrote: nothing is migrated twice.
	const writes = io.writes.length;
	await loadMeta(io, 1, V);
	expect(io.writes.length).toBe(writes);
});

test("a migration that stopped after slot 1 is finished without touching slot 1", async () => {
	const io = memory({ [SAVE_KEY]: await singleSave(285), [slotKey(1)]: await saved(285) });
	const before = io.data.get(slotKey(1));
	await loadGlobal(io, V);
	expect(io.data.get(slotKey(1))).toBe(before);
	expect((await loadGlobal(io, V)).settings.lastSlot).toBe(1);
});

test("a settings change while the single save is still there migrates it first", async () => {
	const io = memory({ [SAVE_KEY]: await singleSave(7) });
	await updateMeta(
		io,
		1,
		(m) => {
			m.settings.gameSpeed = 2;
		},
		V,
	);
	const loaded = (await loadMeta(io, 1, V)).meta;
	expect(loaded.souls).toBe(7);
	expect(loaded.settings.gameSpeed).toBe(2);
});

test("the slot list shows empty, used and unreadable slots", async () => {
	const withRun = metaWith(40);
	withRun.records.grim = 6;
	withRun.stats.runs = 2;
	const io = memory({
		[slotKey(1)]: await serializeSave(withRun, "0.1.0", new Date("2026-10-31T12:00:00Z")),
		[slotKey(3)]: "{broken",
		[slotBackupKey(3)]: "{also broken",
	});
	const slots = await readSlots(io);
	expect(slots.map((s) => s.state)).toEqual(["used", "empty", "unreadable"]);
	expect(slots[0]).toMatchObject({ souls: 40, bestRound: 6, runRound: null });
	expect(slots[0]?.savedAt).toBe("2026-10-31T12:00:00.000Z");
	expect(io.data.get(slotKey(3))).toBe("{broken");
});

test("erasing a slot empties it and its backup but not the others or the settings", async () => {
	const io = memory({
		[slotKey(1)]: await saved(10),
		[slotKey(2)]: await saved(20),
		[SAVE_KEY]: await serializeGlobal({ ...createSettings(), gameSpeed: 2 }, "0.1.0"),
	});
	await eraseSlot(io, 1, V);
	const slots = await readSlots(io);
	expect(slots.map((s) => s.state)).toEqual(["empty", "used", "empty"]);
	expect(await loadSlot(io, 1)).toMatchObject({ profile: { souls: 0 }, notice: null });
	expect((await loadMeta(io, 2, V)).meta.settings.gameSpeed).toBe(2);
	io.data.set(slotKey(1), "{broken");
	expect((await loadSlot(io, 1)).profile.souls).toBe(0);
});
