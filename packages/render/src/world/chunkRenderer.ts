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
	/** Chebyshev radius around the hero chunk whose props are instanced; farther loaded chunks stay invisible. */
	loadRadius: number;
}

export interface ChunkRenderer {
	/** Call once per frame after `chunks.update`; origin and hero are in absolute world coordinates. */
	update(originX: number, originZ: number, heroX: number, heroZ: number): void;
	/** Matrix buffer and live instance count of a prop type (debug and tests). */
	instances(type: number): { buffer: Float32Array; count: number };
	readonly stats: Readonly<{ floorWrites: number; propRebuilds: number }>;
	dispose(): void;
}

const NONE = 0x7fffffff;
const QUAD_FLOATS = 12;
const UV_FLOATS = 8;

/** Allocation-free integer mix (murmur3 finaliser) of a cube's chunk coordinates, index and chunk variant. */
function cubeVariant(cx: number, cz: number, cube: number, salt: number): number {
	let h = Math.imul(cx, 0x85ebca6b) ^ Math.imul(cz, 0xc2b2ae35) ^ Math.imul(cube + 1, 0x27d4eb2f) ^ salt;
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return (h >>> 0) % TERRAIN_VARIANTS;
}

/**
 * One floor mesh holding one quad per cube (chunkSize x chunkSize quads) for every chunk slot (the slot index of
 * ChunkSystem.slots), plus one thin-instance mesh per prop type. Buffers are written only when a slot's chunk
 * changes or the origin moves, never per frame. Each cube picks its 32x32 tile variant by hash (Art Bible §5).
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

	const cubes = size * size;
	const quads = slotCount * cubes;
	const slotPositionFloats = cubes * QUAD_FLOATS;
	const slotUvFloats = cubes * UV_FLOATS;
	const positions = new Float32Array(quads * QUAD_FLOATS);
	const uvs = new Float32Array(quads * UV_FLOATS);
	const normals = new Float32Array(quads * QUAD_FLOATS);
	// 20k+ quads exceed 65535 vertices, so the index buffer is 32-bit.
	const indices = new Uint32Array(quads * 6);
	for (let q = 0; q < quads; q++) {
		for (let v = 0; v < 4; v++) normals[q * QUAD_FLOATS + v * 3 + 1] = 1;
		const b = q * 4;
		indices.set([b, b + 3, b + 2, b, b + 2, b + 1], q * 6);
	}
	const positionViews: Float32Array[] = [];
	const uvViews: Float32Array[] = [];
	for (let i = 0; i < slotCount; i++) {
		positionViews.push(positions.subarray(i * slotPositionFloats, (i + 1) * slotPositionFloats));
		uvViews.push(uvs.subarray(i * slotUvFloats, (i + 1) * slotUvFloats));
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
	const uvDirty = new Uint8Array(slotCount);
	let originX = Number.NaN;
	let originZ = Number.NaN;
	let heroCx = NONE;
	let heroCz = NONE;
	const stats = { floorWrites: 0, propRebuilds: 0 };

	const u0 = (variant: number): number =>
		(variant * TERRAIN_TILE + 0.5) / (TERRAIN_TILE * TERRAIN_VARIANTS);
	const u1 = (variant: number): number =>
		((variant + 1) * TERRAIN_TILE - 0.5) / (TERRAIN_TILE * TERRAIN_VARIANTS);

	function writeQuad(i: number): void {
		const chunk = chunks.slots[i] ?? null;
		const p = i * slotPositionFloats;
		if (!chunk) {
			positions.fill(0, p, p + slotPositionFloats);
			return;
		}
		const x0 = chunk.cx * size - originX;
		const z0 = chunk.cz * size - originZ;
		for (let cube = 0; cube < cubes; cube++) {
			const x = x0 + (cube % size);
			const z = z0 + Math.floor(cube / size);
			const o = p + cube * QUAD_FLOATS;
			positions[o] = x;
			positions[o + 2] = z;
			positions[o + 3] = x + 1;
			positions[o + 5] = z;
			positions[o + 6] = x + 1;
			positions[o + 8] = z + 1;
			positions[o + 9] = x;
			positions[o + 11] = z + 1;
		}
	}

	function writeUvs(i: number): void {
		const chunk = chunks.slots[i] ?? null;
		const q = i * slotUvFloats;
		if (!chunk) {
			uvs.fill(0, q, q + slotUvFloats);
			return;
		}
		for (let cube = 0; cube < cubes; cube++) {
			const variant = cubeVariant(chunk.cx, chunk.cz, cube, chunk.floorVariant);
			const a = u0(variant);
			const b = u1(variant);
			const o = q + cube * UV_FLOATS;
			uvs[o] = a;
			uvs[o + 1] = 0.99;
			uvs[o + 2] = b;
			uvs[o + 3] = 0.99;
			uvs[o + 4] = b;
			uvs[o + 5] = 0.01;
			uvs[o + 6] = a;
			uvs[o + 7] = 0.01;
		}
	}

	function rebuildProps(): void {
		propCounts.fill(0);
		for (let i = 0; i < slotCount; i++) {
			const chunk = chunks.slots[i];
			if (!chunk) continue;
			// Hysteresis chunks (distance beyond the load radius) stay loaded but invisible.
			if (Math.max(Math.abs(chunk.cx - heroCx), Math.abs(chunk.cz - heroCz)) > config.loadRadius)
				continue;
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
		update(newOriginX, newOriginZ, heroX, heroZ): void {
			const moved = newOriginX !== originX || newOriginZ !== originZ;
			originX = newOriginX;
			originZ = newOriginZ;
			const newCx = Math.floor(heroX / size);
			const newCz = Math.floor(heroZ / size);
			let changed = moved || newCx !== heroCx || newCz !== heroCz;
			heroCx = newCx;
			heroCz = newCz;
			for (let i = 0; i < slotCount; i++) {
				const chunk = chunks.slots[i] ?? null;
				const cx = chunk ? chunk.cx : NONE;
				const cz = chunk ? chunk.cz : NONE;
				const swapped = chunk !== shown[i] || cx !== shownCx[i] || cz !== shownCz[i];
				if (swapped) {
					shown[i] = chunk;
					shownCx[i] = cx;
					shownCz[i] = cz;
					writeUvs(i);
					uvDirty[i] = 1;
				}
				if (swapped || moved) {
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
				if (pv) positionBuffer?.updateDirectly(pv, i * slotPositionFloats);
				if (uvDirty[i]) {
					uvDirty[i] = 0;
					const uv = uvViews[i];
					if (uv) uvBuffer?.updateDirectly(uv, i * slotUvFloats);
				}
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
