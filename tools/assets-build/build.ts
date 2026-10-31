import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, Logger, NodeIO } from "@gltf-transform/core";
import { PNG } from "pngjs";
import { bakeVat } from "../bake-vat/bake";
import { ATLAS_SIZE, type Placement, packSprites, renderAtlas, type Sprite } from "./atlas";
import { packGlb } from "./glb";
import { CATEGORIES, type Category, type ModelInput, RuleError, validateModel } from "./rules";

export type AtlasName = "atlas_characters" | "atlas_props";

const ATLAS_OF: Readonly<Record<Category, AtlasName>> = {
	hero: "atlas_characters",
	enemies: "atlas_characters",
	bosses: "atlas_characters",
	npc: "atlas_characters",
	weapons: "atlas_characters",
	props: "atlas_props",
	tiles: "atlas_props",
};

export interface ManifestEntry {
	url: string;
	hash: string;
	bytes: number;
	kind: "atlas" | "model" | "vat";
	/** VAT only: URL of the JSON with clip ranges (see VatMeta). */
	meta?: string;
	group: string;
	/** Atlas only: texture sampling contract for the runtime loader (SDD 09 §3). */
	sampling?: "nearest";
	mipmaps?: false;
	width?: number;
	height?: number;
}

export interface Manifest {
	version: string;
	entries: Record<string, ManifestEntry>;
}

export interface BuildOptions {
	srcDir: string;
	outDir: string;
	version: string;
}

interface Loaded {
	input: ModelInput;
	texture: PNG;
	atlas: AtlasName;
}

const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR));

function digest(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}

function listModels(srcDir: string): { category: Category; name: string; path: string }[] {
	const found: { category: Category; name: string; path: string }[] = [];
	for (const category of CATEGORIES) {
		const dir = join(srcDir, "models", category);
		if (!existsSync(dir)) continue;
		for (const file of readdirSync(dir).sort()) {
			if (file.endsWith(".glb"))
				found.push({ category, name: file.slice(0, -4), path: join(dir, file) });
		}
	}
	return found;
}

async function load(item: { category: Category; name: string; path: string }): Promise<Loaded> {
	const bytes = new Uint8Array(readFileSync(item.path));
	const json = await io.binaryToJSON(bytes);
	const document = await io.readBinary(bytes);
	const pngPath = item.path.replace(/\.glb$/, "_d.png");
	const input: ModelInput = {
		name: item.name,
		category: item.category,
		document,
		extensionsUsed: json.json.extensionsUsed ?? [],
		texture: existsSync(pngPath) ? PNG.sync.read(readFileSync(pngPath)) : null,
	};
	const texture = validateModel(input);
	return { input, texture, atlas: ATLAS_OF[item.category] };
}

function remapUvs(document: Document, p: Placement): void {
	const done = new Set<unknown>();
	for (const primitive of document.getRoot().listMeshes()[0]?.listPrimitives() ?? []) {
		const uv = primitive.getAttribute("TEXCOORD_0");
		if (!uv || done.has(uv)) continue;
		done.add(uv);
		const data = new Float32Array(uv.getArray() ?? []);
		for (let i = 0; i < data.length; i += 2) {
			data[i] = (p.x + (data[i] ?? 0) * p.width) / ATLAS_SIZE;
			data[i + 1] = (p.y + (data[i + 1] ?? 0) * p.height) / ATLAS_SIZE;
		}
		uv.setArray(data);
	}
}

/** The core io drops extensions it has no handler for; KHR_materials_unlit is re-declared by hand. */
async function writeGlb(item: Loaded): Promise<Uint8Array> {
	const jsonDoc = await io.writeJSON(item.input.document);
	if (item.input.extensionsUsed.includes("KHR_materials_unlit")) {
		jsonDoc.json.extensionsUsed = ["KHR_materials_unlit"];
		for (const material of jsonDoc.json.materials ?? [])
			material.extensions = { KHR_materials_unlit: {} };
	}
	return packGlb(jsonDoc);
}

function groupOf(category: Category, name: string): string {
	return category === "bosses" ? `boss:${name}` : "core";
}

export async function buildAssets(options: BuildOptions): Promise<Manifest> {
	const items = listModels(options.srcDir);
	const loaded: Loaded[] = [];
	for (const item of items) loaded.push(await load(item));

	rmSync(join(options.outDir, "models"), { recursive: true, force: true });
	rmSync(join(options.outDir, "vat"), { recursive: true, force: true });
	for (const file of existsSync(options.outDir) ? readdirSync(options.outDir) : []) {
		if (/^atlas_(characters|props)\..*\.png$/.test(file)) rmSync(join(options.outDir, file));
	}
	mkdirSync(join(options.outDir, "models"), { recursive: true });
	mkdirSync(join(options.outDir, "vat"), { recursive: true });

	const entries: Record<string, ManifestEntry> = {};
	for (const atlasName of ["atlas_characters", "atlas_props"] as const) {
		const members = loaded.filter((l) => l.atlas === atlasName);
		if (members.length === 0) continue;
		const sprites: Sprite[] = members.map((l) => ({ name: l.input.name, png: l.texture }));
		const placements = packSprites(atlasName, sprites);
		const png = new Uint8Array(PNG.sync.write(renderAtlas(sprites, placements)));
		const hash = digest(png);
		const url = `${atlasName}.${hash}.png`;
		writeFileSync(join(options.outDir, url), png);
		entries[atlasName] = {
			url,
			hash,
			bytes: png.length,
			kind: "atlas",
			group: "core",
			sampling: "nearest",
			mipmaps: false,
			width: ATLAS_SIZE,
			height: ATLAS_SIZE,
		};
		for (const member of members) {
			const placement = placements.find((p) => p.name === member.input.name);
			if (!placement) throw new RuleError("atlas-missing", member.input.name, "not placed");
			remapUvs(member.input.document, placement);
		}
	}

	for (const item of loaded) {
		const glb = await writeGlb(item);
		const hash = digest(glb);
		const url = `models/${item.input.name}.${hash}.glb`;
		writeFileSync(join(options.outDir, url), glb);
		if (entries[item.input.name])
			throw new RuleError("duplicate-name", item.input.name, "model names must be unique");
		entries[item.input.name] = {
			url,
			hash,
			bytes: glb.length,
			kind: "model",
			group: groupOf(item.input.category, item.input.name),
		};
	}

	for (const item of loaded) {
		if (item.input.category !== "enemies") continue;
		const { data, meta } = bakeVat(item.input.name, item.input.document);
		const bin = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
		const hash = digest(bin);
		const stem = `vat/${item.input.name}.${hash}`;
		const metaBytes = `${JSON.stringify(meta, null, "	")}
`;
		writeFileSync(join(options.outDir, `${stem}.bin`), bin);
		writeFileSync(join(options.outDir, `${stem}.json`), metaBytes);
		entries[`vat_${item.input.name}`] = {
			url: `${stem}.bin`,
			meta: `${stem}.json`,
			hash,
			bytes: bin.length,
			kind: "vat",
			group: "core",
			width: meta.width,
			height: meta.height,
		};
	}

	const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : 1)));
	const manifest: Manifest = { version: options.version, entries: sorted };
	writeFileSync(join(options.outDir, "manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
	return manifest;
}
