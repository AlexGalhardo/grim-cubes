import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createNullEngine } from "./engine";

test("null engine boots and disposes", () => {
	const r = createNullEngine();
	expect(r.engine.getRenderWidth()).toBeGreaterThan(0);
	r.dispose();
});

test("babylon is imported only by subpath, never the barrel", () => {
	const src = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
	expect(src).not.toMatch(/from "@babylonjs\/core"/);
});
