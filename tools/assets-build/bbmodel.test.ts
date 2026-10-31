import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { PNG } from "pngjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bakeVat } from "../bake-vat/bake";
import { type BbElement, type BbModel, bbmodelToDocument, parseBbmodel, validateBbmodel } from "./bbmodel";
import { buildAssets } from "./build";
import { rigidSkin } from "./rigidSkin";

const FACE = { uv: [0, 0, 8, 8] as [number, number, number, number] };
const ALL_FACES = { north: FACE, south: FACE, east: FACE, west: FACE, up: FACE, down: FACE };

function cube(uuid: string, from: [number, number, number], to: [number, number, number]): BbElement {
	return { uuid, name: uuid, type: "cube", from, to, faces: ALL_FACES };
}

type Keyframes = NonNullable<BbModel["animations"]>[number]["animators"][string]["keyframes"];

function keyframes(angle: number, duration: number): Keyframes {
	return [
		{ channel: "rotation", time: 0, data_points: [{ x: 0, y: 0, z: 0 }] },
		{ channel: "rotation", time: duration, data_points: [{ x: 0, y: 0, z: angle }] },
	];
}

/** A valid enemy: root > body > head, hit_socket, one cube each, all five mandatory clips. */
function makeEnemy(): BbModel {
	const clip = (
		name: string,
		angle: number,
		duration: number,
	): NonNullable<BbModel["animations"]>[number] => ({
		name,
		length: duration,
		animators: { g_body: { name: "body", keyframes: keyframes(angle, duration) } },
	});
	return {
		name: "husk",
		resolution: { width: 32, height: 32 },
		elements: [cube("e_body", [-4, 0, -2], [4, 12, 2]), cube("e_head", [-4, 12, -4], [4, 20, 4])],
		outliner: [
			{
				uuid: "g_root",
				name: "root",
				origin: [0, 0, 0],
				children: [
					{
						uuid: "g_body",
						name: "body",
						origin: [0, 12, 0],
						children: [
							"e_body",
							{ uuid: "g_head", name: "head", origin: [0, 20, 0], children: ["e_head"] },
							{ uuid: "g_hit", name: "hit_socket", origin: [0, 14, 2], children: [] },
						],
					},
				],
			},
		],
		textures: [{ name: "husk_d.png" }],
		animations: [
			clip("idle", 0, 1 / 12),
			clip("walk", 90, 5 / 12),
			clip("attack", 45, 2 / 12),
			clip("hit", 0, 1 / 12),
			clip("death", 90, 3 / 12),
		],
	};
}

function firstKeyframe(
	model: BbModel,
): NonNullable<BbModel["animations"]>[number]["animators"][string]["keyframes"][number] {
	const animator = Object.values(model.animations?.[0]?.animators ?? {})[0];
	const frame = animator?.keyframes[0];
	if (!frame) throw new Error("fixture has no keyframes");
	return frame;
}

function setFirstKeyframe(
	model: BbModel,
	point: { x: number | string; y: number | string; z: number | string },
): void {
	firstKeyframe(model).data_points = [point];
}

