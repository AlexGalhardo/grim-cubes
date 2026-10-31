// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { expect, test } from "vitest";
import { createElectronStorage, type ElectronStorageBridge } from "./electron";
import { migrateStorage } from "./migrate";
import { MAX_VALUE_BYTES, NotImplementedError, type StorageKey } from "./types";
import { createWebStorage } from "./web";

function fakeBridge(): ElectronStorageBridge & { files: Map<string, string> } {
	const files = new Map<string, string>();
	return {
		files,
		read: async (key) => files.get(key) ?? null,
		write: async (key, value) => void files.set(key, value),
		backup: async (key) => {
			const text = files.get(key);
			if (text !== undefined) files.set(`${key}.bak`, text);
		},
	};
}

test("the storage passes reads, writes and backups through the preload bridge", async () => {
	const bridge = fakeBridge();
	const storage = createElectronStorage(bridge);
	expect(await storage.read("save")).toBeNull();
	await storage.write("save", "{}");
	expect(bridge.files.get("save")).toBe("{}");
	expect(await storage.read("save")).toBe("{}");
	await storage.backup("save");
	expect(bridge.files.get("save.bak")).toBe("{}");
});

test("keys and values are checked before they reach the bridge", async () => {
	const bridge = fakeBridge();
	const storage = createElectronStorage(bridge);
	await expect(storage.read("../save" as StorageKey)).rejects.toThrow(RangeError);
	await expect(storage.write("save", "x".repeat(MAX_VALUE_BYTES + 1))).rejects.toThrow(RangeError);
	await expect(storage.backup("nope" as StorageKey)).rejects.toThrow(RangeError);
	expect(bridge.files.size).toBe(0);
});

test("a bridge that answers with a non-string or an oversized value reads as absent", async () => {
	const odd = { ...fakeBridge(), read: async () => 12 as unknown as string };
	expect(await createElectronStorage(odd).read("save")).toBeNull();
	const huge = { ...fakeBridge(), read: async () => "x".repeat(MAX_VALUE_BYTES + 1) };
	expect(await createElectronStorage(huge).read("save")).toBeNull();
});

test("without the bridge (a plain browser) every call fails with NotImplementedError", async () => {
	const storage = createElectronStorage();
	await expect(storage.read("save")).rejects.toBeInstanceOf(NotImplementedError);
	await expect(storage.write("save", "x")).rejects.toBeInstanceOf(NotImplementedError);
	await expect(storage.backup("save")).rejects.toBeInstanceOf(NotImplementedError);
});

test("the first run with files moves the IndexedDB save over, once, without overwriting a file", async () => {
	const legacy = createWebStorage(new IDBFactory());
	await legacy.write("save", "old save");
	await legacy.write("save.bak", "old bak");
	await legacy.write("options", "old options");
	const files = createElectronStorage(fakeBridge());
	await files.write("options", "new options");

	expect((await migrateStorage(legacy, files)).sort()).toEqual(["save", "save.bak"]);
	expect(await files.read("save")).toBe("old save");
	expect(await files.read("save.bak")).toBe("old bak");
	expect(await files.read("options")).toBe("new options");
	// The legacy store is left as it was, and a second run copies nothing.
	expect(await legacy.read("save")).toBe("old save");
	expect(await migrateStorage(legacy, files)).toEqual([]);
});

test("a source with nothing in it migrates nothing", async () => {
	const files = createElectronStorage(fakeBridge());
	expect(await migrateStorage(createWebStorage(new IDBFactory()), files)).toEqual([]);
	expect(await files.read("save")).toBeNull();
});
