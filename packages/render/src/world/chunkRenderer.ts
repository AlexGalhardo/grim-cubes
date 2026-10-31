import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { ChunkSystem } from "@gc/game";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { PALETTE } from "../scene/palette";
import { flatMaterial, type GameScene } from "../scene/scene";
import { createPlaceholderTerrain, type PropTypeDef, TERRAIN_TILE, TERRAIN_VARIANTS } from "./placeholder";

export interface ChunkRendererConfig {
	chunkSize: number;
	maxPropsPerChunk: number;
}

export interface ChunkRenderer {
	/** Call once per frame after `chunks.update`; `originX/Z` is the absolute render origin. */
	update(originX: number, originZ: number): void;
	/** Matrix buffer and live instance count of a prop type (debug and tests). */
	instances(type: number): { buffer: Float32Array; count: number };
	readonly stats: Readonly<{ floorWrites: number; propRebuilds: number }>;
	dispose(): void;
}

const NONE = 0x7fffffff;
const QUAD_FLOATS = 12;
const UV_FLOATS = 8;

/**
 * One floor mesh holding a quad per chunk slot (the slot index of ChunkSystem.slots) plus one thin-instance
 * mesh per prop type. Buffers are written only when a slot's chunk changes or the origin moves, never per frame.
 */
