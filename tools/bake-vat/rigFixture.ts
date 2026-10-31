import { Document } from "@gltf-transform/core";

/**
 * Skinned mesh under a transformed, non-joint `root` node. IBMs are relative to the skeleton space (the
 * root's own transform excluded), as the glTF spec and the Babylon loader expect.
 */
export function makeRootedRig(variant: "single" | "siblings" = "single"): Document {
	const doc = new Document();
	const buffer = doc.createBuffer();
	const scene = doc.createScene();
	const root = doc
		.createNode("root")
		.setTranslation([0.3, 0, 0.7])
		.setRotation([0, Math.sin(0.3), 0, Math.cos(0.3)]);
	const bone0 = doc.createNode("bone0");
	const bone1 = doc.createNode("bone1").setTranslation([0, 1, 0.5]);
	bone0.addChild(bone1);
	let bone2: ReturnType<Document["createNode"]> | null = null;
	if (variant === "siblings") {
		// Two top joints under a transformed non-joint node: the skeleton root is that node, its parent is `root`.
		const mid = doc.createNode("mid").setTranslation([0.2, 0.1, 0]);
		bone2 = doc.createNode("bone2").setTranslation([1, 0, 0]);
		root.addChild(mid);
		mid.addChild(bone0);
		mid.addChild(bone2);
	} else {
		root.addChild(bone0);
	}

	const ibm = doc
		.createAccessor()
		.setType("MAT4")
		.setBuffer(buffer)
		.setArray(
			new Float32Array([
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1,
				-0.5, 1,
			]),
		);
	const skin = doc.createSkin("skin").addJoint(bone0).addJoint(bone1).setInverseBindMatrices(ibm);
	if (bone2) {
		skin.addJoint(bone2).setInverseBindMatrices(
			doc
				.createAccessor()
				.setType("MAT4")
				.setBuffer(buffer)
				.setArray(
					new Float32Array([
						1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0,
						-1, -0.5, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 1,
					]),
				),
		);
	} else {
		skin.setSkeleton(bone0);
	}
	const position = doc
		.createAccessor()
		.setType("VEC3")
		.setBuffer(buffer)
		.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 2, 0.5]));
	const joints = doc
		.createAccessor()
		.setType("VEC4")
		.setBuffer(buffer)
		.setArray(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]));
	const weights = doc
		.createAccessor()
		.setType("VEC4")
		.setBuffer(buffer)
		.setArray(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]));
	const primitive = doc
		.createPrimitive()
		.setAttribute("POSITION", position)
		.setAttribute("JOINTS_0", joints)
		.setAttribute("WEIGHTS_0", weights)
		.setMaterial(doc.createMaterial("m"));
	const meshNode = doc
		.createNode("mesh")
		.setMesh(doc.createMesh("m").addPrimitive(primitive))
		.setSkin(skin);
	scene.addChild(root);
	scene.addChild(meshNode);

	const clip = (name: string, axis: [number, number, number], degrees: number, duration: number): void => {
		const half = (degrees * Math.PI) / 360;
		const q = [
			axis[0] * Math.sin(half),
			axis[1] * Math.sin(half),
			axis[2] * Math.sin(half),
			Math.cos(half),
		];
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
				doc
					.createAccessor()
					.setType("VEC4")
					.setBuffer(buffer)
					.setArray(new Float32Array([0, 0, 0, 1, ...q])),
			)
			.setInterpolation("LINEAR");
		doc.createAnimation(name)
			.addSampler(sampler)
			.addChannel(
				doc
					.createAnimationChannel()
					.setTargetNode(bone1)
					.setTargetPath("rotation")
					.setSampler(sampler),
			);
	};
	clip("walk", [0, 0, 1], 90, 5 / 12);
	clip("attack", [1, 0, 0], 60, 2 / 12);
	return doc;
}
