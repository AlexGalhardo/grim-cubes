import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { biomesData } from "@gc/game";
import { EMISSIVE_LEVEL, importModelMesh, loadManifest } from "../assets/gameAssets";
import { LIGHTING, PALETTE } from "../scene/palette";
import { createGameScene } from "../scene/scene";

export interface ModelReviewOptions {
	/** Directory of the manifest, with a trailing slash. */
	baseUrl: string;
	/** Manifest id of the model (e.g. "husk", "prop_crypt_01"). */
	id: string;
	/** Solid black model on a light background, for the 64 px silhouette test (Art Bible §5.3). */
	silhouette?: boolean;
	/** `?ingame=1`: the game camera (55 degrees, desktop or mobile radius), light and fog over a tile of the model's biome. */
	ingame?: boolean;
	/** The mobile camera radius (800x360 captures); desktop otherwise. */
	mobile?: boolean;
	/** Biome id for the ground, fog and clear colour; derived from the model id when omitted. */
	biome?: string;
}

/** The biome a model belongs to: the one whose props or enemy pool name it, else the first (the cemetery). */
/** Bosses are not in a biome's lists: the biome whose round they close (Art Bible 3.2). */
const BOSS_BIOME: Readonly<Record<string, string>> = {
	gravedigger: "sunken_cemetery",
	swamp_matriarch: "bone_swamp",
	forgemaster: "infernal_forge",
	alpha_hunter: "biomech_nest",
	nest_queen: "biomech_nest",
};

export function biomeIdFor(id: string): string {
	if (BOSS_BIOME[id]) return BOSS_BIOME[id];
	const found = biomesData.find(
		(b) => b.enemyPool.includes(id) || Object.values(b.props ?? {}).some((list) => list.includes(id)),
	);
	return (found ?? biomesData[0])?.id ?? "sunken_cemetery";
}

/** The atlas a model's UVs point into: the manifest says (props and tiles share `atlas_props`). */
export function reviewAtlasId(entry: { atlas?: string }): string {
	return entry.atlas ?? "atlas_characters";
}

/** Fixed three-quarter view from the model's front (+Z): the same shot for every model. */
const REVIEW_CAMERA = { alpha: Math.PI / 2 - 0.6, beta: 1.15, fov: 0.5 } as const;

/**
 * One model on a neutral background with a fixed camera, framed by its bounding box. Debug-only (the web app
 * mounts it behind `__DEBUG_API__`); `tests/e2e/art-review.spec.ts` screenshots it for `docs/art/review/`.
 */
export async function startModelReview(
	engine: Engine | NullEngine,
	options: ModelReviewOptions,
): Promise<Scene> {
	return options.ingame ? startIngameReview(engine, options) : startPlainReview(engine, options);
}

