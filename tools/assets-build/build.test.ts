import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, Logger, NodeIO } from "@gltf-transform/core";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ATLAS_SIZE, EXTRUDE, packSprites, renderAtlas } from "./atlas";
import { buildAssets } from "./build";
import { packGlb } from "./glb";
import { type Category, REQUIRED_CLIPS } from "./rules";

interface FixtureOptions {
	category?: Category;
	meshes?: number;
	materials?: number;
	unlit?: boolean;
	extraExtension?: string;
	metallic?: number;
	clips?: readonly string[];
	uvs?: number[];
	noUv?: boolean;
	texture?: "ok" | "none" | "badSize" | "white" | "manyColors" | "huge";
}

let root: string;
let src: string;
let out: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "assets-build-"));
	src = join(root, "src");
	out = join(root, "out");
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function solidPng(
	width: number,
	height: number,
	color: (x: number, y: number) => [number, number, number],
): PNG {
	const png = new PNG({ width, height });
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [r, g, b] = color(x, y);
			png.data.set([r, g, b, 255], (y * width + x) * 4);
		}
	}
	return png;
}

function texturePng(kind: NonNullable<FixtureOptions["texture"]>, seed: number): PNG {
	switch (kind) {
		case "badSize":
			return solidPng(30, 32, () => [10, 20, 30]);
		case "white":
			return solidPng(32, 32, () => [255, 255, 255]);
		case "manyColors":
			return solidPng(32, 32, (x) => [x + 1, 40, 60]);
		case "huge":
			return solidPng(2048, 2048, () => [10, 20, 30]);
		default:
			return solidPng(32, 32, (x) => [40 + seed * 20, 30 + (x % 2) * 10, 90]);
	}
}

async function writeModel(name: string, o: FixtureOptions = {}, seed = 0): Promise<void> {
	const category = o.category ?? "props";
	const doc = new Document();
	const buffer = doc.createBuffer();
	const material = doc.createMaterial("m").setMetallicFactor(o.metallic ?? 0);
	const uv = doc
		.createAccessor()
		.setType("VEC2")
		.setArray(new Float32Array(o.uvs ?? [0, 0, 1, 0, 0, 1]))
		.setBuffer(buffer);
	const position = doc
		.createAccessor()
		.setType("VEC3")
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
		.setBuffer(buffer);
	const scene = doc.createScene();
	if (category === "enemies") {
		const bone = doc.createNode("bone");
		scene.addChild(bone);
		doc.createSkin("skin").addJoint(bone);
	}
	for (let i = 0; i < (o.meshes ?? 1); i++) {
		const primitive = doc.createPrimitive().setAttribute("POSITION", position).setMaterial(material);
		if (!o.noUv) primitive.setAttribute("TEXCOORD_0", uv);
		const mesh = doc.createMesh(`mesh${i}`).addPrimitive(primitive);
		scene.addChild(doc.createNode(`n${i}`).setMesh(mesh));
	}
	for (const clip of o.clips ?? REQUIRED_CLIPS[category]) doc.createAnimation(clip);

	const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR));
	const json = await io.writeJSON(doc);
	if (o.unlit !== false) {
		json.json.extensionsUsed = ["KHR_materials_unlit"];
		for (const m of json.json.materials ?? []) m.extensions = { KHR_materials_unlit: {} };
	}
	if (o.extraExtension) json.json.extensionsUsed = [...(json.json.extensionsUsed ?? []), o.extraExtension];
	if (o.materials && o.materials > 1)
		json.json.materials = [...(json.json.materials ?? []), { name: "extra" }];
	const dir = join(src, "models", category);
	mkdirSync(dir, { recursive: true });
	// Packing the hand-edited JSON keeps the fixtures independent of the core document model.
	writeFileSync(join(dir, `${name}.glb`), packGlb(json));
	const texture = o.texture ?? "ok";
	if (texture !== "none")
		writeFileSync(
			join(dir, `${name}_d.png`),
			PNG.sync.write(texturePng(texture, seed), { filterType: 0 }),
		);
}

const build = (): ReturnType<typeof buildAssets> =>
	buildAssets({ srcDir: src, outDir: out, version: "1.2.3" });