export function createChunkRenderer(
	game: GameScene,
	chunks: ChunkSystem,
	config: ChunkRendererConfig,
	propTypes: readonly PropTypeDef[],
): ChunkRenderer {
	const { scene } = game;
	const slotCount = chunks.slots.length;
	const size = config.chunkSize;
	scene.getMeshByName("ground")?.setEnabled(false);

	const positions = new Float32Array(slotCount * QUAD_FLOATS);
	const uvs = new Float32Array(slotCount * UV_FLOATS);
	const normals = new Float32Array(slotCount * QUAD_FLOATS);
	const indices = new Uint16Array(slotCount * 6);
	for (let i = 0; i < slotCount; i++) {
		for (let v = 0; v < 4; v++) normals[i * QUAD_FLOATS + v * 3 + 1] = 1;
		const b = i * 4;
		indices.set([b, b + 3, b + 2, b, b + 2, b + 1], i * 6);
	}
	const positionViews: Float32Array[] = [];
	const uvViews: Float32Array[] = [];
	for (let i = 0; i < slotCount; i++) {
		positionViews.push(positions.subarray(i * QUAD_FLOATS, (i + 1) * QUAD_FLOATS));
		uvViews.push(uvs.subarray(i * UV_FLOATS, (i + 1) * UV_FLOATS));
	}

	const floor = new Mesh("chunk_floor", scene);
	const vertexData = new VertexData();
	vertexData.positions = positions;
	vertexData.normals = normals;
	vertexData.uvs = uvs;
	vertexData.indices = indices;
	vertexData.applyToMesh(floor, true);
	floor.alwaysSelectAsActiveMesh = true;
	const floorMaterial = new StandardMaterial("chunk_floor", scene);
	floorMaterial.diffuseTexture = createPlaceholderTerrain(scene);
	floorMaterial.specularColor = Color3.Black();
	floorMaterial.backFaceCulling = false;
	floorMaterial.freeze();
	floor.material = floorMaterial;

	const capacity = slotCount * config.maxPropsPerChunk;
	const propMeshes: Mesh[] = [];
	const propBuffers: Float32Array[] = [];
	const propCounts = new Int32Array(propTypes.length);
	propTypes.forEach((def, t) => {
		const mesh = CreateBox(
			def.name,
			{ width: def.size[0], height: def.size[1], depth: def.size[2] },
			scene,
		);
		mesh.material = flatMaterial(scene, def.name, PALETTE[def.color]);
		mesh.alwaysSelectAsActiveMesh = true;
		const buffer = new Float32Array(capacity * 16);
		for (let i = 0; i < capacity; i++) {
			const o = i * 16;
			buffer[o] = buffer[o + 5] = buffer[o + 10] = buffer[o + 15] = 1;
			buffer[o + 13] = def.size[1] / 2;
		}
		mesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
		mesh.thinInstanceCount = 0;
		propMeshes[t] = mesh;
		propBuffers[t] = buffer;
	});

	const shown = new Array<unknown>(slotCount).fill(null);
	const shownCx = new Int32Array(slotCount).fill(NONE);
	const shownCz = new Int32Array(slotCount).fill(NONE);
	const dirty = new Uint8Array(slotCount);
	let originX = Number.NaN;
	let originZ = Number.NaN;
	const stats = { floorWrites: 0, propRebuilds: 0 };

	const u0 = (variant: number): number =>
		(variant * TERRAIN_TILE + 0.5) / (TERRAIN_TILE * TERRAIN_VARIANTS);
	const u1 = (variant: number): number =>
		((variant + 1) * TERRAIN_TILE - 0.5) / (TERRAIN_TILE * TERRAIN_VARIANTS);

	function writeQuad(i: number): void {
		const chunk = chunks.slots[i] ?? null;
		const p = i * QUAD_FLOATS;
		const q = i * UV_FLOATS;
		if (!chunk) {
			positions.fill(0, p, p + QUAD_FLOATS);
			return;
		}
		const x0 = chunk.cx * size - originX;
		const z0 = chunk.cz * size - originZ;
		const x1 = x0 + size;
		const z1 = z0 + size;
		positions[p] = x0;
		positions[p + 2] = z0;
		positions[p + 3] = x1;
		positions[p + 5] = z0;
		positions[p + 6] = x1;
		positions[p + 8] = z1;
		positions[p + 9] = x0;
		positions[p + 11] = z1;
		for (let v = 0; v < 4; v++) positions[p + v * 3 + 1] = 0;
		const variant = chunk.floorVariant % TERRAIN_VARIANTS;
		const a = u0(variant);
		const b = u1(variant);
		uvs[q] = a;
		uvs[q + 1] = 0.99;
		uvs[q + 2] = b;
		uvs[q + 3] = 0.99;
		uvs[q + 4] = b;
		uvs[q + 5] = 0.01;
		uvs[q + 6] = a;
		uvs[q + 7] = 0.01;
	}

	function rebuildProps(): void {
		propCounts.fill(0);
		for (let i = 0; i < slotCount; i++) {
			const chunk = chunks.slots[i];
			if (!chunk) continue;
			const baseX = chunk.cx * size - originX;
			const baseZ = chunk.cz * size - originZ;
			for (let p = 0; p < chunk.propCount; p++) {
				const t = chunk.propType[p] ?? 0;
				const buffer = propBuffers[t];
				if (!buffer) continue;
				const n = propCounts[t] ?? 0;
				propCounts[t] = n + 1;
				buffer[n * 16 + 12] = baseX + (chunk.propX[p] ?? 0);
				buffer[n * 16 + 14] = baseZ + (chunk.propZ[p] ?? 0);
			}
		}
		propMeshes.forEach((mesh, t) => {
			mesh.thinInstanceCount = propCounts[t] ?? 0;
			mesh.thinInstanceBufferUpdated("matrix");
		});
		stats.propRebuilds++;
	}

	return {
		update(newOriginX, newOriginZ): void {
			const moved = newOriginX !== originX || newOriginZ !== originZ;
			originX = newOriginX;
			originZ = newOriginZ;
			let changed = moved;
			for (let i = 0; i < slotCount; i++) {
				const chunk = chunks.slots[i] ?? null;
				const cx = chunk ? chunk.cx : NONE;
				const cz = chunk ? chunk.cz : NONE;
				if (chunk !== shown[i] || cx !== shownCx[i] || cz !== shownCz[i] || moved) {
					shown[i] = chunk;
					shownCx[i] = cx;
					shownCz[i] = cz;
					writeQuad(i);
					dirty[i] = 1;
					changed = true;
				}
			}
			if (!changed) return;
			const positionBuffer = floor.getVertexBuffer(VertexBuffer.PositionKind);
			const uvBuffer = floor.getVertexBuffer(VertexBuffer.UVKind);
			for (let i = 0; i < slotCount; i++) {
				if (!dirty[i]) continue;
				dirty[i] = 0;
				const pv = positionViews[i];
				const uv = uvViews[i];
				if (pv) positionBuffer?.updateDirectly(pv, i * QUAD_FLOATS);
				if (uv) uvBuffer?.updateDirectly(uv, i * UV_FLOATS);
				stats.floorWrites++;
			}
			rebuildProps();
		},
		instances: (type) => ({
			buffer: propBuffers[type] ?? new Float32Array(0),
			count: propCounts[type] ?? 0,
		}),
		stats,
		dispose(): void {
			floor.dispose();
			for (const mesh of propMeshes) mesh.dispose();
		},
	};
}
