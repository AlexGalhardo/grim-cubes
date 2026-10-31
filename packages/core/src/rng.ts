export interface Rng {
	next(): number;
	int(n: number): number;
	float(min: number, max: number): number;
	chance(p: number): boolean;
}

/** Order is part of the determinism contract: the streamId is the index. Append only, never reorder. */
export const RNG_STREAMS = [
	"spawn",
	"shop",
	"loot",
	"cards",
	"elite",
	"weapon",
	"dodge",
	"world",
	"combat",
] as const;

export type StreamName = (typeof RNG_STREAMS)[number];
export type RngStreams = Readonly<Record<StreamName, Rng>>;

export function mulberry32(seed: number): Rng {
	let a = seed | 0;
	const next = (): number => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (n) => Math.floor(next() * n),
		float: (min, max) => min + next() * (max - min),
		chance: (p) => next() < p,
	};
}

const C1 = 0xcc9e2d51;
const C2 = 0x1b873593;

function mixBlock(h: number, word: number): number {
	let k = Math.imul(word, C1);
	k = (k << 15) | (k >>> 17);
	k = Math.imul(k, C2);
	h ^= k;
	h = (h << 13) | (h >>> 19);
	return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function finalize(h: number, byteLength: number): number {
	h ^= byteLength;
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return h >>> 0;
}

/** MurmurHash3 x86_32 over bytes; verified against public vectors in rng.test.ts. */
export function murmur3x86_32(bytes: Uint8Array, seed = 0): number {
	let h = seed | 0;
	const blocks = bytes.length >> 2;
	for (let i = 0; i < blocks; i++) {
		const o = i * 4;
		h = mixBlock(
			h,
			(bytes[o] ?? 0) |
				((bytes[o + 1] ?? 0) << 8) |
				((bytes[o + 2] ?? 0) << 16) |
				((bytes[o + 3] ?? 0) << 24),
		);
	}
	const tail = blocks * 4;
	const rest = bytes.length & 3;
	if (rest > 0) {
		let k = bytes[tail] ?? 0;
		if (rest > 1) k |= (bytes[tail + 1] ?? 0) << 8;
		if (rest > 2) k |= (bytes[tail + 2] ?? 0) << 16;
		k = Math.imul(k, C1);
		k = (k << 15) | (k >>> 17);
		h ^= Math.imul(k, C2);
	}
	return finalize(h, bytes.length);
}

/**
 * Equals murmur3x86_32 of the parts as little-endian u32 words with seed 0, without allocating.
 * Negative i32 coordinates hash as their u32 form.
 */
export function hash32(...parts: number[]): number {
	let h = 0;
	for (const part of parts) h = mixBlock(h, part | 0);
	return finalize(h, parts.length * 4);
}

export function createStreams(seedRun: number): RngStreams {
	const streams = {} as Record<StreamName, Rng>;
	RNG_STREAMS.forEach((name, id) => {
		streams[name] = mulberry32(hash32(seedRun, id));
	});
	return streams;
}