describe("validateBbmodel", () => {
	it("accepts a valid enemy model", () => {
		expect(() => validateBbmodel("husk", "enemies", makeEnemy())).not.toThrow();
	});

	it.each<[string, (m: BbModel) => void]>([
		[
			"bbmodel-element-type",
			(m) => {
				(m.elements[0] as BbElement).type = "mesh";
			},
		],
		[
			"bbmodel-rotation",
			(m) => {
				(m.elements[0] as BbElement).rotation = [10, 0, 0];
			},
		],
		[
			"bbmodel-element-size",
			(m) => {
				(m.elements[0] as BbElement).to = [4, 0, 2];
			},
		],
		[
			"bbmodel-element-budget",
			(m) => {
				for (let i = 0; i < 20; i++) m.elements.push(cube(`x${i}`, [0, 0, 0], [1, 1, 1]));
			},
		],
		[
			"bbmodel-groups",
			(m) => {
				const body = (m.outliner[0] as { children: { children: unknown[] }[] }).children[0];
				if (body)
					body.children = body.children.filter((c) => (c as { name?: string }).name !== "head");
			},
		],
		[
			"bbmodel-socket",
			(m) => {
				const body = (m.outliner[0] as { children: { children: unknown[] }[] }).children[0];
				if (body)
					body.children = body.children.filter(
						(c) => (c as { name?: string }).name !== "hit_socket",
					);
			},
		],
		[
			"bbmodel-keyframe",
			(m) => {
				setFirstKeyframe(m, { x: "Math.sin(q.anim_time)", y: 0, z: 0 });
			},
		],
		[
			"bbmodel-keyframe",
			(m) => {
				setFirstKeyframe(m, { x: Number.NaN, y: 0, z: 0 });
			},
		],
		[
			"bbmodel-keyframe",
			(m) => {
				firstKeyframe(m).interpolation = "catmullrom";
			},
		],
		[
			"bbmodel-keyframe",
			(m) => {
				firstKeyframe(m).interpolation = "step";
			},
		],
		[
			"bbmodel-face-rotation",
			(m) => {
				// ALL_FACES is shared between elements, so replace the face instead of mutating it.
				const element = m.elements[0] as BbElement;
				element.faces = { ...element.faces, north: { ...FACE, rotation: 90 } };
			},
		],
		[
			"bbmodel-box-uv",
			(m) => {
				m.meta = { box_uv: true };
			},
		],
		[
			"bbmodel-texture",
			(m) => {
				m.textures = [{}, {}];
			},
		],
		[
			"bbmodel-texture",
			(m) => {
				m.resolution = { width: 30, height: 32 };
			},
		],
	])("rejects %s", (rule, mutate) => {
		const model = makeEnemy();
		mutate(model);
		expect(() => validateBbmodel("bad", "enemies", model)).toThrow(`[${rule}]`);
	});

	it("applies the Art Bible size-class budgets to enemies and props", () => {
		const sized = (count: number): BbModel => {
			const model = makeEnemy();
			for (let i = model.elements.length; i < count; i++)
				model.elements.push(cube(`x${i}`, [0, 0, 0], [1, 1, 1]));
			return model;
		};
		expect(() => validateBbmodel("wail", "enemies", sized(10), "small")).not.toThrow();
		expect(() => validateBbmodel("wail", "enemies", sized(11), "small")).toThrow(
			"[bbmodel-element-budget]",
		);
		expect(() => validateBbmodel("husk", "enemies", sized(16), "medium")).not.toThrow();
		expect(() => validateBbmodel("husk", "enemies", sized(17), "medium")).toThrow(
			"[bbmodel-element-budget]",
		);
		expect(() => validateBbmodel("forged", "enemies", sized(20), "large")).not.toThrow();
		expect(() => validateBbmodel("forged", "enemies", sized(21), "large")).toThrow(
			"[bbmodel-element-budget]",
		);
	});

	it("maps step keyframes to STEP interpolation in glTF", () => {
		const model = makeEnemy();
		for (const animation of model.animations ?? []) {
			for (const animator of Object.values(animation.animators)) {
				for (const frame of animator.keyframes) frame.interpolation = "step";
			}
		}
		expect(() => validateBbmodel("husk", "enemies", model)).not.toThrow();
		const doc = bbmodelToDocument("husk", "enemies", model);
		const sampler = doc.getRoot().listAnimations()[0]?.listSamplers()[0];
		expect(sampler?.getInterpolation()).toBe("STEP");
	});

	it("rejects text that is not a model", () => {
		expect(() => parseBbmodel("bad", "{nope")).toThrow("[bbmodel-json]");
		expect(() => parseBbmodel("bad", "{}")).toThrow("[bbmodel-json]");
	});
});

