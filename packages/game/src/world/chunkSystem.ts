export interface WorldConfig {
	chunkSize: number;
	loadRadius: number;
	unloadRadius: number;
	chunksPerStep: number;
	poolSize: number;
	/** Hero distance from the render origin (per axis) that triggers an origin shift. */
	originShiftThreshold: number;
}

/** P-01-01 extends this with the generated content (biome, props); the pool reuses the same objects. */
export interface ChunkData {
	cx: number;
	cz: number;
	floorVariant: number;
}

export type ChunkGenerator = (cx: number, cz: number, out: ChunkData) => void;

export interface ChunkStats {
	/** ChunkData objects ever allocated; stays constant once the pool has warmed up. */
	newChunkData: number;
	generated: number;
	released: number;
	loaded: number;
}

export interface ChunkSystem {
	/** Feed the absolute hero position (origin + Position) once per simulation step. */
	update(heroX: number, heroZ: number): void;
	get(cx: number, cz: number): ChunkData | null;
	/** Window table, `null` for empty slots; iterate by index, do not mutate. */
	readonly slots: readonly (ChunkData | null)[];
	readonly stats: Readonly<ChunkStats>;
}

export function createChunkSystem(config: WorldConfig, generate: ChunkGenerator): ChunkSystem {
	const { chunkSize, loadRadius, unloadRadius, chunksPerStep, poolSize } = config;
	if (unloadRadius <= loadRadius) throw new Error("unloadRadius must be greater than loadRadius");
	// Every chunk closer than unloadRadius fits one window of this width, so (cx mod W, cz mod W) is unique.
	const width = 2 * (unloadRadius - 1) + 1;
	if (poolSize < width * width) throw new Error(`poolSize must be at least ${width * width}`);

	const slots: (ChunkData | null)[] = new Array<ChunkData | null>(width * width).fill(null);
	const free: (ChunkData | null)[] = new Array<ChunkData | null>(poolSize).fill(null);
	let freeCount = 0;
	const stats: ChunkStats = { newChunkData: 0, generated: 0, released: 0, loaded: 0 };

	const slotOf = (cx: number, cz: number): number =>
		(((cx % width) + width) % width) * width + (((cz % width) + width) % width);

	function acquire(): ChunkData {
		if (freeCount > 0) {
			freeCount--;
			const reused = free[freeCount];
			free[freeCount] = null;
			if (reused) return reused;
		}
		if (stats.newChunkData >= poolSize) throw new Error("ChunkData pool exhausted");
		stats.newChunkData++;
		return { cx: 0, cz: 0, floorVariant: 0 };
	}

	function update(heroX: number, heroZ: number): void {
		const hcx = Math.floor(heroX / chunkSize);
		const hcz = Math.floor(heroZ / chunkSize);

		// Release first so a teleport can never need more than poolSize live chunks.
		for (let i = 0; i < slots.length; i++) {
			const chunk = slots[i];
			if (chunk && Math.max(Math.abs(chunk.cx - hcx), Math.abs(chunk.cz - hcz)) >= unloadRadius) {
				slots[i] = null;
				free[freeCount++] = chunk;
				stats.released++;
				stats.loaded--;
			}
		}

		for (let n = 0; n < chunksPerStep; n++) {
			let bestX = 0;
			let bestZ = 0;
			let bestDist = Number.POSITIVE_INFINITY;
			for (let cx = hcx - loadRadius; cx <= hcx + loadRadius; cx++) {
				for (let cz = hcz - loadRadius; cz <= hcz + loadRadius; cz++) {
					if (slots[slotOf(cx, cz)]) continue;
					const dx = (cx + 0.5) * chunkSize - heroX;
					const dz = (cz + 0.5) * chunkSize - heroZ;
					const dist = dx * dx + dz * dz;
					if (dist < bestDist) {
						bestDist = dist;
						bestX = cx;
						bestZ = cz;
					}
				}
			}
			if (bestDist === Number.POSITIVE_INFINITY) break;
			const chunk = acquire();
			chunk.cx = bestX;
			chunk.cz = bestZ;
			generate(bestX, bestZ, chunk);
			slots[slotOf(bestX, bestZ)] = chunk;
			stats.generated++;
			stats.loaded++;
		}
	}

	function get(cx: number, cz: number): ChunkData | null {
		const chunk = slots[slotOf(cx, cz)];
		return chunk && chunk.cx === cx && chunk.cz === cz ? chunk : null;
	}

	return { update, get, slots, stats };
}
