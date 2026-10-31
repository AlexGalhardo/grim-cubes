import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { audioProblems, countTestCases, type Floors, missingFiles } from "./guards";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8")) as T;
const essential = read<string[]>("./essential.json");
const floors = read<Floors>("./floors.json");

describe("regression guards (see README.md)", () => {
	it("keeps every essential file", () => {
		expect(missingFiles(root, essential)).toEqual([]);
	});

	it("keeps prompts.json and the generated audio in step", () => {
		expect(audioProblems(root, floors.audio)).toEqual([]);
	});

	it.each(Object.entries(floors.tests))("keeps at least %s test cases in %s", (folder, floor) => {
		expect(countTestCases(root, folder)).toBeGreaterThanOrEqual(floor);
	});
});
