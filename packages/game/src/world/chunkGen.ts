import { hash32x3 } from "@gc/core";
import { createNoise2D } from "simplex-noise";
import type { ChunkData, ChunkGenerator } from "./chunkSystem";

export const PROP_KIND = { blocking: 0, decor: 1, breakable: 2 } as const;

export type Range = readonly [number, number];

export interface BiomeDef {
	id: string;
	minDistance: number;
	props?: { blocking: readonly string[]; decor: readonly string[]; breakable: readonly string[] };
	propCounts?: { blocking: Range; decor: Range; breakable: Range };
	floorTiles?: readonly string[];
}

export interface ChunkGenConfig {
	chunkSize: number;
	maxPropsPerChunk: number;
}

export interface ChunkGen {
	generate: ChunkGenerator;
	/** Prop names; `ChunkData.propType` indexes this list (blocking, decor, breakable per biome, deduplicated). */
	readonly propTypes: readonly string[];
	/** Index of the biome used for a chunk (distance from the spawn to the chunk centre). */
	biomeIndex(cx: number, cz: number): number;
}

const GRID = 4;
const CELLS = GRID * GRID;
/** Props never spawn closer than this to the hero spawn at the world origin (SDD 03 §2.1, GDD §5). */
const SPAWN_CLEARANCE = 3;
const CORRIDOR_LIMIT = 2;
const NOISE_SCALE = 1 / 48;
/** Keeps jittered props inside their cell. */
const CELL_MARGIN = 0.5;
/** Art Bible §7: four floor variants per biome when a biome does not list its tiles. */
const DEFAULT_FLOOR_VARIANTS = 4;

/**
 * Builds a deterministic chunk generator. Everything the hot path touches is preallocated here, so generating a
 * chunk allocates nothing. Each chunk draws from its own PRNG state seeded by (seedRun, cx, cz), so results do not
 * depend on the order in which chunks load.
 */
