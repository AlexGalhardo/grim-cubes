import "@babylonjs/loaders/glTF";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { Document, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";

async function glb(): Promise<Uint8Array> {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const position = doc
		.createAccessor()
		.setType("VEC3")
		.setBuffer(buffer)
		.setArray(new Float32Array([1, 0, 2, 2, 0, 2, 1, 1, 2]));
	const prim = doc.createPrimitive().setAttribute("POSITION", position);
	const node = doc.createNode("n").setMesh(doc.createMesh("m").addPrimitive(prim));
	doc.createScene().addChild(node);
	return new NodeIO().writeBinary(doc);
}

/**
 * Decision input for the VAT handedness question: in a left-handed scene (Babylon default) the loader wraps
 * everything in a `__root__` that mirrors X; in a right-handed scene it adds no transform, so glTF space
 * (where the baker writes its matrices) equals scene space.
 */
describe("glTF loader handedness", () => {
	it.each([
		[false, -1],
		[true, 1],
	])("useRightHandedSystem=%s gives a mesh world X scale of %i", async (rightHanded, expected) => {
		const { engine, dispose } = createNullEngine();
		const scene = new Scene(engine);
		scene.useRightHandedSystem = rightHanded;
		const bytes = await glb();
		const url = `data:model/gltf-binary;base64,${Buffer.from(bytes).toString("base64")}`;
		const result = await ImportMeshAsync(url, scene, { pluginExtension: ".glb" });
		const mesh = result.meshes[1];
		mesh?.computeWorldMatrix(true);
		expect(mesh?.getWorldMatrix().m[0]).toBe(expected);
		scene.dispose();
		dispose();
	});
});
