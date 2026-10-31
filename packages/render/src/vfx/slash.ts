import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet } from "./instances";
import { fanMesh } from "./telegraph";

export interface Slash {
	/** An ember cutting arc from the hero (scene x, z) along (dirX, dirZ), `reach` u long. */
	fire(x: number, z: number, dirX: number, dirZ: number, reach: number): void;
	update(dtSeconds: number): void;
	readonly live: number;
}

const CAPACITY = 4;
const SECONDS = 0.18;
const LAYER = 0.06;
const START_ALPHA = 0.7;

/**
 * The melee cutting arc (Art Bible 9, the ember trail of the sword): a flat fan of `arcDegrees` and radius `reach`
 * that fades over 0.18 s, so what the player sees reaches as far as the damage does (`range` of the weapon, tiers
 * included), not only as far as the blade model.
 */
export function createSlash(game: GameScene, arcDegrees: number): Slash {
	const mesh = fanMesh(game.scene, "vfx_slash", (arcDegrees * Math.PI) / 360);
	const material = new StandardMaterial("vfx_slash", game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(PALETTE.emberLight);
	material.diffuseColor = Color3.Black();
	material.backFaceCulling = false;
	material.zOffset = -4;
	mesh.material = material;
	const set = createInstanceSet(mesh, CAPACITY, true);
	const x = new Float32Array(CAPACITY);
	const z = new Float32Array(CAPACITY);
	const dx = new Float32Array(CAPACITY);
	const dz = new Float32Array(CAPACITY);
	const reach = new Float32Array(CAPACITY);
	const left = new Float32Array(CAPACITY);
	let next = 0;
	let live = 0;
	return {
		get live(): number {
			return live;
		},
		fire(px, pz, dirX, dirZ, length): void {
			const i = next;
			next = (next + 1) % CAPACITY;
			x[i] = px;
			z[i] = pz;
			dx[i] = dirX;
			dz[i] = dirZ;
			reach[i] = length;
			left[i] = SECONDS;
		},
		update(dt): void {
			let n = 0;
			for (let i = 0; i < CAPACITY; i++) {
				if ((left[i] ?? 0) <= 0) continue;
				left[i] = (left[i] ?? 0) - dt;
				if ((left[i] ?? 0) <= 0) continue;
				const yaw = Math.atan2(dx[i] ?? 0, dz[i] ?? 1);
				const c = Math.cos(yaw);
				const s = Math.sin(yaw);
				const r = reach[i] ?? 1;
				const o = n * 16;
				const m = set.matrices;
				m[o] = c * r;
				m[o + 1] = 0;
				m[o + 2] = -s * r;
				m[o + 5] = 1;
				m[o + 8] = s * r;
				m[o + 10] = c * r;
				m[o + 12] = x[i] ?? 0;
				m[o + 13] = LAYER;
				m[o + 14] = z[i] ?? 0;
				const colors = set.colors;
				if (colors) {
					colors[n * 4] = colors[n * 4 + 1] = colors[n * 4 + 2] = 1;
					colors[n * 4 + 3] = START_ALPHA * ((left[i] ?? 0) / SECONDS);
				}
				n++;
			}
			live = n;
			set.commit(n);
		},
	};
}
