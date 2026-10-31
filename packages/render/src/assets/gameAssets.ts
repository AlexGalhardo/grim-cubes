import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { type LoadedVat, loadVat } from "../vat/loader";
import { type AtlasFormat, pickAtlasFormat } from "./atlasFormat";

/** Mirrors `Manifest` in tools/assets-build (render cannot import tools); the JSON on disk is the contract. */
export interface AssetEntry {
	url: string;
	hash: string;
	bytes: number;
	kind: "atlas" | "model" | "vat" | "icon";
	group: string;
	/** Atlas only: size in pixels. */
	width?: number;
	height?: number;
	/** Model only: the enemy type this cosmetic variant replaces for part of the horde (`models/variants/`). */
	variantOf?: string;
	/** Model only: the atlas entry its UVs point into (props and tiles use `atlas_props`). */
	atlas?: "atlas_characters" | "atlas_props";
	/** Icon only: pixel rectangle inside the atlas this entry's `url` names (`atlas_vfx_ui`). */
	rect?: { x: number; y: number; w: number; h: number };
	meta?: string;
	/** Atlas only: the KTX2 sibling, or false when the build had no `toktx`. */
	ktx2?: false | { url: string; hash: string; bytes: number };
}

export interface AssetManifest {
	version: string;
	entries: Record<string, AssetEntry>;
}

export type Fetcher = (url: string) => Promise<Response>;

export interface GameAssetsOptions {
	/** Directory the manifest and every entry URL are relative to, with a trailing slash (e.g. "/assets/"). */
	baseUrl: string;
	/** Enemy ids in `EnemyType` order; models and VATs are looked up under the same names (`vat_<id>`). */
	enemyIds: readonly string[];
	/** Prop ids as named in biomes.json / props.json. */
	propIds: readonly string[];
	fetchFn?: Fetcher;
	/**
	 * Directory (with a trailing slash, e.g. "/assets/ktx2/") holding `babylon.ktx2Decoder.js`,
	 * `msc_basis_transcoder.js` and `msc_basis_transcoder.wasm`. Served locally: the CSP blocks the Babylon CDN.
	 * Without it atlases stay PNG even when the manifest lists KTX2.
	 */
	ktx2DecoderUrl?: string;
	/** Load the emissive atlases (`atlas_*_e`, ~16 MB of GPU each as 2048 px PNG); false for the lowest presets. Default true. */
	emissive?: boolean;
	/** Told once which format the atlases were loaded in ("ktx2" or "png"). */
	onTextureFormat?: (format: AtlasFormat) => void;
	/** Called for every enemy that has no model or VAT in the manifest and is drawn with a stand-in. */
	warn?: (message: string) => void;
}

export interface LoadedEnemy {
	id: string;
	mesh: Mesh;
	vat: LoadedVat;
}

/** A cosmetic look of an enemy type (`models/variants/<base>_NN`): same stats, its own mesh and VAT. */
export interface LoadedVariant extends LoadedEnemy {
	/** Id of the base enemy type (an `enemyIds` entry). */
	base: string;
}

export interface GameAssets {
	manifest: AssetManifest;
	/** One entry per `enemyIds` (same order: the horde indexes types by EnemyType id). Enemies without assets reuse the first available model and VAT. */
	enemies: LoadedEnemy[];
	/** Variants of the loaded enemy types; the horde draws a share of each type with them. */
	variants: LoadedVariant[];
	props: Map<string, Mesh>;
	/** The shared character atlas material, for models loaded outside the horde (hero, Merchant, bosses, weapons). */
	characterMaterial: StandardMaterial | null;
}

async function getOk(fetchFn: Fetcher, url: string): Promise<Response> {
	const response = await fetchFn(url);
	if (!response.ok) throw new Error(`Asset fetch failed: ${response.status} ${url}`);
	return response;
}

