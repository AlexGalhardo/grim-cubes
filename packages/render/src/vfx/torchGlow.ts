import { Constants } from "@babylonjs/core/Engines/constants";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { toLoaderLocalX } from "../coords";
import { CAMERA } from "../scene/camera";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, type InstanceSet } from "./instances";

export interface GlowSource {
	/** Index of the prop type in the chunk renderer. */
	type: number;
	/** Height (u) of the flame above the ground. */
	flameHeight: number;
	/** Diameter (u) of the halo around the flame. */
	halo: number;
}

export interface TorchGlow {
	/** Re-draws the halos of the fires within `VIEW_RADIUS` of (focusX, focusZ), flickering; `seconds` is the render clock. */
	sync(seconds: number, focusX: number, focusZ: number): void;
	/** Switches every halo off (the cost checks). */
	setEnabled(on: boolean): void;
	readonly live: number;
}

const CAPACITY = 96;
/** Only the fires this close to the hero are drawn: the camera sees about 18 u, and the loaded chunks hold hundreds. */
export const VIEW_RADIUS = 22;
const TEXELS = 64;
/** Flicker: two sines per fire at unrelated rates, each fire at its own phase. */
const SLOW_HZ = 1.4;
const FAST_HZ = 3.6;
const POOL_SCALE = 1.25;
const POOL_LAYER = 0.045;
const HALO_ALPHA = 0.55;
const POOL_ALPHA = 0.3;

/** A soft radial alpha gradient: white in the middle fading to nothing at the rim. */
function gradient(game: GameScene): RawTexture {
	const data = new Uint8Array(TEXELS * TEXELS * 4);
	for (let y = 0; y < TEXELS; y++) {
		for (let x = 0; x < TEXELS; x++) {
			const d = Math.hypot((x + 0.5) / TEXELS - 0.5, (y + 0.5) / TEXELS - 0.5) * 2;
			const a = Math.max(0, 1 - d) ** 2;
			data.set([255, 255, 255, Math.round(a * 255)], (y * TEXELS + x) * 4);
		}
	}
	const texture = RawTexture.CreateRGBATexture(
		data,
		TEXELS,
		TEXELS,
		game.scene,
		false,
		false,
		Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
	);
	texture.hasAlpha = true;
	return texture;
}

function glowMaterial(game: GameScene, name: string, texture: RawTexture): StandardMaterial {
	const material = new StandardMaterial(name, game.scene);
	material.diffuseTexture = texture;
	material.useAlphaFromDiffuseTexture = true;
	material.disableLighting = true;
	material.emissiveColor = Color3.White();
	material.alphaMode = Constants.ALPHA_ADD;
	material.backFaceCulling = false;
	material.zOffset = -2;
	return material;
}

/**
 * The glow of torches and bonfires (Art Bible 9): an additive halo around each flame that flickers, plus a faint
 * pool of light on the ground under it, both thin instances read from the chunk renderer's prop buffers, so a fire
 * costs two instances and no draw call of its own. Point lights are not used: a `StandardMaterial` takes four lights
 * and the scene already spends three on the sun, the sky and the rim, so a point light would push one of them out.
 */
export function createTorchGlow(
	game: GameScene,
	sources: readonly GlowSource[],
	read: (type: number) => { buffer: Float32Array; count: number },
): TorchGlow {
	const texture = gradient(game);
	const haloMesh = CreateDisc("vfx_torch_halo", { radius: 0.5, tessellation: 16 }, game.scene);
	haloMesh.material = glowMaterial(game, "vfx_torch_halo", texture);
	const halos: InstanceSet = createInstanceSet(haloMesh, CAPACITY, true);
	const poolMesh = CreateDisc("vfx_torch_pool", { radius: 0.5, tessellation: 16 }, game.scene);
	poolMesh.rotation.x = Math.PI / 2;
	poolMesh.bakeCurrentTransformIntoVertices();
	poolMesh.material = glowMaterial(game, "vfx_torch_pool", texture);
	const pools: InstanceSet = createInstanceSet(poolMesh, CAPACITY, true);
	const elevation = Math.PI / 2 - CAMERA.beta;
	const cosE = Math.cos(elevation);
	const sinE = Math.sin(elevation);
	const ember = Color3.FromHexString(PALETTE.ember);
	const light = Color3.FromHexString(PALETTE.emberLight);
	let live = 0;
	let enabled = true;

	function tint(set: InstanceSet, n: number, hot: number, alpha: number): void {
		const colors = set.colors;
		if (!colors) return;
		colors[n * 4] = ember.r + (light.r - ember.r) * hot;
		colors[n * 4 + 1] = ember.g + (light.g - ember.g) * hot;
		colors[n * 4 + 2] = ember.b + (light.b - ember.b) * hot;
		colors[n * 4 + 3] = alpha;
	}

	return {
		get live(): number {
			return live;
		},
		setEnabled(on): void {
			enabled = on;
		},
		sync(seconds, focusX, focusZ): void {
			let n = 0;
			for (const source of enabled ? sources : []) {
				const { buffer, count } = read(source.type);
				for (let i = 0; i < count && n < CAPACITY; i++) {
					const x = toLoaderLocalX(buffer[i * 16 + 12] ?? 0);
					const z = buffer[i * 16 + 14] ?? 0;
					if (Math.hypot(x - focusX, z - focusZ) > VIEW_RADIUS) continue;
					const phase = x * 12.9898 + z * 78.233;
					const flicker =
						0.85 +
						0.15 * Math.sin(seconds * SLOW_HZ * Math.PI * 2 + phase) +
						0.08 * Math.sin(seconds * FAST_HZ * Math.PI * 2 + phase * 1.7);
					const size = source.halo * flicker;
					const o = n * 16;
					const h = halos.matrices;
					h[o] = size;
					h[o + 5] = size * cosE;
					h[o + 6] = size * sinE;
					h[o + 9] = -sinE;
					h[o + 10] = cosE;
					h[o + 12] = x;
					h[o + 13] = source.flameHeight;
					h[o + 14] = z;
					const p = pools.matrices;
					p[o] = p[o + 5] = p[o + 10] = source.halo * POOL_SCALE * flicker;
					p[o + 12] = x;
					p[o + 13] = POOL_LAYER;
					p[o + 14] = z;
					const hot = Math.min(1, Math.max(0, (flicker - 0.7) / 0.5));
					tint(halos, n, hot, HALO_ALPHA * flicker);
					tint(pools, n, hot, POOL_ALPHA * flicker);
					n++;
				}
			}
			live = n;
			halos.commit(n);
			pools.commit(n);
		},
	};
}
