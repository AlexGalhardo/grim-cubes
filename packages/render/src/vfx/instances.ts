import { Material } from "@babylonjs/core/Materials/material";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";

/** A thin-instance mesh with preallocated matrix (and optional colour) buffers; `commit` publishes `count` of them. */
export interface InstanceSet {
	readonly mesh: Mesh;
	readonly capacity: number;
	readonly matrices: Float32Array;
	/** RGBA per instance; null when the set has no colour buffer. */
	readonly colors: Float32Array | null;
	commit(count: number): void;
}

export function createInstanceSet(mesh: Mesh, capacity: number, withColor: boolean): InstanceSet {
	const matrices = new Float32Array(capacity * 16);
	for (let i = 0; i < capacity; i++) {
		const o = i * 16;
		matrices[o] = matrices[o + 5] = matrices[o + 10] = matrices[o + 15] = 1;
	}
	mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
	mesh.thinInstanceCount = 0;
	mesh.alwaysSelectAsActiveMesh = true;
	// With no instance published yet Babylon would draw the bare mesh once, at the origin.
	mesh.setEnabled(false);
	mesh.isPickable = false;
	let colors: Float32Array | null = null;
	if (withColor) {
		colors = new Float32Array(capacity * 4).fill(1);
		mesh.thinInstanceSetBuffer("color", colors, 4, false);
		// Per-instance alpha only blends when the mesh declares vertex alpha.
		mesh.hasVertexAlpha = true;
	}
	let colorCompiled = false;
	return {
		mesh,
		capacity,
		matrices,
		colors,
		commit(count: number): void {
			mesh.thinInstanceCount = count;
			// A mesh with no instance must not count as active (alwaysSelectAsActiveMesh would still select it).
			mesh.setEnabled(count > 0);
			mesh.thinInstanceBufferUpdated("matrix");
			if (!colors) return;
			mesh.thinInstanceBufferUpdated("color");
			// Babylon defines INSTANCESCOLOR only once the mesh has thin instances; recompile when they first appear.
			if (!colorCompiled && count > 0) {
				colorCompiled = true;
				mesh.material?.markAsDirty(Material.AttributesDirtyFlag);
			}
		},
	};
}

/** Writes a uniformly scaled Y-rotation matrix with translation at instance `i`. */
export function writeTransform(
	matrices: Float32Array,
	i: number,
	x: number,
	y: number,
	z: number,
	scale: number,
	yaw: number,
): void {
	const o = i * 16;
	const c = Math.cos(yaw) * scale;
	const s = Math.sin(yaw) * scale;
	matrices[o] = c;
	matrices[o + 2] = -s;
	matrices[o + 5] = scale;
	matrices[o + 8] = s;
	matrices[o + 10] = c;
	matrices[o + 12] = x;
	matrices[o + 13] = y;
	matrices[o + 14] = z;
}