export async function loadManifest(
	baseUrl: string,
	fetchFn: Fetcher = (u) => fetch(u),
): Promise<AssetManifest> {
	return (await getOk(fetchFn, `${baseUrl}manifest.json`)).json() as Promise<AssetManifest>;
}

/** Points Babylon's KTX2 transcoder at local files (the CSP blocks cdn.babylonjs.com) and registers the loader. */
async function enableKtx2(decoderUrl: string): Promise<void> {
	await import("@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader");
	const { KhronosTextureContainer2 } = await import("@babylonjs/core/Misc/khronosTextureContainer2");
	KhronosTextureContainer2.URLConfig = {
		jsDecoderModule: `${decoderUrl}babylon.ktx2Decoder.js`,
		wasmUASTCToASTC: null,
		wasmUASTCToBC7: null,
		wasmUASTCToRGBA_UNORM: null,
		wasmUASTCToRGBA_SRGB: null,
		wasmUASTCToR8_UNORM: null,
		wasmUASTCToRG8_UNORM: null,
		jsMSCTranscoder: `${decoderUrl}msc_basis_transcoder.js`,
		wasmMSCTranscoder: `${decoderUrl}msc_basis_transcoder.wasm`,
		wasmZSTDDecoder: null,
	};
}

/** Emissive texture gain: the ember pixels of the `_e.png` masks read as glowing under the dark night lighting. */
const EMISSIVE_LEVEL = 2;

/** Flat, unlit-looking material sampling an atlas with NEAREST and no mipmaps (Art Bible §4, ADR-0014). */
function atlasMaterial(scene: Scene, name: string, url: string, glowUrl?: string): StandardMaterial {
	const material = new StandardMaterial(name, scene);
	const texture = new Texture(url, scene, true, false, Texture.NEAREST_SAMPLINGMODE);
	material.diffuseTexture = texture;
	// Eyes, furnaces and lanterns (`_e.png`, same UVs as the diffuse atlas) glow through the emissive texture.
	if (glowUrl) {
		const glow = new Texture(glowUrl, scene, true, false, Texture.NEAREST_SAMPLINGMODE);
		glow.level = EMISSIVE_LEVEL;
		material.emissiveTexture = glow;
	}
	material.specularColor = Color3.Black();
	return material;
}

/** The loader's geometry-less `__root__` meshes would each count as an active mesh (SDD 14 section 2 budget). */
export function hideEmptyMeshes(meshes: readonly AbstractMesh[]): void {
	for (const mesh of meshes) if (mesh.getTotalVertices() === 0) mesh.isVisible = false;
}

/**
 * Imports a glb and returns its geometry mesh, still parented to the loader's `__root__` (that node carries the
 * handedness mirror, see coords.ts). The glTF animations are dropped: motion comes from the VAT. The skeleton stays
 * on the mesh on purpose: the shader only declares matricesIndices/matricesWeights when the mesh has bones, and
 * with a baked-animation texture bound Babylon skips its own bone skinning (bonesVertex is #ifndef BAKED_VERTEX_ANIMATION_TEXTURE).
 */
export async function importModelMesh(scene: Scene, url: string): Promise<Mesh> {
	await import("@babylonjs/loaders/glTF");
	const result = await ImportMeshAsync(url, scene, { pluginExtension: ".glb" });
	for (const group of result.animationGroups) group.dispose();
	hideEmptyMeshes(result.meshes);
	const mesh = result.meshes.find((m) => m.getTotalVertices() > 0) as Mesh | undefined;
	if (!mesh) throw new Error(`No geometry in ${url}`);
	return mesh;
}

/**
 * Loads the manifest, the atlases and the models the game needs. Anything missing from the manifest is skipped
 * (the caller keeps its placeholder); a missing manifest or a failed download rejects.
 */
