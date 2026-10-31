import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/** Art Bible §5.1 widths in units (full x extent): [min, max]; the props and weapons have no width in the table. */
const WIDTHS: Record<string, readonly [number, number]> = {
	hero: [0.8, 1.0],
	husk: [0.7, 1.0],
	wail: [0.5, 0.7],
	gravedigger: [3, 4],
	bone_merchant: [0.9, 1.1],
};

describe("assets-gen catalog", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "assets-gen-"));
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("contains the roster: hero, 8 enemies, 3 bosses, merchant, 40 props (10 per biome), 16 tiles, 5 weapons", () => {
		const byCategory = new Map<string, number>();
		for (const { category } of buildCatalog())
			byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
		expect(Object.fromEntries(byCategory)).toEqual({
			hero: 1,
			enemies: 8,
			bosses: 3,
			npc: 1,
			props: 40,
			weapons: 5,
			tiles: 16,
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

	it("stands inside the Art Bible §5.1 width ranges", () => {
		for (const { name, category, generated } of buildCatalog()) {
			const range = WIDTHS[name];
			if (!range) continue;
			const xs = generated.bbmodel.elements.flatMap((e) => [e.from[0], e.to[0]]);
			const width = (Math.max(...xs) - Math.min(...xs)) / PIXELS_PER_UNIT[category];
			expect([name, width >= range[0] && width <= range[1]]).toEqual([name, true]);
		}
	});

	it("never overwrites a model listed in authored.json", () => {
		const dir = mkdtempSync(join(tmpdir(), "assets-gen-authored-"));
		try {
			mkdirSync(join(dir, "models", "hero"), { recursive: true });
			writeFileSync(join(dir, "models", "authored.json"), JSON.stringify({ models: ["hero/hero"] }));
			writeFileSync(join(dir, "models", "hero", "hero.bbmodel"), "hand-made");
			const written = writeCatalog(dir, ["hero", "husk"]);
			expect(written).toEqual(["enemies/husk"]);
			expect(readFileSync(join(dir, "models", "hero", "hero.bbmodel"), "utf8")).toBe("hand-made");
		} finally {
			rmSync(dir, { recursive: true, force: true });
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

	it("converts a representative subset through assets-build with the real size classes", async () => {
		// One model per kind and size class: enemies small/medium (+ VAT), the hero, and a small/medium/large prop.
		// The full set of 24 is converted by `bun run assets:build` in CI; doing it here made the test slow under load.
		const subset = ["husk", "wail", "hero", "prop_bone_01", "prop_tombstone_01", "prop_crypt_01"];
		writeCatalog(root, subset);
		const out = join(root, "out");
		const manifest = await buildAssets({
			srcDir: root,
			outDir: out,
			version: "0.0.0",
			dataDir: DATA_DIR,
		});
		const names = Object.keys(manifest.entries);
		for (const expected of ["atlas_characters", "atlas_props", "vat_husk", "vat_wail", ...subset]) {
			expect(names).toContain(expected);
		}
		expect(Object.values(manifest.entries).filter((e) => e.kind === "model")).toHaveLength(subset.length);
	});
});
