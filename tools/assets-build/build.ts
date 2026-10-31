import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, Logger, NodeIO } from "@gltf-transform/core";
import { PNG } from "pngjs";
import { bakeVat } from "../bake-vat/bake";
import { fitAtlas, type Placement, renderAtlas, type Sprite } from "./atlas";
import { bbmodelToDocument, parseBbmodel, type SizeClass, validateBbmodel } from "./bbmodel";
import { packGlb } from "./glb";
import { encodeKtx2, type Ktx2Deps, systemKtx2Deps } from "./ktx2";
import { rigidSkin } from "./rigidSkin";
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
	kind: "atlas" | "model" | "vat" | "icon";
	/** VAT only: URL of the JSON with clip ranges (see VatMeta). */
	meta?: string;
	group: string;
	/** Atlas only: texture sampling contract for the runtime loader (SDD 09 §3). */
	sampling?: "nearest";
	mipmaps?: false;
	width?: number;
	height?: number;
	/** Atlas only: the KTX2 ETC1S sibling for GPUs that sample it, or false when `toktx` was not run (SDD 09). */
	ktx2?: false | { url: string; hash: string; bytes: number };
	/** Model only: the enemy type this cosmetic variant replaces for part of the horde (`models/variants/`). */
	variantOf?: string;
	/** Model only: the atlas its UVs were remapped into (props and tiles share `atlas_props`). */
	atlas?: AtlasName;
	/** Icon only: pixel rectangle inside `atlas_vfx_ui` (this entry's `url` is that atlas). */
	rect?: { x: number; y: number; w: number; h: number };
}

export interface Manifest {
	version: string;
	entries: Record<string, ManifestEntry>;
}

export interface BuildOptions {
	/** `data/` directory; when set, enemy and prop size classes tighten the element budget (Art Bible §5.1). */
	dataDir?: string;
	srcDir: string;
	outDir: string;
	version: string;
	/** `GC_KTX2=1` turns it on; without `toktx` installed the atlases stay PNG-only (`ktx2: false`). */
	ktx2?: { enabled: boolean; deps?: Ktx2Deps };
}

interface Loaded {
	input: ModelInput;
	texture: PNG;
	/** `<name>_e.png` next to the diffuse one (eyes, furnaces, lanterns), same size, or null. */
	emissive: PNG | null;
	atlas: AtlasName;
	variantOf: string | undefined;
}

/** Categories whose models are skinned (every group a bone); the rest are merged static meshes. */
const SKINNED: readonly Category[] = ["hero", "enemies", "bosses", "npc"];

const io = new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR));

function digest(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex").slice(0, 8);
}

interface ModelFile {
	category: Category;
	name: string;
	path: string;
	/** `models/variants/<base>_NN`: a cosmetic variant of enemy type `<base>` (Art Bible 10.2). */
	variantOf?: string;
}

function listModels(srcDir: string): ModelFile[] {
	const found: ModelFile[] = [];
	for (const category of CATEGORIES) {
		const dir = join(srcDir, "models", category);
		if (!existsSync(dir)) continue;
		const files = readdirSync(dir).sort();
		const sources = new Set(files.filter((f) => f.endsWith(".bbmodel")).map((f) => f.slice(0, -8)));
		for (const file of files) {
			// A `.bbmodel` is the source of truth (D5); a `.glb` with the same stem is a stale export and is ignored.
			if (file.endsWith(".bbmodel"))
				found.push({ category, name: file.slice(0, -8), path: join(dir, file) });
			else if (file.endsWith(".glb") && !sources.has(file.slice(0, -4))) {
				found.push({ category, name: file.slice(0, -4), path: join(dir, file) });
			}
		}
	}
	// Variants are enemies by category and take the size class of their base type.
	const variants = join(srcDir, "models", "variants");
	for (const file of existsSync(variants) ? readdirSync(variants).sort() : []) {
		const match = /^(.+)_[0-9]{2}\.bbmodel$/.exec(file);
		if (match?.[1])
			found.push({
				category: "enemies",
				name: file.slice(0, -8),
				path: join(variants, file),
				variantOf: match[1],
			});
	}
	return found;
}

