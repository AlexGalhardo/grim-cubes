import { BakedVertexAnimationManager } from "@babylonjs/core/BakedVertexAnimation/bakedVertexAnimationManager";
import { Constants } from "@babylonjs/core/Engines/constants";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import type { Scene } from "@babylonjs/core/scene";

/** Mirrors tools/bake-vat `VatMeta` (render cannot import tools); the JSON on disk is the contract. */
export interface VatMeta {
	format: "rgba32f";
	fps: number;
	boneCount: number;
	width: number;
	height: number;
	clips: Record<string, { from: number; to: number }>;
}

export interface LoadedVat {
	texture: RawTexture;
	manager: BakedVertexAnimationManager;
	meta: VatMeta;
}

const MAX_TEXTURE_SIZE = 4096;

/** `texels` is the .bin as written by the baker: width * height RGBA32F texels. */
export function parseVat(bin: ArrayBuffer, meta: VatMeta): Float32Array {
	if (meta.format !== "rgba32f") throw new Error(`Unsupported VAT format ${meta.format}`);
	if (meta.width > MAX_TEXTURE_SIZE || meta.height > MAX_TEXTURE_SIZE)
		throw new Error("VAT exceeds 4096 texels");
	if (bin.byteLength !== meta.width * meta.height * 16) {
		throw new Error(`VAT size mismatch: ${bin.byteLength} bytes for ${meta.width}x${meta.height}`);
	}
	return new Float32Array(bin);
}

/** Float texture, NEAREST, no mipmaps: the shader reads exact matrices with texelFetch. */
export function createVat(scene: Scene, name: string, bin: ArrayBuffer, meta: VatMeta): LoadedVat {
	const texture = RawTexture.CreateRGBATexture(
		parseVat(bin, meta),
		meta.width,
		meta.height,
		scene,
		false,
		false,
		Constants.TEXTURE_NEAREST_SAMPLINGMODE,
		Constants.TEXTURETYPE_FLOAT,
	);
	texture.name = `vat_${name}`;
	const manager = new BakedVertexAnimationManager(scene);
	manager.texture = texture;
	manager.isEnabled = true;
	return { texture, manager, meta };
}

/** Points the manager at a clip. Advance `manager.time` (seconds) each frame to play it. */
export function setVatClip(vat: LoadedVat, clip: string, offset = 0): void {
	const range = vat.meta.clips[clip];
	if (!range) throw new Error(`Unknown VAT clip "${clip}"`);
	vat.manager.setAnimationParameters(range.from, range.to, offset, vat.meta.fps);
}

export async function loadVat(
	scene: Scene,
	name: string,
	binUrl: string,
	metaUrl: string,
	fetchFn: (url: string) => Promise<Response> = (url) => fetch(url),
): Promise<LoadedVat> {
	const get = async (url: string): Promise<Response> => {
		const response = await fetchFn(url);
		if (!response.ok) throw new Error(`VAT fetch failed: ${response.status} ${url}`);
		return response;
	};
	const [bin, meta] = await Promise.all([
		get(binUrl).then((r) => r.arrayBuffer()),
		get(metaUrl).then((r) => r.json() as Promise<VatMeta>),
	]);
	return createVat(scene, name, bin, meta);
}
