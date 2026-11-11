import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface DecalPool {
	/** When the pool is full, drops the mark that is oldest and farthest from the anchor (the hero). */
	add(x: number, z: number, size: number, yaw: number, r: number, g: number, b: number): void;
	/** Where the hero stands, in the frame of `add`; marks far from it are discarded first. */
	setAnchor(x: number, z: number): void;
	shift(dx: number, dz: number): void;
	clear(): void;
	readonly live: number;
	readonly capacity: number;
	/** Marks the pool keeps now (<= capacity): a preset change shrinks or grows it live. */
	readonly limit: number;
	setLimit(limit: number): void;
	/** Marks ever discarded to make room. */
	readonly recycled: number;
	/** X of the mark in a slot (tests and captures). */
	xAt(slot: number): number;
}

const DECAL_ALPHA = 0.75;

/**
 * Persistent floor marks (blood, corpses) as thin instances of one quad: one draw call however many there are.
 * Nothing leaves the floor until the cap is hit; then the highest `age + distance` score goes (S-11-01).
 */
export function createDecalPool(scene: Scene, capacity: number, farDistance: number): DecalPool {
	const mesh = CreateGround("vfx_decals", { width: 1, height: 1 }, scene);
	const material = new StandardMaterial("vfx_decals", scene);
	material.specularColor = Color3.Black();
	// Drawn over the floor without z-fighting it.
	material.zOffset = -2;
	material.backFaceCulling = false;
	mesh.material = material;
	const slots = Math.max(1, capacity);
	const set = createInstanceSet(mesh, slots, true);
	const xs = new Float32Array(slots);
	const zs = new Float32Array(slots);
	const born = new Float64Array(slots);
	let anchorX = 0;
	let anchorZ = 0;
	let clock = 0;
	let limit = capacity;
	let live = 0;
	let recycled = 0;

	/** Age share (0..1, oldest = 1) plus distance share (0..1 at `farDistance` or more). */
	function worst(): number {
		let victim = 0;
		let top = -1;
		let oldest = Number.POSITIVE_INFINITY;
		for (let i = 0; i < live; i++) oldest = Math.min(oldest, born[i] ?? 0);
		const ageSpan = Math.max(1, clock - oldest);
		for (let i = 0; i < live; i++) {
			const dx = (xs[i] ?? 0) - anchorX;
			const dz = (zs[i] ?? 0) - anchorZ;
			const score =
				(clock - (born[i] ?? 0)) / ageSpan + Math.min(1, Math.sqrt(dx * dx + dz * dz) / farDistance);
			if (score > top) {
				top = score;
				victim = i;
			}
		}
		return victim;
	}

	/** Swap-remove: the last mark takes slot `i`. */
	function remove(i: number): void {
		const last = --live;
		if (i === last) return;
		xs[i] = xs[last] ?? 0;
		zs[i] = zs[last] ?? 0;
		born[i] = born[last] ?? 0;
		set.matrices.copyWithin(i * 16, last * 16, last * 16 + 16);
		set.colors?.copyWithin(i * 4, last * 4, last * 4 + 4);
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
		xAt: (slot) => xs[slot] ?? 0,
		setAnchor(x, z): void {
			anchorX = x;
			anchorZ = z;
		},
		setLimit(next): void {
			limit = Math.max(0, Math.min(capacity, Math.round(next)));
			while (live > limit) remove(worst());
			set.commit(live);
		},
		add(x, z, size, yaw, r, g, b): void {
			if (limit === 0) return;
			if (live === limit) {
				recycled++;
				remove(worst());
			}
			const i = live++;
			xs[i] = x;
			zs[i] = z;
			born[i] = clock++;
			writeTransform(set.matrices, i, x, 0.02, z, size, yaw);
			const colors = set.colors;
			if (colors) {
				colors[i * 4] = r;
				colors[i * 4 + 1] = g;
				colors[i * 4 + 2] = b;
				colors[i * 4 + 3] = DECAL_ALPHA;
			}
			set.commit(live);
		},
		shift(dx, dz): void {
			for (let i = 0; i < live; i++) {
				xs[i] = (xs[i] ?? 0) - dx;
				zs[i] = (zs[i] ?? 0) - dz;
				set.matrices[i * 16 + 12] = xs[i] ?? 0;
				set.matrices[i * 16 + 14] = zs[i] ?? 0;
			}
			set.commit(live);
		},
		clear(): void {
			live = 0;
			set.commit(live);
		},
	};
}
