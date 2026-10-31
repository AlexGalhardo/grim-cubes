import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_VALUE_BYTES, STORAGE_KEYS } from "@gc/platform";
import { afterEach, beforeEach, expect, test } from "vitest";
import { isTrustedSender } from "./paths";
import { createSaveFiles, fileFor } from "./saveFiles";

let root = "";
let dir = "";

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "gc-saves-"));
	dir = join(root, "saves");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const envelope = (souls: number): string => JSON.stringify({ schemaVersion: 9, data: { souls } });

test("a missing file reads as null, and a written save reads back, creating the folder", async () => {
	const files = createSaveFiles(dir);
	expect(await files.read("save")).toBeNull();
	await files.write("save", envelope(5));
	expect(await files.read("save")).toBe(envelope(5));
	await files.write("save", envelope(6));
	expect(await files.read("save")).toBe(envelope(6));
	expect(await readFile(join(dir, "save.json"), "utf8")).toBe(envelope(6));
});

test("a write leaves no tmp file behind, and the old file survives a failed write", async () => {
	const files = createSaveFiles(dir);
	await files.write("save", envelope(1));
	expect((await readdir(dir)).sort()).toEqual(["save.json"]);
	await expect(files.write("save", "x".repeat(MAX_VALUE_BYTES + 1))).rejects.toThrow(RangeError);
	await expect(files.write("save", 42)).rejects.toThrow(RangeError);
	expect(await files.read("save")).toBe(envelope(1));
	expect(await readdir(dir)).toEqual(["save.json"]);
});

test("many quick writes of the same key end in one whole value, never a mix", async () => {
	const files = createSaveFiles(dir);
	const values = Array.from({ length: 25 }, (_, i) => envelope(i));
	await Promise.all(values.map((value) => files.write("save", value)));
	const stored = await files.read("save");
	expect(stored).toBe(values[values.length - 1]);
	expect(JSON.parse(stored ?? "{}").data.souls).toBe(24);
	expect(await readdir(dir)).toEqual(["save.json"]);
});

test("only the storage keys name files: a path, a dotted key or a non-string is refused", async () => {
	const files = createSaveFiles(dir);
	for (const key of [
		"../save",
		"..\\save",
		"save/../x",
		"/etc/passwd",
		"save.json",
		"",
		"SAVE",
		7,
		null,
		undefined,
	]) {
		await expect(files.read(key), String(key)).rejects.toThrow(RangeError);
		await expect(files.write(key, "x"), String(key)).rejects.toThrow(RangeError);
	}
	for (const key of STORAGE_KEYS) expect(fileFor(dir, key)).toBe(join(dir, `${key}.json`));
	expect(await readdir(root)).toEqual([]);
});

test("backup copies the save to save.bak atomically, ignores a missing save and refuses other keys", async () => {
	const files = createSaveFiles(dir);
	await files.backup("save");
	expect(await files.read("save.bak")).toBeNull();
	await files.write("save", envelope(3));
	await files.backup("save");
	expect(await files.read("save.bak")).toBe(envelope(3));
	await files.write("save", envelope(4));
	expect(await files.read("save.bak")).toBe(envelope(3));
	await files.backup("save");
	expect(await files.read("save.bak")).toBe(envelope(4));
	await expect(files.backup("options")).rejects.toThrow(RangeError);
	expect((await readdir(dir)).sort()).toEqual(["save.bak.json", "save.json"]);
});

test("a file that is too big reads as absent instead of filling memory", async () => {
	const files = createSaveFiles(dir);
	await files.write("options", "ok");
	await writeFile(join(dir, "options.json"), "y".repeat(MAX_VALUE_BYTES + 10), "utf8");
	expect(await files.read("options")).toBeNull();
});

test("only the game's own page may use the storage channels", () => {
	expect(isTrustedSender("app://game/")).toBe(true);
	expect(isTrustedSender("app://game/index.html")).toBe(true);
	expect(isTrustedSender("app://other/")).toBe(false);
	expect(isTrustedSender("https://example.com/")).toBe(false);
	expect(isTrustedSender("file:///c:/x")).toBe(false);
	expect(isTrustedSender(undefined)).toBe(false);
});