describe("bbmodelToDocument", () => {
	it("builds one node per group with cube geometry scaled by pixels per unit", () => {
		const doc = bbmodelToDocument("husk", "enemies", makeEnemy());
		const names = doc
			.getRoot()
			.listNodes()
			.map((n) => n.getName());
		expect(names).toEqual(["root", "body", "head", "hit_socket"]);
		const body = doc
			.getRoot()
			.listNodes()
			.find((n) => n.getName() === "body");
		const position = body?.getMesh()?.listPrimitives()[0]?.getAttribute("POSITION")?.getArray();
		expect(position?.length).toBe(24 * 3);
		// Body cube spans x in [-4, 4] px = +-0.0625 u at 64 px/u, relative to the group pivot (0, 12, 0).
		const xs = Array.from({ length: 24 }, (_, i) => position?.[i * 3] ?? 0);
		expect(Math.min(...xs)).toBeCloseTo(-4 / 64, 6);
		expect(Math.max(...xs)).toBeCloseTo(4 / 64, 6);
		expect(body?.getTranslation()).toEqual([0, 12 / 64, 0]);
	});

	it("converts to a rigid skin whose rest pose bakes to identity matrices", () => {
		const doc = bbmodelToDocument("husk", "enemies", makeEnemy());
		rigidSkin("husk", doc, { skin: true });
		expect(doc.getRoot().listMeshes()).toHaveLength(1);
		expect(doc.getRoot().listSkins()[0]?.listJoints()).toHaveLength(4);
		const baked = bakeVat("husk", doc);
		for (let i = 0; i < baked.meta.boneCount * 16; i++) {
			expect(baked.data[i]).toBeCloseTo((i % 16) % 5 === 0 ? 1 : 0, 5);
		}
		expect(Object.keys(baked.meta.clips)).toEqual(["idle", "walk", "attack", "hit", "death"]);
	});
});

describe("assets-build with a .bbmodel", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "bbmodel-"));
	});
	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("converts, skins, atlases and bakes the VAT of an enemy", async () => {
		const dir = join(root, "src", "models", "enemies");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "husk.bbmodel"), JSON.stringify(makeEnemy()));
		const png = new PNG({ width: 32, height: 32 });
		for (let i = 0; i < 32 * 32; i++) png.data.set([60 + (i % 3) * 20, 50, 90, 255], i * 4);
		writeFileSync(join(dir, "husk_d.png"), PNG.sync.write(png));

		const out = join(root, "out");
		const manifest = await buildAssets({ srcDir: join(root, "src"), outDir: out, version: "1.0.0" });
		expect(Object.keys(manifest.entries)).toEqual(["atlas_characters", "husk", "vat_husk"]);

		const glb = readFileSync(join(out, manifest.entries.husk?.url ?? ""));
		const doc = await new NodeIO().readBinary(new Uint8Array(glb));
		expect(doc.getRoot().listSkins()).toHaveLength(1);
		const weights = doc
			.getRoot()
			.listMeshes()[0]
			?.listPrimitives()[0]
			?.getAttribute("WEIGHTS_0")
			?.getArray();
		expect(weights && Array.from(weights).every((w, i) => (i % 4 === 0 ? w === 1 : w === 0))).toBe(true);
	});

	it("reads size classes from the data directory to tighten the element budget", async () => {
		const dir = join(root, "src", "models", "enemies");
		mkdirSync(dir, { recursive: true });
		const model = makeEnemy();
		for (let i = 0; i < 10; i++) model.elements.push(cube(`x${i}`, [0, 0, 0], [1, 1, 1]));
		writeFileSync(join(dir, "husk.bbmodel"), JSON.stringify(model));
		const png = new PNG({ width: 32, height: 32 });
		for (let i = 0; i < 32 * 32; i++) png.data.set([60, 50, 90, 255], i * 4);
		writeFileSync(join(dir, "husk_d.png"), PNG.sync.write(png));
		const data = join(root, "data");
		mkdirSync(data, { recursive: true });
		writeFileSync(join(data, "enemies.json"), JSON.stringify([{ id: "husk", sizeClass: "small" }]));

		const options = { srcDir: join(root, "src"), outDir: join(root, "out"), version: "1.0.0" };
		await expect(buildAssets({ ...options, dataDir: data })).rejects.toThrow("[bbmodel-element-budget]");
		await expect(buildAssets(options)).resolves.toBeDefined();
	});

	it("fails the build with the rule name for an invalid .bbmodel", async () => {
		const dir = join(root, "src", "models", "props");
		mkdirSync(dir, { recursive: true });
		const bad = makeEnemy();
		(bad.elements[0] as BbElement).rotation = [10, 0, 0];
		writeFileSync(join(dir, "bad.bbmodel"), JSON.stringify(bad));
		await expect(
			buildAssets({ srcDir: join(root, "src"), outDir: join(root, "out"), version: "1.0.0" }),
		).rejects.toThrow("[bbmodel-");
	});
});