describe("buildAssets", () => {
	test("two consecutive runs produce a byte-identical manifest", async () => {
		await writeModel("hero_a", { category: "enemies" }, 1);
		await writeModel("prop_a", {}, 2);
		await build();
		const first = readFileSync(join(out, "manifest.json"));
		await build();
		expect(Buffer.compare(first, readFileSync(join(out, "manifest.json")))).toBe(0);
		const manifest = JSON.parse(first.toString());
		expect(manifest.version).toBe("1.2.3");
		expect(JSON.stringify(manifest)).not.toContain("generatedAt");
	});

	test("atlas_characters is a hashed 2048x2048 PNG with NEAREST and no mipmaps", async () => {
		await writeModel("husk", { category: "enemies" }, 1);
		const manifest = await build();
		const entry = manifest.entries.atlas_characters;
		expect(entry?.url).toMatch(/^atlas_characters\.[0-9a-f]{8}\.png$/);
		expect(entry?.sampling).toBe("nearest");
		expect(entry?.mipmaps).toBe(false);
		const png = PNG.sync.read(readFileSync(join(out, entry?.url ?? "")));
		expect([png.width, png.height]).toEqual([2048, 2048]);
	});

	test("atlases are marked ktx2: false by default and without toktx", async () => {
		await writeModel("husk", { category: "enemies" }, 1);
		expect((await build()).entries.atlas_characters?.ktx2).toBe(false);
		const missing = await buildAssets({
			srcDir: src,
			outDir: out,
			version: "1.2.3",
			ktx2: { enabled: true, deps: { locate: () => null, run: () => false } },
		});
		expect(missing.entries.atlas_characters?.ktx2).toBe(false);
	});

	test("with toktx the KTX2 sibling is hashed and listed in the manifest", async () => {
		await writeModel("husk", { category: "enemies" }, 1);
		const calls: string[][] = [];
		const manifest = await buildAssets({
			srcDir: src,
			outDir: out,
			version: "1.2.3",
			ktx2: {
				enabled: true,
				deps: {
					locate: () => "toktx",
					run: (_binary, args) => {
						calls.push(args);
						writeFileSync(args[args.length - 2] ?? "", new Uint8Array([0xab, 0x4b, 0x54, 0x58]));
						return true;
					},
				},
			},
		});
		const entry = manifest.entries.atlas_characters;
		expect(entry?.ktx2).toMatchObject({ bytes: 4 });
		const ktx2 = entry?.ktx2 || null;
		expect(ktx2?.url).toMatch(/^atlas_characters\.[0-9a-f]{8}\.ktx2$/);
		expect([...readFileSync(join(out, ktx2?.url ?? ""))]).toEqual([0xab, 0x4b, 0x54, 0x58]);
		expect(calls[0]).toContain("etc1s");
	});

	test("audio files are copied flat to audio/<id>.mp3", async () => {
		await writeModel("prop_a", {}, 1);
		mkdirSync(join(src, "audio", "sfx"), { recursive: true });
		writeFileSync(join(src, "audio", "sfx", "sfx_hit.mp3"), new Uint8Array([1, 2, 3]));
		writeFileSync(join(src, "audio", "sfx", "sfx_hit.meta.json"), "{}");
		await build();
		expect([...readFileSync(join(out, "audio", "sfx_hit.mp3"))]).toEqual([1, 2, 3]);
		expect(existsSync(join(out, "audio", "sfx_hit.meta.json"))).toBe(false);
	});

	test("icons are packed into atlas_vfx_ui with one icon_<kind>_<id> entry each", async () => {
		await writeModel("prop_a", {}, 1);
		const dir = join(src, "icons", "item");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "rusted_plate.png"), PNG.sync.write(solidPng(32, 32, () => [90, 90, 120])));
		writeFileSync(join(dir, "cursed_ring.png"), PNG.sync.write(solidPng(32, 32, () => [120, 40, 40])));
		const manifest = await build();
		const atlas = manifest.entries.atlas_vfx_ui;
		expect(atlas?.url).toMatch(/^atlas_vfx_ui\.[0-9a-f]{8}\.png$/);
		const a = manifest.entries.icon_item_rusted_plate;
		const b = manifest.entries.icon_item_cursed_ring;
		expect([a?.kind, a?.url]).toEqual(["icon", atlas?.url]);
		expect(a?.rect).toMatchObject({ w: 32, h: 32 });
		expect(a?.rect).not.toEqual(b?.rect);
		const png = PNG.sync.read(readFileSync(join(out, atlas?.url ?? "")));
		const at = ((a?.rect?.y ?? 0) * png.width + (a?.rect?.x ?? 0)) * 4;
		expect([png.data[at], png.data[at + 1], png.data[at + 2]]).toEqual([90, 90, 120]);
	});

	test("enemies get a baked VAT (.bin RGBA32F plus clip JSON)", async () => {
		await writeModel("husk", { category: "enemies" }, 1);
		const manifest = await build();
		const entry = manifest.entries.vat_husk;
		expect(entry?.url).toMatch(/^vat\/husk\.[0-9a-f]{8}\.bin$/);
		const meta = JSON.parse(readFileSync(join(out, entry?.meta ?? ""), "utf8")) as {
			width: number;
			height: number;
			clips: Record<string, unknown>;
		};
		expect(Object.keys(meta.clips)).toEqual(["idle", "walk", "attack", "hit", "death"]);
		expect(readFileSync(join(out, entry?.url ?? "")).length).toBe(meta.width * meta.height * 16);
	});

	test("model UVs are remapped into the atlas", async () => {
		await writeModel("husk", { category: "enemies" }, 1);
		const manifest = await build();
		const glb = new Uint8Array(readFileSync(join(out, manifest.entries.husk?.url ?? "")));
		expect((await new NodeIO().binaryToJSON(glb)).json.extensionsUsed).toContain("KHR_materials_unlit");
		const doc = await new NodeIO().readBinary(glb);
		const uv = doc.getRoot().listMeshes()[0]?.listPrimitives()[0]?.getAttribute("TEXCOORD_0")?.getArray();
		const span = 32 / ATLAS_SIZE;
		expect(uv?.[2]).toBeCloseTo((uv?.[0] ?? 0) + span, 6);
		expect(uv?.[5]).toBeCloseTo((uv?.[1] ?? 0) + span, 6);
	});

	test.each<[string, FixtureOptions]>([
		["unknown-extension", { extraExtension: "KHR_texture_transform" }],
		["single-mesh", { meshes: 2 }],
		["single-material", { materials: 2 }],
		["unlit-or-no-metallic", { unlit: false, metallic: 1 }],
		["required-animations", { category: "enemies", clips: ["idle"] }],
		["uv-range", { uvs: [0, 0, 2, 0, 0, 1] }],
		["uv-missing", { noUv: true }],
		["texture-missing", { texture: "none" }],
		["texture-size", { texture: "badSize" }],
		["forbidden-color", { texture: "white" }],
		["max-colors", { texture: "manyColors" }],
		["atlas-overflow", { texture: "huge" }],
	])("invalid fixture fails with rule %s", async (rule, options) => {
		await writeModel("bad", options);
		await expect(build()).rejects.toThrow(`[${rule}]`);
	});
});

