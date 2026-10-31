import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const WRITE = /\b(Position|PrevPosition|Velocity|Radius|Health)\.\w+\[[^\]]*\]\s*[-+*/]?=(?!=)/;
const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sources(path);
		return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
	});
}

test("render never writes to simulation components", () => {
	expect(sources(root).length).toBeGreaterThan(3);
	const offenders = sources(root).filter((file) => WRITE.test(readFileSync(file, "utf8")));
	expect(offenders).toEqual([]);
});

test("the guard regex catches component writes", () => {
	expect(WRITE.test("Position.x[eid] = 1;")).toBe(true);
	expect(WRITE.test("Velocity.z[e] += 2")).toBe(true);
	expect(WRITE.test("if (Health.hp[e] === 1) {}")).toBe(false);
	expect(WRITE.test("const x = Position.x[e];")).toBe(false);
});
