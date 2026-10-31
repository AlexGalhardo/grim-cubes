import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, type InstanceSet } from "./instances";

export interface Zones {
	/** A mud pool (the Matriarch mud_pool pattern): a flat disc at (x, z) that fades over its last second. */
	pool(x: number, z: number, radius: number, seconds: number): void;
	/** A shockwave ring (the Matriarch scream pattern): expands from the centre to `radius` in `seconds`. */
	ring(x: number, z: number, radius: number, seconds: number): void;
	/** A dark shockwave ring (the flash-reduced execution): same motion as `ring`, no bright flash. */
	wave(x: number, z: number, radius: number, seconds: number): void;
	/** A ground warning that grows from the centre to `radius` and turns opaque as `seconds` run out (leap, bomb). */
	warn(x: number, z: number, radius: number, seconds: number): void;
	update(dtSeconds: number): void;
	shift(dx: number, dz: number): void;
	readonly poolsLive: number;
	readonly ringsLive: number;
	readonly warnsLive: number;
	readonly wavesLive: number;
}

const POOL_CAPACITY = 8;
const RING_CAPACITY = 4;
const WARN_CAPACITY = 12;
const WARN_MIN_SCALE = 0.25;
const WARN_MIN_ALPHA = 0.2;
const WARN_MAX_ALPHA = 0.6;
const RING_SECONDS_DEFAULT = 0.6;
const FADE_SECONDS = 1;
const POOL_ALPHA = 0.7;
const LAYER = 0.02;
const RING_LAYER = 0.15;

interface Slots {
	x: Float32Array;
	z: Float32Array;
	radius: Float32Array;
	total: Float32Array;
	left: Float32Array;
}

const slots = (n: number): Slots => ({
	x: new Float32Array(n),
	z: new Float32Array(n),
	radius: new Float32Array(n),
	total: new Float32Array(n),
	left: new Float32Array(n),
});