function readSizeClasses(dataDir: string | undefined): Map<string, SizeClass> {
	const classes = new Map<string, SizeClass>();
	if (!dataDir) return classes;
	for (const file of ["enemies.json", "props.json"]) {
		const path = join(dataDir, file);
		if (!existsSync(path)) continue;
		for (const entry of JSON.parse(readFileSync(path, "utf8")) as {
			id: string;
			sizeClass?: SizeClass;
		}[]) {
			if (entry.sizeClass) classes.set(entry.id, entry.sizeClass);
		}
	}
	return classes;
}

async function load(
	item: ModelFile,
	sizeClasses: ReadonlyMap<string, SizeClass>,
	requireClass: boolean,
): Promise<Loaded> {
	const isBbmodel = item.path.endsWith(".bbmodel");
	const pngPath = item.path.replace(/(\.glb|\.bbmodel)$/, "_d.png");
	let document: Document;
	let extensionsUsed: string[];
	if (isBbmodel) {
		const model = parseBbmodel(item.name, readFileSync(item.path, "utf8"));
		// With a data directory the size class is mandatory for enemies and props: silently falling back to the
		// category maximum would let an oversized model through.
		if (
			requireClass &&
			(item.category === "enemies" || item.category === "props") &&
			!sizeClasses.has(item.variantOf ?? item.name)
		) {
			throw new RuleError(
				"bbmodel-size-class",
				item.name,
				`no sizeClass for ${item.category} "${item.variantOf ?? item.name}" in data/`,
			);
		}
		validateBbmodel(item.name, item.category, model, sizeClasses.get(item.variantOf ?? item.name));
		document = bbmodelToDocument(item.name, item.category, model);
		rigidSkin(item.name, document, { skin: SKINNED.includes(item.category) });
		extensionsUsed = ["KHR_materials_unlit"];
	} else {
		const bytes = new Uint8Array(readFileSync(item.path));
		extensionsUsed = (await io.binaryToJSON(bytes)).json.extensionsUsed ?? [];
		document = await io.readBinary(bytes);
	}
	const input: ModelInput = {
		name: item.name,
		category: item.category,
		document,
		extensionsUsed,
		texture: existsSync(pngPath) ? PNG.sync.read(readFileSync(pngPath)) : null,
	};
	const texture = validateModel(input);
	const emissivePath = item.path.replace(/(\.glb|\.bbmodel)$/, "_e.png");
	const emissive = existsSync(emissivePath) ? PNG.sync.read(readFileSync(emissivePath)) : null;
	if (emissive && (emissive.width !== texture.width || emissive.height !== texture.height)) {
		throw new RuleError(
			"emissive-size",
			item.name,
			`_e.png is ${emissive.width}x${emissive.height}, the diffuse is ${texture.width}x${texture.height}`,
		);
	}
	return { input, texture, emissive, atlas: ATLAS_OF[item.category], variantOf: item.variantOf };
}

function blackLike(texture: PNG): PNG {
	const black = new PNG({ width: texture.width, height: texture.height });
	for (let i = 3; i < black.data.length; i += 4) black.data[i] = 255;
	return black;
}

/**
 * `atlas_terrain`: the floor tiles the game draws, one 32 px square per `floorTiles` entry of `data/biomes.json`, in
 * biome order then variant order, in a single strip (the layout `chunkRenderer` indexes). The tiles are the authored
 * `tile_*` models' textures, so the floor of the game is the floor the Art painted.
 */
function buildTerrain(
	options: BuildOptions,
	loaded: readonly Loaded[],
	entries: Record<string, ManifestEntry>,
): void {
	for (const file of existsSync(options.outDir) ? readdirSync(options.outDir) : []) {
		if (/^atlas_terrain\..*\.png$/.test(file)) rmSync(join(options.outDir, file));
	}
	const biomesPath = options.dataDir ? join(options.dataDir, "biomes.json") : "";
	if (!biomesPath || !existsSync(biomesPath)) return;
	const biomes = JSON.parse(readFileSync(biomesPath, "utf8")) as { floorTiles?: string[] }[];
	const byName = new Map(loaded.map((l) => [l.input.name, l.texture]));
	const tiles = biomes.flatMap((biome) => biome.floorTiles ?? []);
	const textures = tiles.map((name) => byName.get(name));
	if (tiles.length === 0 || textures.some((t) => !t)) return;
	const tile = textures[0]?.width ?? 32;
	const strip = new PNG({ width: tile * tiles.length, height: tile });
	textures.forEach((png, i) => {
		if (!png || png.width !== tile || png.height !== tile)
			throw new RuleError("terrain-size", tiles[i] ?? "?", `floor tiles must all be ${tile}x${tile}`);
		for (let y = 0; y < tile; y++) {
			png.data.copy(strip.data, (y * strip.width + i * tile) * 4, y * tile * 4, (y + 1) * tile * 4);
		}
	});
	const bytes = new Uint8Array(PNG.sync.write(strip, { filterType: 0 }));
	const hash = digest(bytes);
	const url = `atlas_terrain.${hash}.png`;
	writeFileSync(join(options.outDir, url), bytes);
	entries.atlas_terrain = {
		url,
		hash,
		bytes: bytes.length,
		kind: "atlas",
		group: "core",
		sampling: "nearest",
		mipmaps: false,
		width: strip.width,
		height: strip.height,
	};
}

