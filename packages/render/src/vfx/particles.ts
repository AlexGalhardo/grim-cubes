import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface ParticlePoolStats {
	/** Particles alive now. */
	live: number;
	/** Highest `live` seen. */
	peak: number;
	/** Spawns refused because the pool was full. */
	dropped: number;
}

export interface ParticlePool {
	/** Returns false when the pool is full (the particle is dropped, never queued). */
	add(
		x: number,
		y: number,
		z: number,
		vx: number,
		vy: number,
		vz: number,
		size: number,
		r: number,
		g: number,
		b: number,
		lifeSeconds: number,
		/** Called once when the particle first touches the floor. */
		landsAsDecal: boolean,
	): boolean;
	update(dtSeconds: number): void;
	/** The world origin moved by (dx, dz). */
	shift(dx: number, dz: number): void;
	clear(): void;
	readonly capacity: number;
	readonly stats: Readonly<ParticlePoolStats>;
}

/**
 * Cube particles as thin instances of one box mesh: CPU physics on structure-of-arrays buffers (gravity, floor
 * contact, fade over the last third of the life), swap-remove on expiry. Nothing is allocated after creation.
 */
export function createParticlePool(
	scene: Scene,
	capacity: number,
	gravity: number,
	onLanded: (x: number, z: number) => void,
): ParticlePool {
	const mesh = CreateBox("vfx_particles", { size: 1 }, scene);
	const material = new StandardMaterial("vfx_particles", scene);
	material.specularColor = Color3.Black();
	mesh.material = material;
	const set = createInstanceSet(mesh, capacity, true);

	const px = new Float32Array(capacity);
	const py = new Float32Array(capacity);
	const pz = new Float32Array(capacity);
	const vx = new Float32Array(capacity);
	const vy = new Float32Array(capacity);
	const vz = new Float32Array(capacity);
	const size = new Float32Array(capacity);
	const age = new Float32Array(capacity);
	const life = new Float32Array(capacity);
	const spin = new Float32Array(capacity);
	const rgb = new Float32Array(capacity * 3);
	const landed = new Uint8Array(capacity);
	const decalOnLand = new Uint8Array(capacity);
	let live = 0;
	const stats: ParticlePoolStats = { live: 0, peak: 0, dropped: 0 };

	function remove(i: number): void {
		const last = --live;
		if (i === last) return;
		px[i] = px[last] ?? 0;
		py[i] = py[last] ?? 0;
		pz[i] = pz[last] ?? 0;
		vx[i] = vx[last] ?? 0;
		vy[i] = vy[last] ?? 0;
		vz[i] = vz[last] ?? 0;
		size[i] = size[last] ?? 0;
		age[i] = age[last] ?? 0;
		life[i] = life[last] ?? 0;
		spin[i] = spin[last] ?? 0;
		landed[i] = landed[last] ?? 0;
		decalOnLand[i] = decalOnLand[last] ?? 0;
		rgb[i * 3] = rgb[last * 3] ?? 0;
		rgb[i * 3 + 1] = rgb[last * 3 + 1] ?? 0;
		rgb[i * 3 + 2] = rgb[last * 3 + 2] ?? 0;
	}

	return {
		capacity,
		stats,
		add(x, y, z, dx, dy, dz, s, r, g, b, lifeSeconds, landsAsDecal): boolean {
			if (live >= capacity) {
				stats.dropped++;
				return false;
			}
			const i = live++;
			px[i] = x;
			py[i] = y;
			pz[i] = z;
			vx[i] = dx;
			vy[i] = dy;
			vz[i] = dz;
			size[i] = s;
			age[i] = 0;
			life[i] = lifeSeconds;
			spin[i] = (dx + dz) * 3;
			rgb[i * 3] = r;
			rgb[i * 3 + 1] = g;
			rgb[i * 3 + 2] = b;
			landed[i] = 0;
			decalOnLand[i] = landsAsDecal ? 1 : 0;
			stats.live = live;
			if (live > stats.peak) stats.peak = live;
			return true;
		},
		update(dt): void {
			for (let i = 0; i < live; ) {
				age[i] = (age[i] ?? 0) + dt;
				if ((age[i] ?? 0) >= (life[i] ?? 0)) {
					remove(i);
					continue;
				}
				if (!landed[i]) {
					vy[i] = (vy[i] ?? 0) - gravity * dt;
					px[i] = (px[i] ?? 0) + (vx[i] ?? 0) * dt;
					py[i] = (py[i] ?? 0) + (vy[i] ?? 0) * dt;
					pz[i] = (pz[i] ?? 0) + (vz[i] ?? 0) * dt;
					const half = (size[i] ?? 0) / 2;
					if ((py[i] ?? 0) <= half) {
						py[i] = half;
						landed[i] = 1;
						if (decalOnLand[i]) onLanded(px[i] ?? 0, pz[i] ?? 0);
					}
				}
				i++;
			}
			stats.live = live;
			const colors = set.colors;
			for (let i = 0; i < live; i++) {
				const remaining = 1 - (age[i] ?? 0) / (life[i] ?? 1);
				writeTransform(
					set.matrices,
					i,
					px[i] ?? 0,
					py[i] ?? 0,
					pz[i] ?? 0,
					size[i] ?? 0,
					(age[i] ?? 0) * (spin[i] ?? 0),
				);
				if (colors) {
					colors[i * 4] = rgb[i * 3] ?? 1;
					colors[i * 4 + 1] = rgb[i * 3 + 1] ?? 1;
					colors[i * 4 + 2] = rgb[i * 3 + 2] ?? 1;
					colors[i * 4 + 3] = Math.min(1, remaining * 3);
				}
			}
			set.commit(live);
		},
		shift(dx, dz): void {
			for (let i = 0; i < live; i++) {
				px[i] = (px[i] ?? 0) - dx;
				pz[i] = (pz[i] ?? 0) - dz;
			}
		},
		clear(): void {
			live = 0;
			stats.live = 0;
			set.commit(0);
		},
	};
}
