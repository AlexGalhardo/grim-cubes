import type { Camera } from "@babylonjs/core/Cameras/camera";
import { Material } from "@babylonjs/core/Materials/material";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
	Attacking,
	Boss,
	Elite,
	EnemyType,
	Facing,
	type GameWorld,
	HitFlash,
	Position,
	PrevPosition,
	queryEnemies,
	Velocity,
} from "@gc/game";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { toLoaderLocalX, toLoaderLocalYaw } from "../coords";
import type { LoadedVat } from "../vat/loader";
import { createFrustumCuller } from "./frustum";

export interface HordeType {
	/**
	 * Base mesh with skin weights (JOINTS_0/WEIGHTS_0), one per enemy type. Keep it parented to the `__root__` the
	 * glTF loader creates: that node carries the handedness conversion, and the baked matrices live in glTF space.
	 */
	mesh: Mesh;
	vat: LoadedVat;
	/** Speed (u/s) at which the walk clip was authored; playback speed scales with |velocity| / walkRefSpeed. */
	walkRefSpeed: number;
	/** Collision radius in u, widened by the elite or boss scale when culling. */
	radius?: number;
}

export interface HordeOptions {
	/** Live instances per type: the spawn cap plus slack. */
	capacity: number;
	/** Simultaneous death animations per type (corpses outlive the entity). */
	ghostCapacity: number;
	/** Seconds since the previous call; defaults to the engine delta. */
	deltaSeconds(): number;
	/**
	 * Instance colour multiplier of an enemy that was just hit (GDD §23: a white flash). Above 1 the texture burns
	 * towards white. Omit to leave the colour buffer out.
	 */
	flashBrightness?: number;
	/** Flash reduction (Options): the hit flash is not drawn. */
	flashReduced?: () => boolean;
	/**
	 * Elite look: instance scale for entities with `Elite` and a tint per modifier (`Elite.modifier` is 1-based, so
	 * `tints[modifier - 1]`). Needs the colour buffer, so it enables it like `flashBrightness`.
	 */
	/** Skip `Boss.id > 0` entities: a skeleton rig draws the boss instead. */
	skipBoss?: (bossId: number) => boolean;
	/** Enemies outside this camera's widened frustum are left out of the instance buffers (P-03-05). */
	cullCamera?: Camera;
	/** Vertical scale of an enemy in its hit clip (a squash that reads as a knockback shove); 1 = none. */
	hitSquash?: number;
	boss?: { scale: number; enrageTint: readonly [number, number, number] };
	elite?: { scale: number; tints: readonly (readonly [number, number, number])[] };
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
const STATE_WALK = 0;
const STATE_HIT = 1;
const STATE_ATTACK = 2;
const CLIP_NAMES = ["walk", "hit", "attack", "death"] as const;
const CLIP_WALK = 0;
const CLIP_HIT = 1;
const CLIP_ATTACK = 2;
const CLIP_DEATH = 3;
const MAX_ENTITIES = 4096;
const DEFAULT_RADIUS = 0.6;
/** Keeps floor() on the intended frame despite float error when a frame index is passed as the offset. */
const FRAME_EPSILON = 0.01;

export function createHordeRenderer(types: readonly HordeType[], options: HordeOptions): HordeRenderer {
	const { capacity, ghostCapacity } = options;
	const total = capacity + ghostCapacity;
	const matrices: Float32Array[] = [];
	const settings: Float32Array[] = [];
	const flashColors: Float32Array[] = [];
	const flashCompiled = new Uint8Array(types.length);
	const counts = new Int32Array(types.length);
	// Clip table per type: [from, to] for walk, hit, attack, death; resolved once so sync never looks up strings.
	const clipRange = new Float32Array(types.length * CLIP_NAMES.length * 2);
	const fps = new Float32Array(types.length);
	types.forEach((type, t) => {
		const m = new Float32Array(total * 16);
		for (let i = 0; i < total; i++) m[i * 16] = m[i * 16 + 5] = m[i * 16 + 10] = m[i * 16 + 15] = 1;
		const s = new Float32Array(total * 4);
		type.mesh.bakedVertexAnimationManager = type.vat.manager;
		type.mesh.alwaysSelectAsActiveMesh = true;
		type.mesh.thinInstanceSetBuffer("matrix", m, 16, false);
		type.mesh.thinInstanceSetBuffer(SETTINGS_KIND, s, 4, false);
		if (options.flashBrightness !== undefined || options.elite || options.boss) {
			const colors = new Float32Array(total * 4).fill(1);
			type.mesh.thinInstanceSetBuffer("color", colors, 4, false);
			flashColors[t] = colors;
		}
		type.mesh.thinInstanceCount = 0;
		matrices[t] = m;
		settings[t] = s;
		fps[t] = type.vat.meta.fps;
		CLIP_NAMES.forEach((name, k) => {
			const range = type.vat.meta.clips[name];
			if (!range) throw new Error(`Horde type ${t} lacks VAT clip "${name}"`);
			clipRange[(t * CLIP_NAMES.length + k) * 2] = range.from;
			clipRange[(t * CLIP_NAMES.length + k) * 2 + 1] = range.to;
		});
	});

	const culler = options.cullCamera ? createFrustumCuller(options.cullCamera) : null;
	const state = new Uint8Array(MAX_ENTITIES);
	const stateStart = new Float64Array(MAX_ENTITIES);
	const walkOffset = new Float32Array(MAX_ENTITIES);
	const hitEnd = new Float64Array(MAX_ENTITIES);
	const hitPrev = new Uint8Array(MAX_ENTITIES);
	/** Entities seen as enemies in the last sync; a Died event for anything else (the hero) is ignored. */
	const seen = new Uint8Array(MAX_ENTITIES);
	let clock = 0;

	// Ghost pool, flat arrays so a death allocates nothing.
	const ghostSlots = types.length * ghostCapacity;
	const ghostActive = new Uint8Array(ghostSlots);
	const ghostX = new Float32Array(ghostSlots);
	const ghostZ = new Float32Array(ghostSlots);
	const ghostYaw = new Float32Array(ghostSlots);
	const ghostStart = new Float64Array(ghostSlots);
	let ghostCount = 0;
	const stats = { matrixUpdates: 0, settingsUpdates: 0, ghosts: 0 };

	const from = (t: number, clip: number): number => clipRange[(t * CLIP_NAMES.length + clip) * 2] ?? 0;
	const to = (t: number, clip: number): number => clipRange[(t * CLIP_NAMES.length + clip) * 2 + 1] ?? 0;
	const frames = (t: number, clip: number): number => to(t, clip) - from(t, clip) + 1;
	const clipSeconds = (t: number, clip: number): number => frames(t, clip) / (fps[t] ?? 12);

	/**
	 * `x`/`z`/`yaw` are scene coordinates, conjugated here for the loader's mirrored `__root__` (see coords.ts).
	 * `speed` 0 pins the instance to the frame given by `offset`, which is how one-shot clips are played.
	 */
	function write(
		t: number,
		n: number,
		x: number,
		z: number,
		yaw: number,
		clip: number,
		offset: number,
		speed: number,
		scale = 1,
		squash = 1,
	): void {
		const m = matrices[t];
		const s = settings[t];
		if (!m || !s) return;
		// Rotation about Y: Facing.yaw 0 looks along +z, positive yaw turns towards +x.
		const local = toLoaderLocalYaw(yaw);
		const c = Math.cos(local);
		const s2 = Math.sin(local);
		m[n * 16] = c * scale;
		m[n * 16 + 2] = -s2 * scale;
		m[n * 16 + 5] = scale * squash;
		m[n * 16 + 8] = s2 * scale;
		m[n * 16 + 10] = c * scale;
		m[n * 16 + 12] = toLoaderLocalX(x);
		m[n * 16 + 14] = z;
		s[n * 4] = from(t, clip);
		s[n * 4 + 1] = to(t, clip);
		s[n * 4 + 2] = offset;
		s[n * 4 + 3] = speed;
	}

	/** One-shot clips ignore the shared clock: the frame is chosen here from the time since the clip started. */
	function oneShotFrame(t: number, clip: number, started: number): number {
		const frame = Math.min(frames(t, clip) - 1, Math.floor((clock - started) * (fps[t] ?? 12)));
		return frame + FRAME_EPSILON;
	}

	return {
		sync(world, alpha): void {
			const dt = options.deltaSeconds();
			clock += dt;
			for (const type of types) type.vat.manager.time += dt;
			counts.fill(0);
			const enemies = queryEnemies(world);
			culler?.update();
			for (let k = 0; k < enemies.length; k++) {
				const eid = enemies[k] ?? 0;
				if ((Boss.id[eid] ?? 0) > 0 && options.skipBoss?.(Boss.id[eid] ?? 0)) continue;
				const t = EnemyType.id[eid] ?? 0;
				if (culler) {
					const reach =
						(types[t]?.radius ?? DEFAULT_RADIUS) *
						((Boss.id[eid] ?? 0) > 0 && options.boss
							? options.boss.scale
							: (Elite.modifier[eid] ?? 0) > 0 && options.elite
								? options.elite.scale
								: 1);
					if (!culler.visible(Position.x[eid] ?? 0, Position.z[eid] ?? 0, reach)) continue;
				}
				const n = counts[t] ?? capacity;
				if (n >= capacity) continue;
				counts[t] = n + 1;
				seen[eid] = 1;

				// HitFlash lasts two steps, shorter than one VAT frame, so the hit clip runs on its own timer
				// started on the rising edge. Priority: hit > attack > walk.
				const flash = (HitFlash.ticks[eid] ?? 0) > 0 ? 1 : 0;
				if (flash && !hitPrev[eid]) hitEnd[eid] = clock + clipSeconds(t, CLIP_HIT);
				hitPrev[eid] = flash;
				const next =
					clock < (hitEnd[eid] ?? 0)
						? STATE_HIT
						: (Attacking.ticks[eid] ?? 0) > 0
							? STATE_ATTACK
							: STATE_WALK;
				if (state[eid] !== next) {
					state[eid] = next;
					stateStart[eid] = clock;
					// Walkers desynchronise by entity so a horde does not march in lockstep.
					if (next === STATE_WALK) walkOffset[eid] = (eid * 7) % frames(t, CLIP_WALK);
				}

				const px = PrevPosition.x[eid] ?? 0;
				const pz = PrevPosition.z[eid] ?? 0;
				const x = px + ((Position.x[eid] ?? 0) - px) * alpha;
				const z = pz + ((Position.z[eid] ?? 0) - pz) * alpha;
				const modifier = Elite.modifier[eid] ?? 0;
				const isBoss = options.boss !== undefined && (Boss.id[eid] ?? 0) > 0;
				const scale = isBoss
					? (options.boss?.scale ?? 1)
					: modifier > 0 && options.elite
						? options.elite.scale
						: 1;
				const colors = flashColors[t];
				if (colors) {
					const flashed =
						(HitFlash.ticks[eid] ?? 0) > 0 &&
						options.flashBrightness !== undefined &&
						!options.flashReduced?.();
					const tint =
						isBoss && (Boss.enrageStacks[eid] ?? 0) > 0
							? options.boss?.enrageTint
							: modifier > 0
								? options.elite?.tints[modifier - 1]
								: undefined;
					const level = flashed ? (options.flashBrightness ?? 1) : 1;
					colors[n * 4] = level * (tint?.[0] ?? 1);
					colors[n * 4 + 1] = level * (tint?.[1] ?? 1);
					colors[n * 4 + 2] = level * (tint?.[2] ?? 1);
				}
				const yaw = Facing.yaw[eid] ?? 0;
				if (next === STATE_WALK) {
					const speed =
						Math.hypot(Velocity.x[eid] ?? 0, Velocity.z[eid] ?? 0) /
						(types[t]?.walkRefSpeed || 1);
					write(t, n, x, z, yaw, CLIP_WALK, walkOffset[eid] ?? 0, (fps[t] ?? 12) * speed, scale, 1);
				} else {
					const clip = next === STATE_HIT ? CLIP_HIT : CLIP_ATTACK;
					write(
						t,
						n,
						x,
						z,
						yaw,
						clip,
						oneShotFrame(t, clip, stateStart[eid] ?? 0),
						0,
						scale,
						next === STATE_HIT ? (options.hitSquash ?? 1) : 1,
					);
				}
			}

			for (let t = 0; t < types.length; t++) {
				for (let g = 0; g < ghostCapacity; g++) {
					const slot = t * ghostCapacity + g;
					if (!ghostActive[slot]) continue;
					if (clock - (ghostStart[slot] ?? 0) >= clipSeconds(t, CLIP_DEATH)) {
						ghostActive[slot] = 0;
						ghostCount--;
						continue;
					}
					const n = counts[t] ?? 0;
					counts[t] = n + 1;
					write(
						t,
						n,
						ghostX[slot] ?? 0,
						ghostZ[slot] ?? 0,
						ghostYaw[slot] ?? 0,
						CLIP_DEATH,
						oneShotFrame(t, CLIP_DEATH, ghostStart[slot] ?? 0),
						0,
					);
				}
			}
			stats.ghosts = ghostCount;

			for (let t = 0; t < types.length; t++) {
				const mesh = types[t]?.mesh;
				if (!mesh) continue;
				mesh.thinInstanceCount = counts[t] ?? 0;
				mesh.setEnabled((counts[t] ?? 0) > 0);
				mesh.thinInstanceBufferUpdated("matrix");
				mesh.thinInstanceBufferUpdated(SETTINGS_KIND);
				if (flashColors[t]) {
					mesh.thinInstanceBufferUpdated("color");
					// INSTANCESCOLOR is only defined once the mesh has thin instances at compile time.
					if (!flashCompiled[t] && (counts[t] ?? 0) > 0) {
						flashCompiled[t] = 1;
						mesh.material?.markAsDirty(Material.AttributesDirtyFlag);
					}
				}
				stats.matrixUpdates++;
				stats.settingsUpdates++;
			}
		},

		onDied(eid): void {
			if (!seen[eid]) return;
			seen[eid] = 0;
			state[eid] = STATE_WALK;
			hitEnd[eid] = 0;
			hitPrev[eid] = 0;
			const t = EnemyType.id[eid] ?? 0;
			if (!types[t]) return;
			for (let g = 0; g < ghostCapacity; g++) {
				const slot = t * ghostCapacity + g;
				if (ghostActive[slot]) continue;
				ghostActive[slot] = 1;
				ghostCount++;
				ghostX[slot] = Position.x[eid] ?? 0;
				ghostZ[slot] = Position.z[eid] ?? 0;
				ghostYaw[slot] = Facing.yaw[eid] ?? 0;
				ghostStart[slot] = clock;
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
