import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { mulberry32 } from "@gc/core";
import { type RenderData, renderData } from "@gc/game";
import { paletteHex } from "../scene/palette";
import { createInstanceSet, writeTransform } from "./instances";

export type WeatherKind = keyof RenderData["weather"]["kinds"];
export type WeatherConfig = RenderData["weather"];

export interface Weather {
	/** Picks the ambient VFX of the biome (`null` = clear air). */
	setKind(kind: string | null): void;
	/** Sizes the weather from the preset's `particlePool`; a small pool (the Minimum preset) draws none. */
	setBudget(particlePool: number): void;
	/** Moves the box of weather along with the hero (scene coordinates). Call once per frame. */
	update(dtSeconds: number, heroX: number, heroZ: number): void;
	/** Particles drawn now. */
	readonly live: number;
}

const FLICKER_HZ = 6;

/**
 * Weather per biome (S-24-02): cubes drifting through a box around the hero (fog banks, rain, rising embers, wind-blown
 * dust, falling ice). One thin-instance mesh of its own, allocated for the largest preset and never grown; a particle
 * that leaves the box wraps to the other side, so nothing is spawned or freed per frame. The budget is a share of the
 * preset's particle pool and drops further with flash reduction.
 */
export function createWeather(
	scene: Scene,
	options: {
		config?: WeatherConfig;
		/** Largest `particlePool` of any preset: sets the allocation. */
		maxPool: number;
		flashReduced?: () => boolean;
		seed?: number;
	},
): Weather {
	const config = options.config ?? renderData.weather;
	const rng = mulberry32(options.seed ?? 0x77ea);
	const capacity = Math.max(1, Math.floor(options.maxPool * config.poolShare));
	const mesh = CreateBox("vfx_weather", { size: 1 }, scene);
	const material = new StandardMaterial("vfx_weather", scene);
	material.specularColor = Color3.Black();
	mesh.material = material;
	mesh.isPickable = false;
	const set = createInstanceSet(mesh, capacity, true);

	const px = new Float32Array(capacity);
	const py = new Float32Array(capacity);
	const pz = new Float32Array(capacity);
	const size = new Float32Array(capacity);
	const phase = new Float32Array(capacity);
	let kind: WeatherKind | null = null;
	let budget = 0;
	let live = 0;
	let time = 0;
	let heroX = 0;
	let heroZ = 0;
	let rgb: readonly [number, number, number] = [1, 1, 1];

	const { area, height } = config;

	function respawn(i: number, anywhere: boolean): void {
		const def = kind ? config.kinds[kind] : null;
		px[i] = heroX + (rng.next() * 2 - 1) * area;
		pz[i] = heroZ + (rng.next() * 2 - 1) * area;
		// Falling kinds restart at the top, rising ones at the ground; a fresh kind fills the whole box.
		const rises = (def?.fall ?? 0) < 0;
		py[i] = anywhere ? rng.next() * height : rises ? 0 : height;
		const [lo = 0.1, hi = 0.2] = def?.size ?? [];
		size[i] = lo + rng.next() * (hi - lo);
		phase[i] = rng.next() * Math.PI * 2;
	}

	function target(): number {
		if (!kind) return 0;
		const share = config.kinds[kind].share;
		const reduced = options.flashReduced?.() ? config.reducedFlashShare : 1;
		return Math.min(capacity, Math.floor(budget * share * reduced));
	}

	function fill(): void {
		const want = target();
		while (live < want) respawn(live++, true);
		live = Math.min(live, want);
	}

	return {
		get live(): number {
			return live;
		},
		setKind(name): void {
			// A name the data does not define is clear air; the schema keeps biomes.json inside the five.
			const next = name !== null && name in config.kinds ? (name as WeatherKind) : null;
			if (next === kind) return;
			kind = next;
			live = 0;
			if (next) {
				const color = Color3.FromHexString(paletteHex(config.kinds[next].color));
				rgb = [color.r, color.g, color.b];
			}
			fill();
			if (live === 0) set.commit(0);
		},
		setBudget(particlePool): void {
			budget = particlePool < config.minPool ? 0 : Math.floor(particlePool * config.poolShare);
			fill();
			if (live === 0) set.commit(0);
		},
		update(dt, x, z): void {
			if (!kind) return;
			heroX = x;
			heroZ = z;
			// The share follows flash reduction live.
			fill();
			if (live === 0) return;
			const def = config.kinds[kind];
			time += dt;
			const colors = set.colors;
			for (let i = 0; i < live; i++) {
				const sway = Math.sin(time * 0.9 + (phase[i] ?? 0)) * def.sway;
				px[i] = (px[i] ?? 0) + (def.driftX + sway) * dt;
				pz[i] = (pz[i] ?? 0) + (def.driftZ + sway * 0.5) * dt;
				py[i] = (py[i] ?? 0) - def.fall * dt;
				if ((py[i] ?? 0) < 0 || (py[i] ?? 0) > height) respawn(i, false);
				// Wrap around the hero instead of respawning, so the box stays evenly filled while he walks.
				const dx = (px[i] ?? 0) - heroX;
				const dz = (pz[i] ?? 0) - heroZ;
				if (dx > area) px[i] = (px[i] ?? 0) - 2 * area;
				else if (dx < -area) px[i] = (px[i] ?? 0) + 2 * area;
				if (dz > area) pz[i] = (pz[i] ?? 0) - 2 * area;
				else if (dz < -area) pz[i] = (pz[i] ?? 0) + 2 * area;
				writeTransform(
					set.matrices,
					i,
					px[i] ?? 0,
					py[i] ?? 0,
					pz[i] ?? 0,
					size[i] ?? 0.1,
					phase[i] ?? 0,
				);
				if (colors) {
					colors[i * 4] = rgb[0];
					colors[i * 4 + 1] = rgb[1];
					colors[i * 4 + 2] = rgb[2];
					const blink = def.flicker
						? 0.55 + 0.45 * Math.sin(time * FLICKER_HZ + (phase[i] ?? 0) * 3)
						: 1;
					colors[i * 4 + 3] = def.alpha * blink;
				}
			}
			set.commit(live);
		},
	};
}
