import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { checkAll, checkDir, loadDir, selfTest } from "./index";

const dataDir = fileURLToPath(new URL("../../data", import.meta.url));

// The self-test validates the whole data set once per negative case (30+): over 5 s when the CPU is busy.
vi.setConfig({ testTimeout: 20_000 });

describe("data-check", () => {
	it("accepts the real data", () => {
		expect(checkDir(dataDir)).toEqual([]);
	});

	it("rejects a duplicate item id", () => {
		const { data, schemas } = loadDir(dataDir);
		const items = structuredClone(data["items.json"]) as Array<{ id: string }>;
		const first = items[0];
		const last = items[items.length - 1];
		if (!first || !last) throw new Error("items.json is empty");
		last.id = first.id;
		const errors = checkAll({ ...data, "items.json": items }, schemas);
		expect(errors.some((e) => e.includes(`duplicate id "${first.id}"`))).toBe(true);
	});

	it("detects every negative self-test case", () => {
		expect(selfTest(dataDir)).toEqual([]);
	});
});
