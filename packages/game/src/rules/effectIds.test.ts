import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { EFFECT_HANDLERS, IMPLEMENTED_EFFECT_IDS } from "./effectIds";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");
const data = (name: string): unknown =>
	JSON.parse(readFileSync(new URL(`../../../../data/${name}`, import.meta.url), "utf8"));

const OWNER: Record<string, string> = {
	item: "./effects.ts",
	weapon: "../systems/weapon.ts",
	ossuary: "./ossuary.ts",
};

test("the effect id enum of the schema lists exactly the ids that have a handler", () => {
	const schema = data("schema/common.schema.json") as { $defs: { effectId: { enum: string[] } } };
	expect([...schema.$defs.effectId.enum].sort()).toEqual(IMPLEMENTED_EFFECT_IDS);
});

test("every id is handled by the module that claims it", () => {
	for (const [group, file] of Object.entries(OWNER)) {
		const source = read(file);
		const ids = EFFECT_HANDLERS[group as keyof typeof EFFECT_HANDLERS];
		for (const id of ids) expect(source, `${id} in ${file}`).toContain(`"${id}"`);
	}
});

test("no effect id used by the data is missing from the handlers", () => {
	const used = new Set<string>();
	const walk = (node: unknown): void => {
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
		} else if (node && typeof node === "object") {
			const record = node as Record<string, unknown>;
			for (const key of ["effects", "special"]) {
				const list = key === "effects" ? record[key] : [record[key]];
				for (const entry of Array.isArray(list) ? list : []) {
					const id = (entry as { id?: unknown } | null)?.id;
					if (typeof id === "string") used.add(id);
				}
			}
			for (const child of Object.values(record)) walk(child);
		}
	};
	for (const file of ["items.json", "ossuary.json", "weapons.json"]) walk(data(file));
	expect(used.size).toBeGreaterThan(10);
	for (const id of used) expect(IMPLEMENTED_EFFECT_IDS, id).toContain(id);
});
