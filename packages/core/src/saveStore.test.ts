import { expect, test } from "vitest";
import { createMetaState, serializeSave } from "./save";
import { loadMeta, persistMeta, SAVE_BACKUP_KEY, SAVE_CORRUPT_KEY, SAVE_KEY, type SaveIO } from "./saveStore";

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

test("when both are unreadable the bad text is kept aside and never overwritten", async () => {
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: "also bad" });
	const loaded = await loadMeta(io);
	expect(loaded).toMatchObject({ notice: "corrupt", meta: { souls: 0 } });
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
	await loadMeta(io);
	expect(io.data.get(SAVE_CORRUPT_KEY)).toBe("{broken");
	io.data.set(SAVE_KEY, "{another broken}");
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

test("persist keeps the last readable save as the backup", async () => {
	const io = memory({ [SAVE_KEY]: await saved(10) });
	await persistMeta(io, metaWith(25), "0.2.0");
	expect(io.writes).toEqual([SAVE_BACKUP_KEY, SAVE_KEY]);
	expect((await loadMeta(io)).meta.souls).toBe(25);
	const backup = await loadMeta(
		memory({ [SAVE_KEY]: "{x", [SAVE_BACKUP_KEY]: io.data.get(SAVE_BACKUP_KEY) ?? "" }),
	);
	expect(backup.meta.souls).toBe(10);
});

test("persist does not copy an unreadable save over the backup", async () => {
	const io = memory({ [SAVE_KEY]: "{broken", [SAVE_BACKUP_KEY]: await saved(7) });
	await persistMeta(io, metaWith(9), "0.2.0");
	expect(io.writes).toEqual([SAVE_KEY]);
	expect((await parseBackup(io)).souls).toBe(7);
});

async function parseBackup(io: SaveIO) {
	const { parseSave } = await import("./save");
	return parseSave((await io.read(SAVE_BACKUP_KEY)) ?? "");
}
