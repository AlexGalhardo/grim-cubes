import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const load = (name: string): Record<string, string> =>
	JSON.parse(readFileSync(new URL(`locales/${name}.json`, root), "utf8")) as Record<string, string>;
const en = load("en");
const ptBR = load("pt-BR");
const placeholders = (text: string): string[] =>
	[...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();

describe("locales", () => {
	it("have the same keys", () => {
		expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
	});

	it("use the same placeholders in every key", () => {
		for (const key of Object.keys(en))
			expect(placeholders(ptBR[key] ?? ""), key).toEqual(placeholders(en[key] ?? ""));
	});

	it("have no empty message", () => {
		for (const [key, text] of [...Object.entries(en), ...Object.entries(ptBR)])
			expect(text.length, key).toBeGreaterThan(0);
	});

	it('define every key the code asks for with a literal t("...")', () => {
		const used = new Set<string>();
		const walk = (dir: URL): void => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (entry.name === "node_modules" || entry.name === "dist") continue;
				const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
				if (entry.isDirectory()) walk(child);
				else if (
					/\.(ts|tsx)$/.test(entry.name) &&
					!entry.name.endsWith(".test.ts") &&
					!entry.name.endsWith(".test.tsx")
				) {
					for (const m of readFileSync(child, "utf8").matchAll(/\bt\("([A-Za-z][\w.]*)"/g))
						used.add(m[1] ?? "");
				}
			}
		};
		walk(new URL("packages/", root));
		walk(new URL("apps/", root));
		const missing = [...used].filter((key) => !(key in en));
		expect(missing).toEqual([]);
		void join;
	});
});