function emissive(game: GameScene, name: string, hex: string, backFace: boolean): StandardMaterial {
	const material = new StandardMaterial(name, game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(hex);
	material.diffuseColor = Color3.Black();
	material.backFaceCulling = backFace;
	return material;
}

/** Ground zones the bosses leave behind: mud pools and expanding scream rings, one thin-instance mesh each. */
export function createZones(game: GameScene): Zones {
	const poolMesh = CreateDisc("vfx_mud", { radius: 1, tessellation: 24 }, game.scene);
	// Discs are built upright (XY plane); lay it on the ground. Symmetric, so the facing does not matter.
	poolMesh.rotation.x = Math.PI / 2;
	poolMesh.bakeCurrentTransformIntoVertices();
	const poolMaterial = emissive(game, "vfx_mud", PALETTE.mud, false);
	poolMaterial.zOffset = -2;
	poolMesh.material = poolMaterial;
	const pools = createInstanceSet(poolMesh, POOL_CAPACITY, true);
	const ringMesh = CreateTorus(
		"vfx_scream",
		{ diameter: 2, thickness: 0.12, tessellation: 24 },
		game.scene,
	);
	ringMesh.material = emissive(game, "vfx_scream", PALETTE.emberLight, true);
	const rings = createInstanceSet(ringMesh, RING_CAPACITY, true);
	const warnMesh = CreateDisc("vfx_warn", { radius: 1, tessellation: 24 }, game.scene);
	warnMesh.rotation.x = Math.PI / 2;
	warnMesh.bakeCurrentTransformIntoVertices();
	const warnMaterial = emissive(game, "vfx_warn", PALETTE.bloodLight, false);
	warnMaterial.zOffset = -3;
	warnMesh.material = warnMaterial;
	const warns = createInstanceSet(warnMesh, WARN_CAPACITY, true);
	const warn = slots(WARN_CAPACITY);
	let warnCount = 0;
	const waveMesh = CreateTorus("vfx_wave", { diameter: 2, thickness: 0.2, tessellation: 24 }, game.scene);
	waveMesh.material = emissive(game, "vfx_wave", PALETTE.mist, true);
	const waveSet = createInstanceSet(waveMesh, RING_CAPACITY, true);
	const waveSlots = slots(RING_CAPACITY);
	let waveCount = 0;
	const pool = slots(POOL_CAPACITY);
	const ring = slots(RING_CAPACITY);
	let poolCount = 0;
	let ringCount = 0;

	function add(
		s: Slots,
		count: number,
		capacity: number,
		x: number,
		z: number,
		radius: number,
		seconds: number,
	): number {
		if (count >= capacity) return count;
		s.x[count] = x;
		s.z[count] = z;
		s.radius[count] = radius;
		s.total[count] = s.left[count] = Math.max(seconds, 0.05);
		return count + 1;
	}

	function age(s: Slots, count: number, dt: number): number {
		let n = 0;
		for (let i = 0; i < count; i++) {
			const left = (s.left[i] ?? 0) - dt;
			if (left <= 0) continue;
			s.x[n] = s.x[i] ?? 0;
			s.z[n] = s.z[i] ?? 0;
			s.radius[n] = s.radius[i] ?? 0;
			s.total[n] = s.total[i] ?? 0;
			s.left[n] = left;
			n++;
		}
		return n;
	}

	function write(
		set: InstanceSet,
		s: Slots,
		count: number,
		y: number,
		scaleOf: (i: number) => number,
		alphaOf: (i: number) => number,
	): void {
		for (let i = 0; i < count; i++) {
			const o = i * 16;
			const scale = scaleOf(i);
			set.matrices[o] = set.matrices[o + 5] = set.matrices[o + 10] = scale;
			set.matrices[o + 12] = s.x[i] ?? 0;
			set.matrices[o + 13] = y;
			set.matrices[o + 14] = s.z[i] ?? 0;
			const colors = set.colors;
			if (colors) {
				colors[i * 4] = colors[i * 4 + 1] = colors[i * 4 + 2] = 1;
				colors[i * 4 + 3] = alphaOf(i);
			}
		}
		set.commit(count);
	}

	return {
		get poolsLive(): number {
			return poolCount;
		},
		get ringsLive(): number {
			return ringCount;
		},
		get wavesLive(): number {
			return waveCount;
		},
		wave(x, z, radius, seconds): void {
			waveCount = add(
				waveSlots,
				waveCount,
				RING_CAPACITY,
				x,
				z,
				radius,
				seconds > 0 ? seconds : RING_SECONDS_DEFAULT,
			);
		},
		get warnsLive(): number {
			return warnCount;
		},
		warn(x, z, radius, seconds): void {
			warnCount = add(warn, warnCount, WARN_CAPACITY, x, z, radius, seconds);
		},
		pool(x, z, radius, seconds): void {
			poolCount = add(pool, poolCount, POOL_CAPACITY, x, z, radius, seconds);
		},
		ring(x, z, radius, seconds): void {
			ringCount = add(
				ring,
				ringCount,
				RING_CAPACITY,
				x,
				z,
				radius,
				seconds > 0 ? seconds : RING_SECONDS_DEFAULT,
			);
		},
		update(dt): void {
			poolCount = age(pool, poolCount, dt);
			ringCount = age(ring, ringCount, dt);
			warnCount = age(warn, warnCount, dt);
			waveCount = age(waveSlots, waveCount, dt);
			write(
				waveSet,
				waveSlots,
				waveCount,
				RING_LAYER,
				(i) =>
					(waveSlots.radius[i] ?? 1) * (1 - (waveSlots.left[i] ?? 0) / (waveSlots.total[i] ?? 1)),
				(i) => (waveSlots.left[i] ?? 0) / (waveSlots.total[i] ?? 1),
			);
			write(
				pools,
				pool,
				poolCount,
				LAYER,
				(i) => pool.radius[i] ?? 1,
				(i) => POOL_ALPHA * Math.min(1, (pool.left[i] ?? 0) / FADE_SECONDS),
			);
			write(
				rings,
				ring,
				ringCount,
				RING_LAYER,
				(i) => (ring.radius[i] ?? 1) * (1 - (ring.left[i] ?? 0) / (ring.total[i] ?? 1)),
				(i) => (ring.left[i] ?? 0) / (ring.total[i] ?? 1),
			);
			const progress = (i: number): number => 1 - (warn.left[i] ?? 0) / (warn.total[i] ?? 1);
			write(
				warns,
				warn,
				warnCount,
				LAYER + 0.01,
				(i) => (warn.radius[i] ?? 1) * (WARN_MIN_SCALE + (1 - WARN_MIN_SCALE) * progress(i)),
				(i) => WARN_MIN_ALPHA + (WARN_MAX_ALPHA - WARN_MIN_ALPHA) * progress(i),
			);
		},
		shift(dx, dz): void {
			for (let i = 0; i < waveCount; i++) {
				waveSlots.x[i] = (waveSlots.x[i] ?? 0) - dx;
				waveSlots.z[i] = (waveSlots.z[i] ?? 0) - dz;
			}
			for (let i = 0; i < warnCount; i++) {
				warn.x[i] = (warn.x[i] ?? 0) - dx;
				warn.z[i] = (warn.z[i] ?? 0) - dz;
			}
			for (let i = 0; i < poolCount; i++) {
				pool.x[i] = (pool.x[i] ?? 0) - dx;
				pool.z[i] = (pool.z[i] ?? 0) - dz;
			}
			for (let i = 0; i < ringCount; i++) {
				ring.x[i] = (ring.x[i] ?? 0) - dx;
				ring.z[i] = (ring.z[i] ?? 0) - dz;
			}
		},
	};
}
