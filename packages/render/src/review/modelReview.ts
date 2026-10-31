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
import { importModelMesh, loadManifest } from "../assets/gameAssets";
import { LIGHTING, PALETTE } from "../scene/palette";

export interface ModelReviewOptions {
	/** Directory of the manifest, with a trailing slash. */
	baseUrl: string;
	/** Manifest id of the model (e.g. "husk", "prop_crypt_01"). */
	id: string;
	/** Solid black model on a light background, for the 64 px silhouette test (Art Bible §5.3). */
	silhouette?: boolean;
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
		const atlas =
			manifest.entries[
				mesh.getTotalVertices() > 0 && options.id.startsWith("prop_")
					? "atlas_props"
					: "atlas_characters"
			];
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
