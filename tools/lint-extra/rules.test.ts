import { expect, test } from "vitest";
import { consoleLogViolations, hexViolations, rangeViolations } from "./rules";

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
