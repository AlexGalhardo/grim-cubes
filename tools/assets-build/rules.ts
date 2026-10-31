import type { Document } from "@gltf-transform/core";
import type { PNG } from "pngjs";

export type Category = "hero" | "enemies" | "bosses" | "npc" | "props" | "tiles" | "weapons";

export const CATEGORIES: readonly Category[] = [
	"hero",
	"enemies",
	"bosses",
	"npc",
	"props",
	"tiles",
	"weapons",
];

/** Art Bible §8 mandatory clips per class. Bosses list only the clips shared by every boss. */
export const REQUIRED_CLIPS: Readonly<Record<Category, readonly string[]>> = {
	hero: ["idle", "run", "attack_melee", "attack_ranged", "hit", "dash", "death", "victory"],
	enemies: ["idle", "walk", "attack", "hit", "death"],
	bosses: ["idle", "walk", "enrage", "phase_change", "death_execution"],
	npc: ["emerge", "idle", "talk", "hand_over", "submerge"],
	props: [],
	tiles: [],
	weapons: [],
};

export const MAX_TEXTURE_COLORS = 12;
export const TEXTURE_MULTIPLE = 32;

export class RuleError extends Error {
	constructor(
		readonly rule: string,
		readonly asset: string,
		detail: string,
	) {
		super(`[${rule}] ${asset}: ${detail}`);
		this.name = "RuleError";
	}
}

export interface ModelInput {
	name: string;
	category: Category;
	document: Document;
	extensionsUsed: readonly string[];
	texture: PNG | null;
}

function fail(rule: string, asset: string, detail: string): never {
	throw new RuleError(rule, asset, detail);
}

function validateGltf(m: ModelInput): void {
	const root = m.document.getRoot();
	const meshes = root.listMeshes();
	if (meshes.length !== 1) fail("single-mesh", m.name, `expected 1 mesh, found ${meshes.length}`);
	const materials = root.listMaterials();
	if (materials.length !== 1)
		fail("single-material", m.name, `expected 1 material, found ${materials.length}`);
	const material = materials[0];
	const unlit = m.extensionsUsed.includes("KHR_materials_unlit");
	if (!unlit && (material?.getMetallicFactor() !== 0 || material.getMetallicRoughnessTexture() !== null)) {
		fail(
			"unlit-or-no-metallic",
			m.name,
			"material must use KHR_materials_unlit or metallicFactor 0 without a texture",
		);
	}
	const clips = new Set(root.listAnimations().map((a) => a.getName()));
	for (const clip of REQUIRED_CLIPS[m.category]) {
		if (!clips.has(clip))
			fail("required-animations", m.name, `missing clip "${clip}" for category ${m.category}`);
	}
	for (const primitive of meshes[0]?.listPrimitives() ?? []) {
		const uv = primitive.getAttribute("TEXCOORD_0");
		if (!uv) fail("uv-missing", m.name, "primitive has no TEXCOORD_0");
		const data = uv.getArray();
		if (!(data instanceof Float32Array)) fail("uv-float", m.name, "TEXCOORD_0 must be FLOAT");
		for (const value of data) {
			if (value < 0 || value > 1) fail("uv-range", m.name, `UV ${value} outside [0,1]`);
		}
	}
}

function validateTexture(name: string, png: PNG | null): PNG {
	if (!png) return fail("texture-missing", name, "no <name>_d.png next to the model");
	if (png.width % TEXTURE_MULTIPLE !== 0 || png.height % TEXTURE_MULTIPLE !== 0) {
		fail("texture-size", name, `${png.width}x${png.height} is not a multiple of ${TEXTURE_MULTIPLE}`);
	}
	const colors = new Set<number>();
	for (let i = 0; i < png.data.length; i += 4) {
		if ((png.data[i + 3] ?? 0) === 0) continue;
		const rgb = ((png.data[i] ?? 0) << 16) | ((png.data[i + 1] ?? 0) << 8) | (png.data[i + 2] ?? 0);
		if (rgb === 0xffffff || rgb === 0x000000) {
			fail(
				"forbidden-color",
				name,
				`pure #${rgb.toString(16).padStart(6, "0").toUpperCase()} is not allowed`,
			);
		}
		colors.add(rgb);
	}
	if (colors.size > MAX_TEXTURE_COLORS) {
		fail("max-colors", name, `${colors.size} colors, limit ${MAX_TEXTURE_COLORS}`);
	}
	return png;
}

export function validateModel(m: ModelInput): PNG {
	validateGltf(m);
	return validateTexture(m.name, m.texture);
}
