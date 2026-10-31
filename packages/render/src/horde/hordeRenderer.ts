import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { type GameWorld, HitFlash, Position, PrevPosition, queryEnemies } from "@gc/game";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { LoadedVat } from "../vat/loader";

export interface HordeType {
	/**
	 * Base mesh with skin weights (JOINTS_0/WEIGHTS_0), one per enemy type. Keep it parented to the `__root__` the
	 * glTF loader creates: that node carries the handedness conversion, and the baked matrices live in glTF space.
	 */
	mesh: Mesh;
	vat: LoadedVat;
}

export interface HordeOptions {
	/** Live instances per type: the spawn cap plus slack. */
	capacity: number;
	/** Simultaneous death animations per type (corpses outlive the entity). */
	ghostCapacity: number;
	/** Maps an entity to its index in the `types` array (EnemyType component, S2). */
	enemyType(eid: number): number;
	/** Seconds since the previous call; defaults to the engine delta. */
	deltaSeconds(): number;
}

export interface HordeRenderer {
	sync(world: GameWorld, alpha: number): void;
	/** The entity died this step: play its death clip on a render-owned ghost. */
	onDied(eid: number): void;
	/** The world origin moved by (dx, dz): ghosts are not ECS bodies, so they shift here. */
	shift(dx: number, dz: number): void;
	readonly stats: Readonly<{ matrixUpdates: number; settingsUpdates: number; ghosts: number }>;
	dispose(): void;
}

const SETTINGS_KIND = "bakedVertexAnimationSettingsInstanced";
const STATE_NONE = 0;
const STATE_WALK = 1;
const STATE_HIT = 2;
const MAX_ENTITIES = 4096;

/** Shader frame phase: choose `offset` so the clip is at its first frame at clock `time` (see Babylon bakedVertexAnimation). */
export function startOffset(time: number, speed: number, totalFrames: number): number {
	const t = (time * speed) / totalFrames;
	const numFrames = totalFrames - (t < 1 ? 0 : 1);
	const phase = (t - Math.floor(t)) * numFrames;
	// +0.01 keeps floor() on the intended frame despite float error.
	return ((numFrames - phase) % numFrames) + 0.01;
}

