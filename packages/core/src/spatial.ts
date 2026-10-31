export interface SpatialHash {
	clear(): void;
	/** Inserts `id` at (x, z). At most `capacity` entries per rebuild; extra inserts are ignored. */
	insert(id: number, x: number, z: number): void;
	/** Writes ids within `radius` of (x, z) to `out`, stopping when full; returns the count. */
	queryCircle(x: number, z: number, radius: number, out: Uint16Array): number;
	readonly count: number;
}

export interface SpatialHashOptions {
	cellSize?: number;
	capacity?: number;
	/** Power of two. Distinct cells may share a slot; queries filter by distance, so results stay exact. */
	slots?: number;
}

/** Dynamic uniform grid on XZ, rebuilt every step. Allocates only in the constructor. */
export function createSpatialHash(options: SpatialHashOptions = {}): SpatialHash {
	const cellSize = options.cellSize ?? 2;
	const capacity = options.capacity ?? 1024;
	const slots = options.slots ?? 2048;
	if ((slots & (slots - 1)) !== 0) throw new RangeError("slots must be a power of two");
	const mask = slots - 1;

	const head = new Int32Array(slots).fill(-1);
	const next = new Int32Array(capacity);
	const ids = new Uint16Array(capacity);
	const xs = new Float32Array(capacity);
	const zs = new Float32Array(capacity);
	const stamp = new Uint32Array(slots);
	let queryId = 0;
	let count = 0;

	const slotOf = (cx: number, cz: number): number =>
		(Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663)) & mask;

	return {
		clear(): void {
			head.fill(-1);
			count = 0;
		},
		insert(id: number, x: number, z: number): void {
			if (count === capacity) return;
			const slot = slotOf(Math.floor(x / cellSize), Math.floor(z / cellSize));
			ids[count] = id;
			xs[count] = x;
			zs[count] = z;
			next[count] = head[slot] ?? -1;
			head[slot] = count;
			count++;
		},
		queryCircle(x: number, z: number, radius: number, out: Uint16Array): number {
			const r2 = radius * radius;
			const x0 = Math.floor((x - radius) / cellSize);
			const x1 = Math.floor((x + radius) / cellSize);
			const z0 = Math.floor((z - radius) / cellSize);
			const z1 = Math.floor((z + radius) / cellSize);
			// A stamp skips slots already walked in this query (different cells can share a slot).
			queryId = (queryId + 1) >>> 0 || 1;
			let found = 0;
			for (let cx = x0; cx <= x1; cx++) {
				for (let cz = z0; cz <= z1; cz++) {
					const slot = slotOf(cx, cz);
					if (stamp[slot] === queryId) continue;
					stamp[slot] = queryId;
					for (let i = head[slot] ?? -1; i !== -1; i = next[i] ?? -1) {
						const dx = (xs[i] ?? 0) - x;
						const dz = (zs[i] ?? 0) - z;
						if (dx * dx + dz * dz <= r2) {
							if (found === out.length) return found;
							out[found++] = ids[i] ?? 0;
						}
					}
				}
			}
			return found;
		},
		get count(): number {
			return count;
		},
	};
}