export function createChunkGenerator(
	seedRun: number,
	biomes: readonly BiomeDef[],
	config: ChunkGenConfig,
): ChunkGen {
	const defined = biomes
		.map((biome, index) => ({ biome, index }))
		.filter(
			(
				entry,
			): entry is {
				biome: BiomeDef & Required<Pick<BiomeDef, "props" | "propCounts">>;
				index: number;
			} => entry.biome.props !== undefined && entry.biome.propCounts !== undefined,
		)
		.sort((a, b) => a.biome.minDistance - b.biome.minDistance);
	if (defined.length === 0) throw new Error("No biome defines props and propCounts");

	const propTypes: string[] = [];
	const idOf = new Map<string, number>();
	const lists = defined.map(({ biome }) => {
		const ids = (names: readonly string[]): Uint8Array => {
			const out = new Uint8Array(names.length);
			names.forEach((name, i) => {
				let id = idOf.get(name);
				if (id === undefined) {
					id = propTypes.length;
					propTypes.push(name);
					idOf.set(name, id);
				}
				out[i] = id;
			});
			return out;
		};
		return {
			blocking: ids(biome.props.blocking),
			decor: ids(biome.props.decor),
			breakable: ids(biome.props.breakable),
		};
	});

	// Noise only orders candidate cells; a mulberry32 stream seeded from the run seed feeds the permutation table.
	let noiseState = hash32x3(seedRun, 0x4e4f4953, 0) | 0;
	const noise = createNoise2D(() => {
		noiseState = (noiseState + 0x6d2b79f5) | 0;
		let t = Math.imul(noiseState ^ (noiseState >>> 15), 1 | noiseState);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	});

	const { chunkSize, maxPropsPerChunk } = config;
	const cellSize = chunkSize / GRID;
	const score = new Float64Array(CELLS);
	const order = new Uint8Array(CELLS);
	const taken = new Uint8Array(CELLS);
	const blocked = new Uint8Array(CELLS);
	let rngState = 0;

	function next(): number {
		rngState = (rngState + 0x6d2b79f5) | 0;
		let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	function biomeIndex(cx: number, cz: number): number {
		const x = (cx + 0.5) * chunkSize;
		const z = (cz + 0.5) * chunkSize;
		const distance = Math.hypot(x, z);
		let chosen = 0;
		for (let i = 0; i < defined.length; i++) {
			if ((defined[i]?.biome.minDistance ?? 0) <= distance) chosen = i;
		}
		return chosen;
	}

	/** Orders the 16 cells by descending noise (insertion sort in preallocated arrays). */
	function rank(wx: number, wz: number, offsetX: number, offsetZ: number): void {
		for (let cell = 0; cell < CELLS; cell++) {
			const x = wx + ((cell % GRID) + 0.5) * cellSize;
			const z = wz + (Math.floor(cell / GRID) + 0.5) * cellSize;
			score[cell] = noise(x * NOISE_SCALE + offsetX, z * NOISE_SCALE + offsetZ);
			let i = cell;
			while (i > 0 && (score[order[i - 1] ?? 0] ?? 0) < (score[cell] ?? 0)) {
				order[i] = order[i - 1] ?? 0;
				i--;
			}
			order[i] = cell;
		}
	}

	function drawCount(range: Range): number {
		return range[0] + Math.floor(next() * (range[1] - range[0] + 1));
	}

	function neighbours(cell: number): number {
		const cx = cell % GRID;
		const cz = Math.floor(cell / GRID);
		let n = 0;
		for (let dz = -1; dz <= 1; dz++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (
					(dx === 0 && dz === 0) ||
					cx + dx < 0 ||
					cx + dx >= GRID ||
					cz + dz < 0 ||
					cz + dz >= GRID
				)
					continue;
				n += blocked[(cz + dz) * GRID + cx + dx] ?? 0;
			}
		}
		return n;
	}

	/**
	 * Corridor rule: a cell may take a blocking prop only if it has fewer than CORRIDOR_LIMIT blocked neighbours and so
	 * does each blocked neighbour, otherwise that neighbour would end up above the limit once this prop lands.
	 */
	function canBlock(cell: number): boolean {
		if (neighbours(cell) >= CORRIDOR_LIMIT) return false;
		const cx = cell % GRID;
		const cz = Math.floor(cell / GRID);
		for (let dz = -1; dz <= 1; dz++) {
			for (let dx = -1; dx <= 1; dx++) {
				const nx = cx + dx;
				const nz = cz + dz;
				if ((dx === 0 && dz === 0) || nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) continue;
				const other = nz * GRID + nx;
				if (blocked[other] && neighbours(other) >= CORRIDOR_LIMIT) return false;
			}
		}
		return true;
	}

	function place(
		out: ChunkData,
		cell: number,
		wx: number,
		wz: number,
		kind: number,
		ids: Uint8Array,
	): boolean {
		const lx = (cell % GRID) * cellSize + CELL_MARGIN + next() * (cellSize - 2 * CELL_MARGIN);
		const lz = Math.floor(cell / GRID) * cellSize + CELL_MARGIN + next() * (cellSize - 2 * CELL_MARGIN);
		const pick = ids[Math.floor(next() * ids.length)] ?? 0;
		if (Math.hypot(wx + lx, wz + lz) < SPAWN_CLEARANCE) return false;
		if (out.propCount >= maxPropsPerChunk)
			throw new Error("maxPropsPerChunk exceeded by the biome prop counts");
		const n = out.propCount++;
		out.propType[n] = pick;
		out.propKind[n] = kind;
		out.propX[n] = lx;
		out.propZ[n] = lz;
		return true;
	}

	const generate: ChunkGenerator = (cx, cz, out) => {
		rngState = hash32x3(seedRun, cx, cz) | 0;
		const index = biomeIndex(cx, cz);
		const entry = defined[index];
		const list = lists[index];
		if (!entry || !list) return;
		const { propCounts } = entry.biome;
		const wx = cx * chunkSize;
		const wz = cz * chunkSize;
		out.biome = entry.index;
		out.floorVariant = Math.floor(next() * (entry.biome.floorTiles?.length ?? DEFAULT_FLOOR_VARIANTS));
		out.propCount = 0;

		// Grid A: blocking props, then breakables, at most one per cell.
		const wantBlocking = drawCount(propCounts.blocking);
		const wantBreakable = drawCount(propCounts.breakable);
		taken.fill(0);
		blocked.fill(0);
		rank(wx, wz, 0, 0);
		let placed = 0;
		for (let i = 0; i < CELLS && placed < wantBlocking; i++) {
			const cell = order[i] ?? 0;
			if (!canBlock(cell)) continue;
			if (!place(out, cell, wx, wz, PROP_KIND.blocking, list.blocking)) continue;
			blocked[cell] = 1;
			taken[cell] = 1;
			placed++;
		}
		placed = 0;
		for (let i = 0; i < CELLS && placed < wantBreakable; i++) {
			const cell = order[i] ?? 0;
			if (taken[cell]) continue;
			if (!place(out, cell, wx, wz, PROP_KIND.breakable, list.breakable)) continue;
			taken[cell] = 1;
			placed++;
		}

		// Grid B: decorative props, independent of grid A.
		const wantDecor = drawCount(propCounts.decor);
		rank(wx, wz, 31.7, -17.3);
		placed = 0;
		for (let i = 0; i < CELLS && placed < wantDecor; i++) {
			if (place(out, order[i] ?? 0, wx, wz, PROP_KIND.decor, list.decor)) placed++;
		}
	};

	return { generate, propTypes, biomeIndex: (cx, cz) => defined[biomeIndex(cx, cz)]?.index ?? 0 };
}
