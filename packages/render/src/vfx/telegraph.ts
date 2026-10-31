import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Position } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, type InstanceSet } from "./instances";

export interface Telegraph {
	/** A warning line from `entity` along (dirX, dirZ), `length` u long and `width` u wide, for `seconds`. */
	line(entity: number, dirX: number, dirZ: number, seconds: number, length: number, width: number): void;
	/** A 120 degree sector of radius `range` centred on (dirX, dirZ), anchored on `entity`, for `seconds`. */
	arc(entity: number, dirX: number, dirZ: number, seconds: number, range: number): void;
	/** Drops the warnings of `entity` (it died; its id may be recycled by another entity). */
	cancel(entity: number): void;
	update(dtSeconds: number): void;
	readonly live: number;
}

const LINE_CAPACITY = 16;
const ARC_CAPACITY = 4;
const ARC_HALF_ANGLE = Math.PI / 3;
const ARC_SEGMENTS = 12;
const LAYER = 0.03;
const MIN_ALPHA = 0.15;
const MAX_ALPHA = 0.6;

function fanMesh(scene: GameScene["scene"]): Mesh {
	const mesh = new Mesh("vfx_telegraph_arc", scene);
	const positions = new Float32Array((ARC_SEGMENTS + 2) * 3);
	const indices = new Uint32Array(ARC_SEGMENTS * 3);
	for (let i = 0; i <= ARC_SEGMENTS; i++) {
		const angle = -ARC_HALF_ANGLE + (2 * ARC_HALF_ANGLE * i) / ARC_SEGMENTS;
		positions[(i + 1) * 3] = Math.sin(angle);
		positions[(i + 1) * 3 + 2] = Math.cos(angle);
	}
	for (let i = 0; i < ARC_SEGMENTS; i++) {
		indices[i * 3] = 0;
		indices[i * 3 + 1] = i + 2;
		indices[i * 3 + 2] = i + 1;
	}
	const data = new VertexData();
	data.positions = positions;
	data.indices = indices;
	data.normals = new Float32Array(positions.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0));
	data.applyToMesh(mesh);
	return mesh;
}

function flatMaterial(scene: GameScene["scene"], name: string, hex: string): StandardMaterial {
	const material = new StandardMaterial(name, scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(hex);
	material.diffuseColor = Color3.Black();
	material.backFaceCulling = false;
	material.zOffset = -3;
	return material;
}

/**
 * Ground warnings for incoming attacks (the Gravedigger's charge line and shovel arc, the Hunter's wind-up): flat
 * thin-instance quads that grow more opaque as the hit approaches. They follow the attacker's position.
 */
export function createTelegraph(game: GameScene): Telegraph {
	const lineMesh = CreateGround("vfx_telegraph_line", { width: 1, height: 1 }, game.scene);
	lineMesh.material = flatMaterial(game.scene, "vfx_telegraph_line", PALETTE.bloodLight);
	const lines = createInstanceSet(lineMesh, LINE_CAPACITY, true);
	const arcMesh = fanMesh(game.scene);
	arcMesh.material = flatMaterial(game.scene, "vfx_telegraph_arc", PALETTE.bloodLight);
	const arcs = createInstanceSet(arcMesh, ARC_CAPACITY, true);

	const slots = LINE_CAPACITY + ARC_CAPACITY;
	const entity = new Int32Array(slots).fill(-1);
	const dirX = new Float32Array(slots);
	const dirZ = new Float32Array(slots);
	const total = new Float32Array(slots);
	const left = new Float32Array(slots);
	const length = new Float32Array(slots);
	const width = new Float32Array(slots);
	let live = 0;

	function claim(from: number, to: number): number {
		for (let i = from; i < to; i++) if ((entity[i] ?? -1) < 0) return i;
		return -1;
	}

	function start(
		i: number,
		e: number,
		dx: number,
		dz: number,
		seconds: number,
		len: number,
		w: number,
	): void {
		entity[i] = e;
		dirX[i] = dx;
		dirZ[i] = dz;
		total[i] = left[i] = Math.max(seconds, 0.05);
		length[i] = len;
		width[i] = w;
	}

	function write(set: InstanceSet, n: number, i: number, sx: number, sz: number, offset: number): void {
		const e = entity[i] ?? 0;
		const yaw = Math.atan2(dirX[i] ?? 0, dirZ[i] ?? 1);
		const c = Math.cos(yaw);
		const s = Math.sin(yaw);
		const o = n * 16;
		const m = set.matrices;
		m[o] = c * sx;
		m[o + 2] = -s * sx;
		m[o + 5] = 1;
		m[o + 8] = s * sz;
		m[o + 10] = c * sz;
		m[o + 12] = (Position.x[e] ?? 0) + (dirX[i] ?? 0) * offset;
		m[o + 13] = LAYER;
		m[o + 14] = (Position.z[e] ?? 0) + (dirZ[i] ?? 0) * offset;
		const progress = 1 - (left[i] ?? 0) / (total[i] ?? 1);
		const colors = set.colors;
		if (colors) {
			colors[n * 4] = colors[n * 4 + 1] = colors[n * 4 + 2] = 1;
			colors[n * 4 + 3] = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * progress;
		}
	}

	return {
		get live(): number {
			return live;
		},
		line(e, dx, dz, seconds, len, w): void {
			const i = claim(0, LINE_CAPACITY);
			if (i >= 0) start(i, e, dx, dz, seconds, len, w);
		},
		arc(e, dx, dz, seconds, range): void {
			const i = claim(LINE_CAPACITY, slots);
			if (i >= 0) start(i, e, dx, dz, seconds, range, range);
		},
		cancel(e): void {
			for (let i = 0; i < slots; i++) if (entity[i] === e) entity[i] = -1;
		},
		update(dt): void {
			let nLines = 0;
			let nArcs = 0;
			live = 0;
			for (let i = 0; i < slots; i++) {
				if ((entity[i] ?? -1) < 0) continue;
				left[i] = (left[i] ?? 0) - dt;
				if ((left[i] ?? 0) <= 0) {
					entity[i] = -1;
					continue;
				}
				live++;
				if (i < LINE_CAPACITY)
					write(lines, nLines++, i, width[i] ?? 1, length[i] ?? 1, (length[i] ?? 0) / 2);
				else write(arcs, nArcs++, i, length[i] ?? 1, length[i] ?? 1, 0);
			}
			lines.commit(nLines);
			arcs.commit(nArcs);
		},
	};
}
