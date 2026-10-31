import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { applyAnimationAt, bakeVat } from "../bake-vat/bake";
import { rigidSkin } from "./rigidSkin";

/**
 * Two animated nodes, each with its own box-like triangle mesh, the way Blockbench exports a model:
 * `root` slides up, its child `arm` (one unit above) swings 90 degrees about Z.
 */
function makeNodeModel(): Document {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const material = doc.createMaterial("m");
	const scene = doc.createScene();
	const root = doc.createNode("root");
	const arm = doc.createNode("arm").setTranslation([0, 1, 0]);
	root.addChild(arm);
	scene.addChild(root);

	const triangle = (positions: number[]): ReturnType<Document["createMesh"]> => {
		const position = doc
			.createAccessor()
			.setType("VEC3")
			.setBuffer(buffer)
			.setArray(new Float32Array(positions));
		const uv = doc
			.createAccessor()
			.setType("VEC2")
			.setBuffer(buffer)
			.setArray(new Float32Array([0, 0, 1, 0, 0, 1]));
		return doc
			.createMesh()
			.addPrimitive(
				doc
					.createPrimitive()
					.setAttribute("POSITION", position)
					.setAttribute("TEXCOORD_0", uv)
					.setMaterial(material),
			);
	};
	root.setMesh(triangle([0, 0, 0, 1, 0, 0, 0, 0.5, 0]));
	arm.setMesh(triangle([0, 0, 0, 2, 0, 0, 0, 1, 0.5]));

	const track = (
		name: string,
		node: typeof root,
		path: "rotation" | "translation",
		values: number[],
		type: "VEC3" | "VEC4",
		duration: number,
	): void => {
		const sampler = doc
			.createAnimationSampler()
			.setInput(
				doc
					.createAccessor()
					.setType("SCALAR")
					.setBuffer(buffer)
					.setArray(new Float32Array([0, duration])),
			)
			.setOutput(
				doc.createAccessor().setType(type).setBuffer(buffer).setArray(new Float32Array(values)),
			)
			.setInterpolation("LINEAR");
		doc.createAnimation(name)
			.addSampler(sampler)
			.addChannel(
				doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler),
			);
	};
	const half = Math.PI / 4;
	track("walk", arm, "rotation", [0, 0, 0, 1, 0, 0, Math.sin(half), Math.cos(half)], "VEC4", 5 / 12);
	track("slide", root, "translation", [0, 0, 0, 0, 0.5, 0], "VEC3", 5 / 12);
	return doc;
}

function worldVertices(doc: Document): number[][] {
	const out: number[][] = [];
	for (const node of doc.getRoot().listNodes()) {
		const position = node.getMesh()?.listPrimitives()[0]?.getAttribute("POSITION")?.getArray();
		if (!position) continue;
		const m = node.getWorldMatrix();
		for (let v = 0; v < position.length / 3; v++) {
			const [x, y, z] = [position[v * 3] ?? 0, position[v * 3 + 1] ?? 0, position[v * 3 + 2] ?? 0];
			out.push(
				[0, 1, 2].map(
					(r) => (m[r] ?? 0) * x + (m[4 + r] ?? 0) * y + (m[8 + r] ?? 0) * z + (m[12 + r] ?? 0),
				),
			);
		}
	}
	return out;
}

describe("rigidSkin", () => {
	it("merges per-node meshes into one skinned mesh with weight 1 per vertex", () => {
		const doc = makeNodeModel();
		rigidSkin("rig", doc, { skin: true });
		const root = doc.getRoot();
		expect(root.listMeshes()).toHaveLength(1);
		expect(root.listSkins()).toHaveLength(1);
		expect(
			root
				.listSkins()[0]
				?.listJoints()
				.map((j) => j.getName()),
		).toEqual(["root", "arm"]);
		const primitive = root.listMeshes()[0]?.listPrimitives()[0];
		const weights = primitive?.getAttribute("WEIGHTS_0")?.getArray();
		const joints = primitive?.getAttribute("JOINTS_0")?.getArray();
		expect(weights).toBeDefined();
		for (let v = 0; v < 6; v++) {
			expect(Array.from(weights?.subarray(v * 4, v * 4 + 4) ?? [])).toEqual([1, 0, 0, 0]);
			expect(joints?.[v * 4]).toBe(v < 3 ? 0 : 1);
		}
		expect(root.listAccessors().filter((a) => a.getCount() === 0)).toHaveLength(0);
	});

	it("keeps vertex positions of the animated per-node glTF at frame 5 (tolerance 1e-4)", () => {
		const converted = makeNodeModel();
		rigidSkin("rig", converted, { skin: true });

		const baked = bakeVat("rig", converted, ["walk"]);
		const frame = (baked.meta.clips.walk?.from ?? 0) + 5;
		const primitive = converted.getRoot().listMeshes()[0]?.listPrimitives()[0];
		const position = primitive?.getAttribute("POSITION")?.getArray();
		const joints = primitive?.getAttribute("JOINTS_0")?.getArray();
		// The walk clip does not play `slide`, so only the arm moves; compare the arm vertices (3..5) and the
		// root vertices (0..2) against a reference that applied the same single clip.
		const walkOnly = makeNodeModel();
		const walk = walkOnly
			.getRoot()
			.listAnimations()
			.find((a) => a.getName() === "walk");
		if (!walk) throw new Error("fixture lost its walk clip");
		applyAnimationAt(walk, 5 / 12, "ref");
		const walkExpected = worldVertices(walkOnly);
		let maxError = 0;
		for (let v = 0; v < 6; v++) {
			const joint = joints?.[v * 4] ?? 0;
			const o = frame * baked.meta.width * 4 + joint * 16;
			const [x, y, z] = [
				position?.[v * 3] ?? 0,
				position?.[v * 3 + 1] ?? 0,
				position?.[v * 3 + 2] ?? 0,
			];
			const skinned = [0, 1, 2].map(
				(r) =>
					(baked.data[o + r] ?? 0) * x +
					(baked.data[o + 4 + r] ?? 0) * y +
					(baked.data[o + 8 + r] ?? 0) * z +
					(baked.data[o + 12 + r] ?? 0),
			);
			for (let r = 0; r < 3; r++)
				maxError = Math.max(maxError, Math.abs((skinned[r] ?? 0) - (walkExpected[v]?.[r] ?? 0)));
		}
		expect(maxError).toBeLessThan(1e-4);
		// Sanity: the arm really moved, so the comparison is not trivial.
		expect(Math.abs((walkExpected[5]?.[0] ?? 0) - 0)).toBeGreaterThan(0.1);
	});

	it("merges without a skin for static models", () => {
		const doc = makeNodeModel();
		rigidSkin("prop", doc, { skin: false });
		expect(doc.getRoot().listSkins()).toHaveLength(0);
		expect(doc.getRoot().listMeshes()).toHaveLength(1);
		expect(doc.getRoot().listMeshes()[0]?.listPrimitives()[0]?.getAttribute("JOINTS_0")).toBeNull();
	});
});
