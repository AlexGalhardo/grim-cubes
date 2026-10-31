import "@babylonjs/loaders/glTF";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { createGameWorld, EnemyFaction, EnemyType, Facing, spawnBody } from "@gc/game";
import { Document, NodeIO } from "@gltf-transform/core";
import { addComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createVat, type VatMeta } from "../vat/loader";
import { createHordeRenderer } from "./hordeRenderer";

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

const vatMeta: VatMeta = {
	format: "rgba32f",
	fps: 12,
	boneCount: 1,
	width: 8,
	height: 20,
	clips: {
		idle: { from: 0, to: 1 },
		walk: { from: 2, to: 7 },
		attack: { from: 8, to: 10 },
		hit: { from: 11, to: 12 },
		death: { from: 13, to: 19 },
	},
};

describe("horde placement with a glTF-loaded base mesh", () => {
	it("puts the instance at the scene position despite the loader's mirrored __root__", async () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const bytes = await glb();
		const url = `data:model/gltf-binary;base64,${Buffer.from(bytes).toString("base64")}`;
		const result = await ImportMeshAsync(url, game.scene, { pluginExtension: ".glb" });
		const mesh = result.meshes[1] as Mesh;
		mesh.computeWorldMatrix(true);

		const horde = createHordeRenderer(
			[
				{
					mesh,
					vat: createVat(
						game.scene,
						"loaded",
						new Float32Array(vatMeta.width * vatMeta.height * 4).buffer,
						vatMeta,
					),
					walkRefSpeed: 3,
				},
			],
			{ capacity: 4, ghostCapacity: 1, deltaSeconds: () => 1 / 60 },
		);
		const world = createGameWorld();
		const eid = spawnBody(world, 5, -3);
		addComponent(world, eid, EnemyFaction);
		EnemyType.id[eid] = 0;
		const yaw = 0.7;
		Facing.yaw[eid] = yaw;
		horde.sync(world, 1);

		// Babylon thin instances render with instance * mesh world.
		const instance = mesh.thinInstanceGetWorldMatrices()[0] ?? Matrix.Identity();
		const world0 = instance.multiply(mesh.getWorldMatrix());
		const origin = Vector3.TransformCoordinates(Vector3.Zero(), world0);
		expect([origin.x, origin.y, origin.z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([5, 0, -3]);

		// Whole transform: the model is mirrored into the scene by the loader, then rotated by yaw and moved.
		const expected = Matrix.Scaling(-1, 1, 1)
			.multiply(Matrix.RotationY(yaw))
			.multiply(Matrix.Translation(5, 0, -3));
		world0.m.forEach((value, i) => {
			expect(Math.abs(value - (expected.m[i] ?? 0))).toBeLessThan(1e-6);
		});
		Facing.yaw[eid] = 0;
		dispose();
	});
});