/** The game's own scene, camera, light and fog with the model on a floor tile of its biome. */
async function startIngameReview(engine: Engine | NullEngine, options: ModelReviewOptions): Promise<Scene> {
	const game = createGameScene(engine, options.mobile === true);
	const { scene } = game;
	game.hero.isVisible = false;
	scene.getMeshByName("ground")?.setEnabled(false);
	const biome = biomesData.find((b) => b.id === (options.biome ?? biomeIdFor(options.id))) ?? biomesData[0];
	if (biome?.fogColor) {
		scene.fogColor = Color3.FromHexString(biome.fogColor);
		scene.clearColor = Color4.FromColor3(scene.fogColor, 1);
	}
	const manifest = await loadManifest(options.baseUrl);
	const atlasMaterial = (atlasId: string, name: string): StandardMaterial => {
		const material = new StandardMaterial(name, scene);
		material.specularColor = Color3.Black();
		const atlas = manifest.entries[atlasId];
		const nearest = (url: string): Texture =>
			new Texture(`${options.baseUrl}${url}`, scene, true, false, Texture.NEAREST_SAMPLINGMODE);
		if (atlas) material.diffuseTexture = nearest(atlas.url);
		const glow = manifest.entries[`${atlasId}_e`];
		if (glow) {
			const texture = nearest(glow.url);
			texture.level = EMISSIVE_LEVEL;
			material.emissiveTexture = texture;
		}
		return material;
	};
	const entry = manifest.entries[options.id];
	if (entry?.kind !== "model") throw new Error(`Unknown model "${options.id}"`);
	const mesh = await importModelMesh(scene, `${options.baseUrl}${entry.url}`);
	mesh.material = atlasMaterial(entry.atlas ?? "atlas_characters", "ingame_model");

	const tileId = biome?.floorTiles?.[0];
	const tileEntry = tileId ? manifest.entries[tileId] : undefined;
	if (tileEntry?.kind === "model") {
		const tile = await importModelMesh(scene, `${options.baseUrl}${tileEntry.url}`);
		tile.material = atlasMaterial(tileEntry.atlas ?? "atlas_props", "ingame_tile");
		tile.computeWorldMatrix(true);
		const box = tile.getHierarchyBoundingVectors(true);
		const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
		// A 5x5 patch of the tile under the model, its top face level with the ground the game draws.
		for (let ix = -2; ix <= 2; ix++) {
			for (let iz = -2; iz <= 2; iz++) {
				const copy = ix === 0 && iz === 0 ? tile : tile.createInstance(`tile_${ix}_${iz}`);
				copy.parent = tile.parent;
				copy.position.x = ix * size;
				copy.position.z = iz * size;
				copy.position.y = -box.max.y;
			}
		}
	}
	return scene;
}

async function startPlainReview(engine: Engine | NullEngine, options: ModelReviewOptions): Promise<Scene> {
	const scene = new Scene(engine);
	const silhouette = options.silhouette === true;
	scene.clearColor = Color4.FromColor3(Color3.FromHexString(silhouette ? PALETTE.bone : PALETTE.mist), 1);

	const sun = new DirectionalLight("sun", new Vector3(...LIGHTING.sunDirection), scene);
	sun.diffuse = Color3.FromHexString(PALETTE.sun);
	sun.specular = Color3.Black();
	sun.intensity = LIGHTING.sunIntensity;
	const hemi = new HemisphericLight("hemi", Vector3.Up(), scene);
	hemi.diffuse = Color3.FromHexString(PALETTE.bone);
	hemi.groundColor = Color3.FromHexString(PALETTE.shadow);
	hemi.specular = Color3.Black();
	hemi.intensity = 0.8;

	const manifest = await loadManifest(options.baseUrl);
	const entry = manifest.entries[options.id];
	if (entry?.kind !== "model") throw new Error(`Unknown model "${options.id}"`);
	const mesh = await importModelMesh(scene, `${options.baseUrl}${entry.url}`);

	const material = new StandardMaterial("review", scene);
	material.specularColor = Color3.Black();
	if (silhouette) {
		material.disableLighting = true;
		material.emissiveColor = Color3.Black();
	} else {
		const atlas = manifest.entries[reviewAtlasId(entry)];
		if (atlas) {
			material.diffuseTexture = new Texture(
				`${options.baseUrl}${atlas.url}`,
				scene,
				true,
				false,
				Texture.NEAREST_SAMPLINGMODE,
			);
		}
	}
	mesh.material = material;

	mesh.computeWorldMatrix(true);
	const { min, max } = mesh.getHierarchyBoundingVectors(true);
	const center = min.add(max).scale(0.5);
	const extent = Math.max(max.y - min.y, max.x - min.x, max.z - min.z);
	const camera = new ArcRotateCamera(
		"review",
		REVIEW_CAMERA.alpha,
		REVIEW_CAMERA.beta,
		((extent * 0.5) / Math.tan(REVIEW_CAMERA.fov / 2)) * 1.35,
		center,
		scene,
	);
	camera.fov = REVIEW_CAMERA.fov;
	camera.inputs.clear();
	return scene;
}
