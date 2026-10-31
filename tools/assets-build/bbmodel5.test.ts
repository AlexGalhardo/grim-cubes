import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { type BbGroup, bbmodelToDocument, parseBbmodel } from "./bbmodel";

const HERO = fileURLToPath(new URL("../../assets/src/models/hero/hero.bbmodel", import.meta.url));

/** Rewrites a 4.x model the way Blockbench 5.0 saves it: flat `groups`, outliner holding uuids only. */
function to5(text: string): string {
	const model = JSON.parse(text) as { meta: { format_version: string }; outliner: (string | BbGroup)[] };
	const groups: unknown[] = [];
	const ref = (entry: string | BbGroup): string => {
		if (typeof entry === "string") return entry;
		const { children, ...rest } = entry;
		groups.push({ ...rest, children: children.map(ref) });
		return entry.uuid;
	};
	const outliner = model.outliner.map(ref);
	return JSON.stringify({ ...model, meta: { ...model.meta, format_version: "5.0" }, groups, outliner });
}

const glb = async (text: string): Promise<Uint8Array> =>
	new NodeIO().writeBinary(bbmodelToDocument("hero", "hero", parseBbmodel("hero", text)));

describe("Blockbench 5.0 models", () => {
	const v4 = readFileSync(HERO, "utf8");

	it("resolves the outliner uuid references into nested groups", () => {
		const five = parseBbmodel("hero", to5(v4));
		expect(five.outliner).toEqual(parseBbmodel("hero", v4).outliner);
	});

	it("builds the same glb from both formats", async () => {
		expect(Buffer.compare(await glb(v4), await glb(to5(v4)))).toBe(0);
	});
});