export function createHordeRenderer(types: readonly HordeType[], options: HordeOptions): HordeRenderer {
	const { capacity, ghostCapacity } = options;
	const total = capacity + ghostCapacity;
	const matrices: Float32Array[] = [];
	const settings: Float32Array[] = [];
	const counts = new Int32Array(types.length);
	types.forEach((type, t) => {
		const m = new Float32Array(total * 16);
		for (let i = 0; i < total; i++) m[i * 16] = m[i * 16 + 5] = m[i * 16 + 10] = m[i * 16 + 15] = 1;
		const s = new Float32Array(total * 4);
		type.mesh.bakedVertexAnimationManager = type.vat.manager;
		type.mesh.alwaysSelectAsActiveMesh = true;
		type.mesh.thinInstanceSetBuffer("matrix", m, 16, false);
		type.mesh.thinInstanceSetBuffer(SETTINGS_KIND, s, 4, false);
		type.mesh.thinInstanceCount = 0;
		matrices[t] = m;
		settings[t] = s;
	});

	const state = new Uint8Array(MAX_ENTITIES);
	const offset = new Float32Array(MAX_ENTITIES);
	/** Entities seen as enemies in the last sync; a Died event for anything else (the hero) is ignored. */
	const seen = new Uint8Array(MAX_ENTITIES);
	let clock = 0;

	// Ghost pool, flat arrays so a death allocates nothing.
	const ghostSlots = types.length * ghostCapacity;
	const ghostActive = new Uint8Array(ghostSlots);
	const ghostX = new Float32Array(ghostSlots);
	const ghostZ = new Float32Array(ghostSlots);
	const ghostStart = new Float32Array(ghostSlots);
	const ghostOffset = new Float32Array(ghostSlots);
	let ghostCount = 0;
	const stats = { matrixUpdates: 0, settingsUpdates: 0, ghosts: 0 };

	function clipOf(t: number, name: string): { from: number; to: number; fps: number } {
		const vat = types[t]?.vat;
		const range = vat?.meta.clips[name];
		if (!vat || !range) throw new Error(`Horde type ${t} lacks VAT clip "${name}"`);
		return { from: range.from, to: range.to, fps: vat.meta.fps };
	}

	function write(t: number, n: number, x: number, z: number, clip: string, off: number): void {
		const m = matrices[t];
		const s = settings[t];
		const type = types[t];
		if (!m || !s || !type) return;
		const range = type.vat.meta.clips[clip];
		if (!range) return;
		m[n * 16 + 12] = x;
		m[n * 16 + 14] = z;
		s[n * 4] = range.from;
		s[n * 4 + 1] = range.to;
		s[n * 4 + 2] = off;
		s[n * 4 + 3] = type.vat.meta.fps;
	}

	function enter(eid: number, t: number, next: number): void {
		const type = types[t];
		if (!type) return;
		const clip = next === STATE_HIT ? clipOf(t, "hit") : clipOf(t, "walk");
		const frames = clip.to - clip.from + 1;
		state[eid] = next;
		offset[eid] =
			next === STATE_HIT
				? startOffset(type.vat.manager.time, clip.fps, frames)
				: // Walkers desynchronise by entity so a horde does not march in lockstep.
					(eid * 7) % frames;
	}

	return {
		sync(world, alpha): void {
			const dt = options.deltaSeconds();
			clock += dt;
			for (const type of types) type.vat.manager.time += dt;
			counts.fill(0);
			const enemies = queryEnemies(world);
			for (let k = 0; k < enemies.length; k++) {
				const eid = enemies[k] ?? 0;
				const t = options.enemyType(eid);
				const n = counts[t] ?? capacity;
				if (n >= capacity) continue;
				counts[t] = n + 1;
				seen[eid] = 1;
				const next = (HitFlash.ticks[eid] ?? 0) > 0 ? STATE_HIT : STATE_WALK;
				if (state[eid] !== next) enter(eid, t, next);
				const px = PrevPosition.x[eid] ?? 0;
				const pz = PrevPosition.z[eid] ?? 0;
				write(
					t,
					n,
					px + ((Position.x[eid] ?? 0) - px) * alpha,
					pz + ((Position.z[eid] ?? 0) - pz) * alpha,
					next === STATE_HIT ? "hit" : "walk",
					offset[eid] ?? 0,
				);
			}

			for (let t = 0; t < types.length; t++) {
				for (let g = 0; g < ghostCapacity; g++) {
					const slot = t * ghostCapacity + g;
					if (!ghostActive[slot]) continue;
					const clip = clipOf(t, "death");
					if (clock - (ghostStart[slot] ?? 0) >= (clip.to - clip.from + 1) / clip.fps) {
						ghostActive[slot] = 0;
						ghostCount--;
						continue;
					}
					const n = counts[t] ?? 0;
					counts[t] = n + 1;
					write(t, n, ghostX[slot] ?? 0, ghostZ[slot] ?? 0, "death", ghostOffset[slot] ?? 0);
				}
			}
			stats.ghosts = ghostCount;

			for (let t = 0; t < types.length; t++) {
				const mesh = types[t]?.mesh;
				if (!mesh) continue;
				mesh.thinInstanceCount = counts[t] ?? 0;
				mesh.thinInstanceBufferUpdated("matrix");
				mesh.thinInstanceBufferUpdated(SETTINGS_KIND);
				stats.matrixUpdates++;
				stats.settingsUpdates++;
			}
		},

		onDied(eid): void {
			if (!seen[eid]) return;
			seen[eid] = 0;
			const t = options.enemyType(eid);
			state[eid] = STATE_NONE;
			const type = types[t];
			if (!type) return;
			for (let g = 0; g < ghostCapacity; g++) {
				const slot = t * ghostCapacity + g;
				if (ghostActive[slot]) continue;
				const clip = clipOf(t, "death");
				ghostActive[slot] = 1;
				ghostCount++;
				ghostX[slot] = Position.x[eid] ?? 0;
				ghostZ[slot] = Position.z[eid] ?? 0;
				ghostStart[slot] = clock;
				ghostOffset[slot] = startOffset(type.vat.manager.time, clip.fps, clip.to - clip.from + 1);
				return;
			}
		},

		shift(dx, dz): void {
			for (let slot = 0; slot < ghostSlots; slot++) {
				if (!ghostActive[slot]) continue;
				ghostX[slot] = (ghostX[slot] ?? 0) - dx;
				ghostZ[slot] = (ghostZ[slot] ?? 0) - dz;
			}
		},

		stats,

		dispose(): void {
			for (const type of types) type.mesh.dispose();
		},
	};
}
