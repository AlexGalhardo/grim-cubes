import { existsSync, readFileSync } from "node:fs";
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

	it("has a UI icon for every item, card and Ossuary node (B-03-05)", () => {
		const data = <T>(file: string): T => JSON.parse(readFileSync(`${root}data/${file}`, "utf8")) as T;
		const ids = {
			item: data<{ id: string }[]>("items.json").map((i) => i.id),
			card: data<{ cards: { id: string }[] }>("cards.json").cards.map((c) => c.id),
			node: data<{ branches: { nodes: { id: string }[] }[] }>("ossuary.json").branches.flatMap((b) =>
				b.nodes.map((n) => n.id),
			),
		};
		const missing = Object.entries(ids).flatMap(([kind, list]) =>
			list
				.filter((id) => !existsSync(`${root}assets/src/icons/${kind}/${id}.png`))
				.map((id) => `${kind}/${id}`),
		);
		expect(missing).toEqual([]);
	});
});
