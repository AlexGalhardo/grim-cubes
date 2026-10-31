import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { type LoadedVat, loadVat } from "../vat/loader";

/** Mirrors `Manifest` in tools/assets-build (render cannot import tools); the JSON on disk is the contract. */
export interface AssetEntry {
	url: string;
	hash: string;
	bytes: number;
	kind: "atlas" | "model" | "vat";
	group: string;
	meta?: string;
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
	/** Called for every enemy that has no model or VAT in the manifest and is drawn with a stand-in. */
	warn?: (message: string) => void;
}

export interface LoadedEnemy {
	id: string;
	mesh: Mesh;
	vat: LoadedVat;
}

export interface GameAssets {
	manifest: AssetManifest;
	/** One entry per `enemyIds` (same order: the horde indexes types by EnemyType id). Enemies without assets reuse the first available model and VAT. */
	enemies: LoadedEnemy[];
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

/** Flat, unlit-looking material sampling an atlas with NEAREST and no mipmaps (Art Bible §4, ADR-0014). */
function atlasMaterial(scene: Scene, name: string, url: string): StandardMaterial {
	const material = new StandardMaterial(name, scene);
	const texture = new Texture(url, scene, true, false, Texture.NEAREST_SAMPLINGMODE);
	material.diffuseTexture = texture;
	material.specularColor = Color3.Black();
	return material;
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
	const characterMaterial = characters
		? atlasMaterial(scene, "atlas_characters", url(characters.url))
		: null;
	const propMaterial = propsAtlas ? atlasMaterial(scene, "atlas_props", url(propsAtlas.url)) : null;

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

	await Promise.all([loadEnemies, loadProps]);
	return { manifest, enemies, props, characterMaterial };
}
