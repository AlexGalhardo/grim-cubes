import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PIXELS_PER_UNIT } from "../assets-build/bbmodel";
import { buildAssets } from "../assets-build/build";
import { buildCatalog } from "./catalog";
import { writeCatalog } from "./index";

const DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));

/** Art Bible §5.1 heights in units: [min, max]. */
const HEIGHTS: Record<string, readonly [number, number]> = {
	hero: [1.8, 2.0],
	husk: [1.6, 1.9],
	wail: [0.8, 1.0],
	gravedigger: [4, 6],
	bone_merchant: [2.2, 2.5],
	prop_tombstone_01: [1, 1.5],
	prop_tombstone_02: [1, 1.5],
	prop_dead_tree_01: [2.5, 4],
	prop_crypt_01: [2.5, 4],
	prop_bone_01: [0.3, 0.8],
	prop_grass_01: [0.3, 0.8],
	prop_urn_01: [0.3, 0.8],
	prop_cross_01: [1, 1.5],
	prop_fence_01: [1, 1.5],
	prop_bonepile_01: [1, 1.5],
};

describe("assets-gen catalog", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "assets-gen-"));
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("contains the P-06-01 roster: hero, 2 enemies, boss, merchant, 10 props, 4 tiles, 5 weapons", () => {
		const byCategory = new Map<string, number>();
		for (const { category } of buildCatalog())
			byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
		expect(Object.fromEntries(byCategory)).toEqual({
			hero: 1,
			enemies: 2,
			bosses: 1,
			npc: 1,
			props: 10,
			weapons: 5,
			tiles: 4,
		});
	});

	it("stands inside the Art Bible §5.1 height ranges", () => {
		for (const { name, category, generated } of buildCatalog()) {
			const range = HEIGHTS[name];
			if (!range) continue;
			const top = Math.max(...generated.bbmodel.elements.map((e) => Math.max(e.from[1], e.to[1])));
			const height = top / PIXELS_PER_UNIT[category];
			expect([name, height >= range[0] && height <= range[1]]).toEqual([name, true]);
		}
	});

	it("is byte-stable across runs", () => {
		const other = mkdtempSync(join(tmpdir(), "assets-gen-"));
		try {
			writeCatalog(root);
			writeCatalog(other);
			for (const category of readdirSync(join(root, "models"))) {
				for (const file of readdirSync(join(root, "models", category))) {
					const a = readFileSync(join(root, "models", category, file));
					const b = readFileSync(join(other, "models", category, file));
					expect(Buffer.compare(a, b)).toBe(0);
				}
			}
		} finally {
			rmSync(other, { recursive: true, force: true });
		}
	});

	it("converts through assets-build with the real size classes", async () => {
		writeCatalog(root);
		const out = join(root, "out");
		const manifest = await buildAssets({
			srcDir: root,
			outDir: out,
			version: "0.0.0",
			dataDir: DATA_DIR,
		});
		const names = Object.keys(manifest.entries).sort();
		expect(names).toContain("atlas_characters");
		expect(names).toContain("atlas_props");
		expect(names).toContain("vat_husk");
		expect(names).toContain("vat_wail");
		const models = Object.values(manifest.entries).filter((e) => e.kind === "model");
		expect(models).toHaveLength(24);
	});
});
