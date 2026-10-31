import { describe, expect, test } from "vitest";
import { consoleLogViolations, hardcodedTextViolations, hexViolations, rangeViolations } from "./rules";

test("flags hex colors and console.log", () => {
	expect(hexViolations("a.tsx", 'const c = "#14121c";')).toHaveLength(1);
	expect(hexViolations("a.tsx", "const id = 1;")).toHaveLength(0);
	expect(consoleLogViolations("a.ts", "console.log(1)")).toHaveLength(1);
	expect(consoleLogViolations("a.ts", "console.error(1)")).toHaveLength(0);
});

test("flags ranges in dependency fields only", () => {
	const text = [
		"{",
		'"engines": {"node": ">=22"},',
		'"dependencies": {"a": "^1.0.0"},',
		'"devDependencies": {"b": "2.0.0"}',
		"}",
	].join("\n");
	const found = rangeViolations("package.json", text);
	expect(found).toHaveLength(1);
	expect(found[0]?.line).toBe(3);
});

describe("hardcodedTextViolations", () => {
	const lines = (source: string): number[] => hardcodedTextViolations("x.tsx", source).map((v) => v.line);

	test("flags text between tags, prose lines and literal accessibility attributes", () => {
		expect(lines("<h1>Loja</h1>")).toEqual([1]);
		expect(lines('<ul aria-label="Atributos">')).toEqual([1]);
		expect(lines("<button>\n\tRolar de novo\n</button>")).toEqual([2]);
	});

	test("accepts translated text, code and class names", () => {
		const source = [
			"<h1>{t('shop.title')}</h1>",
			'<div className="flex gap-2" data-testid="shop-gold">',
			"\tstore,",
			"\telse",
			"const x = a > b ? 1 : 2;",
			"// two word comment",
		].join("\n");
		expect(lines(source)).toEqual([]);
	});
});
