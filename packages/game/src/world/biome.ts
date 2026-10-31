import { hash32x3 } from "@gc/core";

/** Width in u of the mixed border between two biomes (A-02-01): half before the boundary, half after. */
export const BIOME_BLEND = 16;

export interface BiomeBand {
	minDistance: number;
}

export interface BiomeMix {
	/** Biome of the inner side of the border (or the only biome away from borders). */
	from: number;
	/** Biome of the outer side; equal to `from` away from borders. */
	to: number;
	/** 0 = fully `from`, 1 = fully `to`; ramps across the border. */
	t: number;
}

export interface BiomeMap {
	/** Index (into the list given to `createBiomeMap`) of the biome at an absolute world position. */
	at(x: number, z: number): number;
	/** The same with the 16 u border: which two biomes mix there and by how much. Writes into `out`. */
	mix(x: number, z: number, out: BiomeMix): void;
	/** Border-aware pick for a whole chunk: near a border the chunk takes either side, deterministically per chunk. */
	chunkBiome(cx: number, cz: number, chunkSize: number, salt: number): number;
}

/**
 * Biomes are concentric rings around the spawn (GDD 5.2), ordered by `minDistance`. Only the entries in `indices`
 * take part (the biomes that define props); the rest of the list keeps its indices.
 */
export function createBiomeMap(
	biomes: readonly BiomeBand[],
	indices: readonly number[] = biomes.map((_, i) => i),
	blend = BIOME_BLEND,
): BiomeMap {
	const rings = indices
		.map((index) => ({ index, min: biomes[index]?.minDistance ?? 0 }))
		.sort((a, b) => a.min - b.min);
	const half = blend / 2;

	function ringAt(distance: number): number {
		let chosen = 0;
		for (let i = 0; i < rings.length; i++) if ((rings[i]?.min ?? 0) <= distance) chosen = i;
		return chosen;
	}

	function mixAt(distance: number, out: BiomeMix): void {
		const i = ringAt(distance);
		const next = rings[i + 1];
		const here = rings[i];
		out.from = here?.index ?? 0;
		out.to = out.from;
		out.t = 0;
		if (next && distance > next.min - half) {
			// Just inside the boundary of the next ring: ramps from 0 to 0.5.
			out.to = next.index;
			out.t = (distance - (next.min - half)) / blend;
		} else if (i > 0 && here && distance < here.min + half) {
			// Just past the boundary: the previous ring still shows, from 0.5 down to 0.
			out.from = rings[i - 1]?.index ?? 0;
			out.to = here.index;
			out.t = 0.5 + (distance - here.min) / blend;
		}
	}

	const scratch: BiomeMix = { from: 0, to: 0, t: 0 };
	return {
		at(x, z): number {
			return rings[ringAt(Math.hypot(x, z))]?.index ?? 0;
		},
		mix(x, z, out): void {
			mixAt(Math.hypot(x, z), out);
		},
		chunkBiome(cx, cz, chunkSize, salt): number {
			mixAt(Math.hypot((cx + 0.5) * chunkSize, (cz + 0.5) * chunkSize), scratch);
			if (scratch.t <= 0 || scratch.from === scratch.to) return scratch.from;
			const roll = (hash32x3(salt, cx, cz) >>> 0) / 4294967296;
			return roll < scratch.t ? scratch.to : scratch.from;
		},
	};
}
