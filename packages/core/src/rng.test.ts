import { describe, expect, test } from "vitest";
import { createStreams, hash32, hash32x3, mulberry32, murmur3x86_32, RNG_STREAMS } from "./rng";

// Golden values: bryc's public mulberry32 reference
// (https://github.com/bryc/code/blob/master/jshash/PRNGs.md), seed 42.
const MULBERRY_42 = [
	0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693, 0.17481389874592423,
];

describe("mulberry32", () => {
	test("matches the public reference for seed 42", () => {
		const rng = mulberry32(42);
		for (const expected of MULBERRY_42) expect(rng.next()).toBe(expected);
	});

	test("int stays in [0, n) and chance honours extremes", () => {
		const rng = mulberry32(7);
		for (let i = 0; i < 1000; i++) {
			const v = rng.int(4);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(4);
		}
		expect(rng.chance(0)).toBe(false);
		expect(rng.chance(1)).toBe(true);
	});
});

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("murmur3x86_32", () => {
	// Cross-checked against murmurhash3_32_gc (Gary Court) and the SMHasher verification value below.
	test("matches the SMHasher verification value 0xB0F57EE3", () => {
		const key = new Uint8Array(256);
		const hashes = new Uint8Array(256 * 4);
		const view = new DataView(hashes.buffer);
		for (let i = 0; i < 256; i++) {
			key[i] = i;
			view.setUint32(i * 4, murmur3x86_32(key.subarray(0, i), 256 - i), true);
		}
		expect(murmur3x86_32(hashes, 0)).toBe(0xb0f57ee3);
	});

	test.each([
		["", 0, 0x00000000],
		["", 1, 0x514e28b7],
		["", 0xffffffff, 0x81f16f39],
		["test", 0, 0xba6bd213],
		["Hello, world!", 0, 0xc0363e43],
		["The quick brown fox jumps over the lazy dog", 0, 0x2e4ff723],
		["aaaa", 0x9747b28c, 0x5a97808a],
		["Hello, world!", 0x9747b28c, 0x24884cba],
		["The quick brown fox jumps over the lazy dog", 0x9747b28c, 0x2fa826cd],
	])("%j seed %i", (text, seed, expected) => {
		expect(murmur3x86_32(bytes(text), seed)).toBe(expected);
	});
});

describe("hash32", () => {
	test("is murmur3 of the little-endian u32 words, seed 0", () => {
		const words = new Uint32Array([1, 2, 3]);
		expect(hash32(1, 2, 3)).toBe(murmur3x86_32(new Uint8Array(words.buffer)));
		expect(hash32(1, 2, 3)).toBe(3923217110);
	});

	test("hash32x3 equals the variadic hash32", () => {
		for (const [a, b, c] of [
			[1, 2, 3],
			[7, -1, -1],
			[42, 100000, -99999],
		] as const) {
			expect(hash32x3(a, b, c)).toBe(hash32(a, b, c));
		}
	});

	test("treats negative i32 as their u32 form", () => {
		expect(hash32(7, -1, -1)).toBe(1690062776);
		expect(hash32(7, -1, -1)).toBe(hash32(7, 0xffffffff, 0xffffffff));
	});
});

describe("createStreams", () => {
	test("stream id is the index in RNG_STREAMS and is reproducible", () => {
		expect(RNG_STREAMS[0]).toBe("spawn");
		const a = createStreams(99);
		expect(a.shop.next()).toBe(mulberry32(hash32(99, 1)).next());
		expect(createStreams(99).loot.next()).toBe(createStreams(99).loot.next());
		expect(createStreams(99).spawn.next()).not.toBe(createStreams(99).shop.next());
	});
});