describe("atlas packing", () => {
	test("sprites are extruded by 2 px and never overlap", () => {
		const a = { name: "a", png: solidPng(32, 32, () => [200, 10, 10]) };
		const b = { name: "b", png: solidPng(64, 32, () => [10, 200, 10]) };
		const placements = packSprites("t", [a, b]);
		const atlas = renderAtlas([a, b], placements);
		const px = (x: number, y: number): number[] =>
			Array.from(atlas.data.subarray((y * 2048 + x) * 4, (y * 2048 + x) * 4 + 4));
		for (const p of placements) {
			const color = p.name === "a" ? [200, 10, 10, 255] : [10, 200, 10, 255];
			expect(px(p.x - EXTRUDE, p.y - EXTRUDE)).toEqual(color);
			expect(px(p.x + p.width + EXTRUDE - 1, p.y + p.height + EXTRUDE - 1)).toEqual(color);
		}
		const [p0, p1] = placements;
		const overlap =
			p0 !== undefined &&
			p1 !== undefined &&
			p0.x - EXTRUDE < p1.x + p1.width + EXTRUDE &&
			p1.x - EXTRUDE < p0.x + p0.width + EXTRUDE &&
			p0.y - EXTRUDE < p1.y + p1.height + EXTRUDE &&
			p1.y - EXTRUDE < p0.y + p0.height + EXTRUDE;
		expect(overlap).toBe(false);
	});
});
