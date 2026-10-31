// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { expect, test } from "vitest";
import { createCapacitorStorage, createElectronStorage } from "./stubs";
import { MAX_VALUE_BYTES, NotImplementedError } from "./types";
import { createWebStorage } from "./web";

const fresh = () => createWebStorage(new IDBFactory());

test("save round-trips through IndexedDB", async () => {
	const storage = fresh();
	const save = JSON.stringify({ schemaVersion: 3, data: { souls: 1250 } });
	expect(await storage.read("save")).toBeNull();
	await storage.write("save", save);
	expect(await storage.read("save")).toBe(save);
	await storage.write("save", "{}");
	expect(await storage.read("save")).toBe("{}");
});

test("keys are independent", async () => {
	const storage = fresh();
	await storage.write("options", "o");
	expect(await storage.read("save")).toBeNull();
});

test("rejects invalid keys and oversized values", async () => {
	const storage = fresh();
	await expect(storage.read("nope" as "save")).rejects.toThrow(RangeError);
	await expect(storage.write("save", "x".repeat(MAX_VALUE_BYTES + 1))).rejects.toThrow(RangeError);
});

test("a non-string stored value reads as absent", async () => {
	const factory = new IDBFactory();
	const storage = createWebStorage(factory, "tampered");
	await storage.write("save", "ok");
	const db = await new Promise<IDBDatabase>((resolve) => {
		const req = factory.open("tampered", 1);
		req.onsuccess = () => resolve(req.result);
	});
	await new Promise<void>((resolve) => {
		const tx = db.transaction("kv", "readwrite");
		tx.objectStore("kv").put({ evil: true }, "save");
		tx.oncomplete = () => resolve();
	});
	expect(await storage.read("save")).toBeNull();
});

test("electron and capacitor stubs throw NotImplemented", async () => {
	for (const storage of [createElectronStorage(), createCapacitorStorage()]) {
		await expect(storage.read("save")).rejects.toBeInstanceOf(NotImplementedError);
		await expect(storage.write("save", "x")).rejects.toBeInstanceOf(NotImplementedError);
	}
});

test("the backup and corrupt save keys are valid and independent", async () => {
	const storage = fresh();
	await storage.write("save", "main");
	await storage.write("save.bak", "backup");
	await storage.write("save.corrupt", "bad");
	expect(await storage.read("save")).toBe("main");
	expect(await storage.read("save.bak")).toBe("backup");
	expect(await storage.read("save.corrupt")).toBe("bad");
});
