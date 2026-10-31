import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { assertVatLimits, bakeVat, ENEMY_CLIPS, VAT_FPS } from "./bake";
import { makeRootedRig } from "./rigFixture";

interface ClipSpec {
	duration: number;
	angleDeg: number;
}

/**
 * Two-bone rig, hand-computable: bone0 at the origin, bone1 one unit above it. Each clip rotates bone1
 * about Z from 0 to `angleDeg` over `duration` seconds.
 */
function makeRig(specs: Record<string, ClipSpec>): Document {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const scene = doc.createScene();
	const bone0 = doc.createNode("bone0");
	const bone1 = doc.createNode("bone1").setTranslation([0, 1, 0]);
	bone0.addChild(bone1);
	scene.addChild(bone0);
	const ibm = doc
		.createAccessor()
		.setType("MAT4")
		.setBuffer(buffer)
		.setArray(
			new Float32Array([
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1, 0,
				1,
			]),
		);
	doc.createSkin("skin").addJoint(bone0).addJoint(bone1).setInverseBindMatrices(ibm);

	for (const [name, spec] of Object.entries(specs)) {
		const half = (spec.angleDeg * Math.PI) / 360;
		const input = doc
			.createAccessor()
			.setType("SCALAR")
			.setBuffer(buffer)
			.setArray(new Float32Array([0, spec.duration]));
		const output = doc
			.createAccessor()
			.setType("VEC4")
			.setBuffer(buffer)
			.setArray(new Float32Array([0, 0, 0, 1, 0, 0, Math.sin(half), Math.cos(half)]));
		const sampler = doc
			.createAnimationSampler()
			.setInput(input)
			.setOutput(output)
			.setInterpolation("LINEAR");
		const channel = doc
			.createAnimationChannel()
			.setTargetNode(bone1)
			.setTargetPath("rotation")
			.setSampler(sampler);
		doc.createAnimation(name).addSampler(sampler).addChannel(channel);
	}
	return doc;
}

const SPECS: Record<string, ClipSpec> = {
	idle: { duration: 1 / 12, angleDeg: 0 },
	walk: { duration: 5 / 12, angleDeg: 90 },
	attack: { duration: 2 / 12, angleDeg: 0 },
	hit: { duration: 1 / 12, angleDeg: 0 },
	death: { duration: 3 / 12, angleDeg: 0 },
};

/** glTF column-major mat4 applied to a point (column-vector convention). */
function transform(m: ArrayLike<number>, offset: number, p: [number, number, number]): number[] {
	const g = (i: number): number => m[offset + i] ?? 0;
	return [0, 1, 2].map((r) => g(r) * p[0] + g(4 + r) * p[1] + g(8 + r) * p[2] + g(12 + r));
}

describe("bakeVat", () => {
	const { data, meta } = bakeVat("rig", makeRig(SPECS));
	const bone1At = (frame: number): number => frame * meta.width * 4 + 16;

	it("lays out clips at 12 fps in the Babylon (bones + 1) * 4 texel rows", () => {
		expect(meta.fps).toBe(VAT_FPS);
		expect(meta.width).toBe((2 + 1) * 4);
		expect(Object.keys(meta.clips)).toEqual([...ENEMY_CLIPS]);
		expect(meta.clips.idle).toEqual({ from: 0, to: 1 });
		expect(meta.clips.walk).toEqual({ from: 2, to: 7 });
		expect(meta.height).toBe(2 + 6 + 3 + 2 + 4);
		expect(data.length).toBe(meta.width * meta.height * 4);
	});

	it("reproduces the hand-computed vertex at walk frame 5 (oracle: rotate (0,2,0) 90deg about bone1 -> (-1,1,0))", () => {
		const frame = (meta.clips.walk?.from ?? 0) + 5;
		const p = transform(data, bone1At(frame), [0, 2, 0]);
		expect(p[0]).toBeCloseTo(-1, 4);
		expect(p[1]).toBeCloseTo(1, 4);
		expect(p[2]).toBeCloseTo(0, 4);
	});

	it("is the rest pose at walk frame 0 and stays rigid (bone length preserved) at frame 5", () => {
		const first = meta.clips.walk?.from ?? 0;
		const rest = transform(data, bone1At(first), [0, 2, 0]);
		expect(rest[0]).toBeCloseTo(0, 4);
		expect(rest[1]).toBeCloseTo(2, 4);
		const half = transform(data, bone1At(first + 5), [0, 1.5, 0]);
		expect(Math.hypot(half[0] ?? 0, (half[1] ?? 0) - 1)).toBeCloseTo(0.5, 4);
	});

	it("keeps bone0 as identity and restores the document pose", () => {
		const doc = makeRig(SPECS);
		bakeVat("rig", doc);
		expect(doc.getRoot().listNodes()[1]?.getRotation()).toEqual([0, 0, 0, 1]);
		for (let i = 0; i < 16; i++) expect(data[i]).toBeCloseTo(i % 5 === 0 ? 1 : 0, 6);
	});
});

describe("bakeVat with a transformed non-joint root", () => {
	it("bakes identity matrices at the rest pose (ancestors are not applied twice)", () => {
		const { data, meta } = bakeVat("rooted", makeRootedRig(), ["walk", "attack"]);
		const first = meta.clips.walk?.from ?? 0;
		for (let bone = 0; bone < meta.boneCount; bone++) {
			for (let i = 0; i < 16; i++) {
				const expected = i % 5 === 0 ? 1 : 0;
				expect(data[first * meta.width * 4 + bone * 16 + i]).toBeCloseTo(expected, 5);
			}
		}
	});
});

describe("bakeVat validation", () => {
	it("fails with the rule name when a required clip is missing", () => {
		const { idle, walk, attack, hit } = SPECS;
		const partial = { idle, walk, attack, hit } as Record<string, ClipSpec>;
		expect(() => bakeVat("rig", makeRig(partial))).toThrow("[vat-clips]");
	});

	it("fails when the model has no skin", () => {
		expect(() => bakeVat("rig", new Document())).toThrow("[vat-single-skin]");
	});

	it("rejects textures wider or taller than 4096", () => {
		expect(() => assertVatLimits("x", 4100, 10)).toThrow("[vat-width]");
		expect(() => assertVatLimits("x", 40, 4097)).toThrow("[vat-height]");
		expect(() => assertVatLimits("x", 4096, 4096)).not.toThrow();
	});
});