function remapUvs(document: Document, p: Placement, size: number): void {
	const done = new Set<unknown>();
	for (const primitive of document.getRoot().listMeshes()[0]?.listPrimitives() ?? []) {
		const uv = primitive.getAttribute("TEXCOORD_0");
		if (!uv || done.has(uv)) continue;
		done.add(uv);
		const data = new Float32Array(uv.getArray() ?? []);
		for (let i = 0; i < data.length; i += 2) {
			data[i] = (p.x + (data[i] ?? 0) * p.width) / size;
			data[i + 1] = (p.y + (data[i + 1] ?? 0) * p.height) / size;
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

/** Encodes `<atlas>.<hash>.png` to a hashed `.ktx2` next to it; false (with a warning) when `toktx` is missing. */
function buildKtx2(
	outDir: string,
	atlasName: AtlasName,
	pngUrl: string,
	deps: Ktx2Deps,
): NonNullable<ManifestEntry["ktx2"]> | false {
	const temp = join(outDir, `${atlasName}.tmp.ktx2`);
	if (!encodeKtx2(join(outDir, pngUrl), temp, deps)) {
		console.warn(`assets-build: toktx unavailable or failed, ${atlasName} stays PNG-only (ktx2: false)`);
		return false;
	}
	const bytes = new Uint8Array(readFileSync(temp));
	rmSync(temp);
	const hash = digest(bytes);
	const url = `${atlasName}.${hash}.ktx2`;
	writeFileSync(join(outDir, url), bytes);
	return { url, hash, bytes: bytes.length };
}

/** `assets/src/icons/<kind>/<id>.png` -> one `atlas_vfx_ui` and an `icon_<kind>_<id>` manifest entry per icon (B-03-05). */
function buildIconAtlas(options: BuildOptions, entries: Record<string, ManifestEntry>): void {
	const root = join(options.srcDir, "icons");
	for (const file of existsSync(options.outDir) ? readdirSync(options.outDir) : []) {
		if (/^atlas_vfx_ui\..*\.png$/.test(file)) rmSync(join(options.outDir, file));
	}
	if (!existsSync(root)) return;
	const sprites: Sprite[] = [];
	for (const kind of readdirSync(root).sort()) {
		// `app` holds the executable and favicon icons, not in-game UI icons.
		if (kind === "app") continue;
		for (const file of readdirSync(join(root, kind)).sort()) {
			if (!file.endsWith(".png")) continue;
			const png = PNG.sync.read(readFileSync(join(root, kind, file)));
			sprites.push({ name: `icon_${kind}_${file.slice(0, -4)}`, png });
		}
	}
	if (sprites.length === 0) return;
	const { size, placements } = fitAtlas("atlas_vfx_ui", sprites);
	const atlas = new Uint8Array(PNG.sync.write(renderAtlas(sprites, placements, size), { filterType: 0 }));
	const hash = digest(atlas);
	const url = `atlas_vfx_ui.${hash}.png`;
	writeFileSync(join(options.outDir, url), atlas);
	entries.atlas_vfx_ui = {
		url,
		hash,
		bytes: atlas.length,
		kind: "atlas",
		group: "core",
		sampling: "nearest",
		mipmaps: false,
		width: size,
		height: size,
	};
	for (const p of placements) {
		entries[p.name] = {
			url,
			hash,
			bytes: 0,
			kind: "icon",
			group: "core",
			rect: { x: p.x, y: p.y, w: p.width, h: p.height },
		};
	}
}

/**
 * `assets/src/audio/<kind>/<id>.mp3` -> `<outDir>/audio/<id>.mp3`, the flat path the audio engine fetches
 * (apps/web/src/audio/webAudio.ts). Not hashed: vercel.json gives `/assets/audio/` a short revalidating cache.
 */
function copyAudio(options: BuildOptions): void {
	const root = join(options.srcDir, "audio");
	const out = join(options.outDir, "audio");
	rmSync(out, { recursive: true, force: true });
	if (!existsSync(root)) return;
	mkdirSync(out, { recursive: true });
	for (const kind of readdirSync(root, { withFileTypes: true })) {
		if (!kind.isDirectory()) continue;
		for (const file of readdirSync(join(root, kind.name))) {
			if (file.endsWith(".mp3"))
				writeFileSync(join(out, file), readFileSync(join(root, kind.name, file)));
		}
	}
}

export async function buildAssets(options: BuildOptions): Promise<Manifest> {
	const items = listModels(options.srcDir);
	const loaded: Loaded[] = [];
	const sizeClasses = readSizeClasses(options.dataDir);
	for (const item of items) loaded.push(await load(item, sizeClasses, options.dataDir !== undefined));

	rmSync(join(options.outDir, "models"), { recursive: true, force: true });
	rmSync(join(options.outDir, "vat"), { recursive: true, force: true });
	for (const file of existsSync(options.outDir) ? readdirSync(options.outDir) : []) {
		if (/^atlas_(characters|props)(_e)?\..*\.(png|ktx2)$/.test(file)) rmSync(join(options.outDir, file));
	}
	mkdirSync(join(options.outDir, "models"), { recursive: true });
	mkdirSync(join(options.outDir, "vat"), { recursive: true });

	const entries: Record<string, ManifestEntry> = {};
	for (const atlasName of ["atlas_characters", "atlas_props"] as const) {
		const members = loaded.filter((l) => l.atlas === atlasName);
		if (members.length === 0) continue;
		const sprites: Sprite[] = members.map((l) => ({ name: l.input.name, png: l.texture }));
		const { size, placements } = fitAtlas(atlasName, sprites);
		// filterType 0 (none): the default adaptive filter takes ~580 ms on a 2048x2048 atlas, this ~60 ms, same bytes every run.
		const png = new Uint8Array(PNG.sync.write(renderAtlas(sprites, placements, size), { filterType: 0 }));
		const hash = digest(png);
		const url = `${atlasName}.${hash}.png`;
		writeFileSync(join(options.outDir, url), png);
		const ktx2 = options.ktx2?.enabled
			? buildKtx2(options.outDir, atlasName, url, options.ktx2.deps ?? systemKtx2Deps)
			: false;
		entries[atlasName] = {
			url,
			hash,
			bytes: png.length,
			kind: "atlas",
			group: "core",
			sampling: "nearest",
			mipmaps: false,
			width: size,
			height: size,
			ktx2,
		};
		// Emissive atlas: the same placements, black wherever a model has no `_e.png`, so the UVs stay shared.
		if (members.some((l) => l.emissive)) {
			const glow: Sprite[] = members.map((l) => ({
				name: l.input.name,
				png: l.emissive ?? blackLike(l.texture),
			}));
			const glowPng = new Uint8Array(
				PNG.sync.write(renderAtlas(glow, placements, size), { filterType: 0 }),
			);
			const glowHash = digest(glowPng);
			const glowUrl = `${atlasName}_e.${glowHash}.png`;
			writeFileSync(join(options.outDir, glowUrl), glowPng);
			entries[`${atlasName}_e`] = {
				url: glowUrl,
				hash: glowHash,
				bytes: glowPng.length,
				kind: "atlas",
				group: "core",
				sampling: "nearest",
				mipmaps: false,
				width: size,
				height: size,
				ktx2: false,
			};
		}
		for (const member of members) {
			const placement = placements.find((p) => p.name === member.input.name);
			if (!placement) throw new RuleError("atlas-missing", member.input.name, "not placed");
			remapUvs(member.input.document, placement, size);
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
			...(item.variantOf ? { variantOf: item.variantOf } : {}),
			atlas: item.atlas,
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

	buildTerrain(options, loaded, entries);
	buildIconAtlas(options, entries);
	copyAudio(options);

	const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : 1)));
	const manifest: Manifest = { version: options.version, entries: sorted };
	writeFileSync(join(options.outDir, "manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
	return manifest;
}
