import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface DecalPool {
	/** Overwrites the oldest decal when the pool is full (FIFO). */
	add(x: number, z: number, size: number, yaw: number, r: number, g: number, b: number): void;
	shift(dx: number, dz: number): void;
	clear(): void;
	readonly live: number;
	readonly capacity: number;
	/** Decals the pool keeps now (<= capacity): a preset change shrinks or grows it live. */
	readonly limit: number;
	setLimit(limit: number): void;
	/** Opacity of a slot (tests and captures). */
	alphaAt(slot: number): number;
	/** Decals ever overwritten before reaching the end of their life. */
	readonly recycled: number;
}

/** The oldest share of a full pool fades out instead of vanishing when it is overwritten. */
const FADE_SHARE = 0.1;
const DECAL_ALPHA = 0.75;

/** Floor decals as thin instances of one quad: one draw call however many there are. */
export function createDecalPool(scene: Scene, capacity: number): DecalPool {
	const mesh = CreateGround("vfx_decals", { width: 1, height: 1 }, scene);
	const material = new StandardMaterial("vfx_decals", scene);
	material.specularColor = Color3.Black();
	// Drawn over the floor without z-fighting it.
	material.zOffset = -2;
	material.backFaceCulling = false;
	mesh.material = material;
	const set = createInstanceSet(mesh, Math.max(1, capacity), true);
	const xs = new Float32Array(Math.max(1, capacity));
	const zs = new Float32Array(Math.max(1, capacity));
	let head = 0;
	let limit = capacity;
	let live = 0;
	let recycled = 0;

	/** A full pool fades its oldest 10%: slot `head` is the next to be overwritten, so its alpha is the lowest. */
	function fadeOldest(): void {
		const colors = set.colors;
		if (!colors || live < limit) return;
		const fading = Math.max(1, Math.round(limit * FADE_SHARE));
		for (let k = 0; k < fading; k++) {
			const slot = (head + k) % limit;
			colors[slot * 4 + 3] = DECAL_ALPHA * ((k + 1) / (fading + 1));
		}
	}

	function publish(): void {
		fadeOldest();
		set.commit(live);
	}

	return {
		capacity,
		get live(): number {
			return live;
		},
		get recycled(): number {
			return recycled;
		},
		get limit(): number {
			return limit;
		},
		setLimit(next): void {
			limit = Math.max(0, Math.min(capacity, Math.round(next)));
			// Slots 0..limit-1 stay valid; the ring restarts from the first one.
			live = Math.min(live, limit);
			head = 0;
			publish();
		},
		alphaAt: (slot) => set.colors?.[slot * 4 + 3] ?? 0,
		add(x, z, size, yaw, r, g, b): void {
			if (limit === 0) return;
			if (live === limit) recycled++;
			const i = head;
			head = (head + 1) % limit;
			live = Math.min(limit, live + 1);
			xs[i] = x;
			zs[i] = z;
			writeTransform(set.matrices, i, x, 0.02, z, size, yaw);
			const colors = set.colors;
			if (colors) {
				colors[i * 4] = r;
				colors[i * 4 + 1] = g;
				colors[i * 4 + 2] = b;
				colors[i * 4 + 3] = DECAL_ALPHA;
			}
			publish();
		},
		shift(dx, dz): void {
			for (let i = 0; i < live; i++) {
				xs[i] = (xs[i] ?? 0) - dx;
				zs[i] = (zs[i] ?? 0) - dz;
				set.matrices[i * 16 + 12] = xs[i] ?? 0;
				set.matrices[i * 16 + 14] = zs[i] ?? 0;
			}
			publish();
		},
		clear(): void {
			live = 0;
			head = 0;
			publish();
		},
	};
}
