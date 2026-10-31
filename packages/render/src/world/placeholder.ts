import { Constants } from "@babylonjs/core/Engines/constants";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { PALETTE } from "../scene/palette";

/** Floor variants per biome and the side of one variant tile, in texels (Art Bible §5: 32 px per unit). */
export const TERRAIN_VARIANTS = 4;
export const TERRAIN_TILE = 32;

export interface PropTypeDef {
	name: string;
	/**
	 * A glTF-loaded base mesh (parented to the loader's `__root__`). When set it replaces the placeholder box, and
	 * instance x is conjugated for the root mirror (coords.ts).
	 */
	mesh?: Mesh;
	/** Set for tall props (render.json propFade.minHeight): they fade while they hide the hero. */
	fade?: { radius: number; height: number };
	/** Box size in world units. */
	size: readonly [number, number, number];
	/** PALETTE token name. */
	color: keyof typeof PALETTE;
}

/** Stand-ins until the Cemetery props ship through assets-build (P-06-01). */
export const PLACEHOLDER_PROPS: readonly PropTypeDef[] = [
	{ name: "prop_tombstone", size: [0.8, 1.2, 0.3], color: "mist" },
	{ name: "prop_dead_tree", size: [0.5, 3, 0.5], color: "shadow" },
	{ name: "prop_crypt", size: [2.5, 2, 2], color: "mist" },
	{ name: "prop_bone", size: [0.6, 0.2, 0.3], color: "bone" },
	{ name: "prop_grass", size: [0.5, 0.4, 0.5], color: "night2" },
	{ name: "prop_urn", size: [0.5, 0.7, 0.5], color: "shadow" },
];

/**
 * Generated stand-in for `atlas_terrain`: one block of TERRAIN_VARIANTS tiles per biome, each shading its base colour
 * towards `shadow`. Biome 0 (the cemetery) keeps the original night2 base; `tints[i]` overrides the base of biome i.
 */
export function createPlaceholderTerrain(
	scene: Scene,
	tints: readonly (string | undefined)[] = [],
): RawTexture {
	const biomeCount = Math.max(1, tints.length);
	const width = TERRAIN_TILE * TERRAIN_VARIANTS * biomeCount;
	const data = new Uint8Array(width * TERRAIN_TILE * 4);
	const to = Color3.FromHexString(PALETTE.shadow);
	for (let biome = 0; biome < biomeCount; biome++) {
		const from = Color3.FromHexString(tints[biome] ?? PALETTE.night2);
		for (let v = 0; v < TERRAIN_VARIANTS; v++) {
			const variant = biome * TERRAIN_VARIANTS + v;
			const mix = (v / (TERRAIN_VARIANTS - 1)) * 0.5;
			const r = Math.round((from.r + (to.r - from.r) * mix) * 255);
			const g = Math.round((from.g + (to.g - from.g) * mix) * 255);
			const b = Math.round((from.b + (to.b - from.b) * mix) * 255);
			for (let y = 0; y < TERRAIN_TILE; y++) {
				for (let x = 0; x < TERRAIN_TILE; x++) {
					data.set([r, g, b, 255], (y * width + variant * TERRAIN_TILE + x) * 4);
				}
			}
		}
	}
	const texture = RawTexture.CreateRGBATexture(
		data,
		width,
		TERRAIN_TILE,
		scene,
		false,
		false,
		Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		Constants.TEXTURETYPE_UNSIGNED_BYTE,
	);
	texture.name = "terrain_placeholder";
	return texture;
}