export async function loadGameAssets(scene: Scene, options: GameAssetsOptions): Promise<GameAssets> {
	const fetchFn = options.fetchFn ?? ((u: string) => fetch(u));
	const url = (path: string): string => `${options.baseUrl}${path}`;
	const manifest = await loadManifest(options.baseUrl, fetchFn);
	const entry = (id: string): AssetEntry | undefined => manifest.entries[id];

	const characters = entry("atlas_characters");
	const propsAtlas = entry("atlas_props");
	const decoderUrl = options.ktx2DecoderUrl;
	const format: AtlasFormat =
		characters && propsAtlas
			? pickAtlasFormat(characters, scene.getEngine().getCaps(), decoderUrl !== undefined) === "ktx2" &&
				pickAtlasFormat(propsAtlas, scene.getEngine().getCaps(), decoderUrl !== undefined) === "ktx2"
				? "ktx2"
				: "png"
			: "png";
	if (format === "ktx2" && decoderUrl !== undefined) await enableKtx2(decoderUrl);
	const atlasUrl = (atlas: AssetEntry): string =>
		url(format === "ktx2" && atlas.ktx2 ? atlas.ktx2.url : atlas.url);
	options.onTextureFormat?.(format);
	/** The emissive atlas ships as PNG only; absent from the manifest when no model has an `_e.png`. */
	const glowOf = (id: string): string | undefined => {
		const glow = options.emissive === false ? undefined : entry(id);
		return glow ? url(glow.url) : undefined;
	};
	const characterMaterial = characters
		? atlasMaterial(scene, "atlas_characters", atlasUrl(characters), glowOf("atlas_characters_e"))
		: null;
	const propMaterial = propsAtlas
		? atlasMaterial(scene, "atlas_props", atlasUrl(propsAtlas), glowOf("atlas_props_e"))
		: null;

	const enemies: LoadedEnemy[] = [];
	const loadEnemies = (async () => {
		const hasAssets = (id: string): boolean => Boolean(entry(id) && entry(`vat_${id}`)?.meta);
		const standIn = options.enemyIds.find(hasAssets);
		const results = await Promise.all(
			options.enemyIds.map(async (id): Promise<LoadedEnemy | null> => {
				const source = hasAssets(id) ? id : standIn;
				if (source === undefined) return null;
				if (source !== id)
					options.warn?.(
						`enemy "${id}" has no model or VAT in the manifest, drawing "${source}" instead`,
					);
				const model = entry(source);
				const vat = entry(`vat_${source}`);
				if (!model || !vat?.meta) return null;
				const [mesh, loadedVat] = await Promise.all([
					importModelMesh(scene, url(model.url)),
					loadVat(scene, id, url(vat.url), url(vat.meta), fetchFn),
				]);
				if (characterMaterial) mesh.material = characterMaterial;
				return { id, mesh, vat: loadedVat };
			}),
		);
		for (const loaded of results) if (loaded) enemies.push(loaded);
	})();

	const variants: LoadedVariant[] = [];
	const loadVariants = Promise.all(
		Object.entries(manifest.entries).map(async ([id, model]) => {
			const vat = entry(`vat_${id}`);
			if (!model.variantOf || !vat?.meta || !options.enemyIds.includes(model.variantOf)) return;
			const [mesh, loadedVat] = await Promise.all([
				importModelMesh(scene, url(model.url)),
				loadVat(scene, id, url(vat.url), url(vat.meta), fetchFn),
			]);
			if (characterMaterial) mesh.material = characterMaterial;
			variants.push({ id, base: model.variantOf, mesh, vat: loadedVat });
		}),
	);

	const props = new Map<string, Mesh>();
	const loadProps = Promise.all(
		options.propIds.map(async (id) => {
			const model = entry(id);
			if (!model) return;
			const mesh = await importModelMesh(scene, url(model.url));
			if (propMaterial) mesh.material = propMaterial;
			props.set(id, mesh);
		}),
	);

	await Promise.all([loadEnemies, loadVariants, loadProps]);
	variants.sort((a, b) => (a.id < b.id ? -1 : 1));
	return { manifest, enemies, variants, props, characterMaterial };
}
