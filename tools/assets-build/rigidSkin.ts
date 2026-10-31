import type { Accessor, Document, Node, Primitive } from "@gltf-transform/core";
import { invertAffine, type Mat4 } from "../bake-vat/bake";
import { RuleError } from "./rules";

export interface RigidSkinOptions {
	/** Build a skin (every node becomes a bone, weight 1); without it the primitives are only merged. */
	skin: boolean;
}

function dfs(nodes: readonly Node[], out: Node[]): void {
	for (const node of nodes) {
		out.push(node);
		dfs(node.listChildren(), out);
	}
}

function transformPoint(m: Mat4, x: number, y: number, z: number): [number, number, number] {
	const g = (i: number): number => m[i] ?? 0;
	return [
		g(0) * x + g(4) * y + g(8) * z + g(12),
		g(1) * x + g(5) * y + g(9) * z + g(13),
		g(2) * x + g(6) * y + g(10) * z + g(14),
	];
}

function transformNormal(m: Mat4, x: number, y: number, z: number): [number, number, number] {
	const g = (i: number): number => m[i] ?? 0;
	const nx = g(0) * x + g(4) * y + g(8) * z;
	const ny = g(1) * x + g(5) * y + g(9) * z;
	const nz = g(2) * x + g(6) * y + g(10) * z;
	const length = Math.hypot(nx, ny, nz) || 1;
	return [nx / length, ny / length, nz / length];
}

/**
 * Blockbench exports one mesh per group and animates nodes. The engine wants one mesh with one skin
 * (SDD 09 §2.2): every primitive is baked into rest-pose space, merged, and bound with weight 1 to the joint of
 * the node that owned it; the node hierarchy stays as the joint hierarchy, so the node animations keep working.
 * Normals use the rotation part of the node matrix (uniform scale only, which rigid cube models always have).
 */
export function rigidSkin(name: string, document: Document, options: RigidSkinOptions): void {
	const root = document.getRoot();
	const scene = root.listScenes()[0];
	if (!scene) throw new RuleError("rigid-skin-scene", name, "document has no scene");
	const nodes: Node[] = [];
	dfs(scene.listChildren(), nodes);
	const meshNodes = nodes.filter((n) => n.getMesh() !== null);
	if (meshNodes.length === 0) throw new RuleError("rigid-skin-empty", name, "no node carries a mesh");

	const jointIndex = new Map(nodes.map((n, i) => [n, i]));
	if (options.skin && nodes.length > 0xffff)
		throw new RuleError("rigid-skin-joints", name, "too many joints");

	const positions: number[] = [];
	const normals: number[] = [];
	const uvs: number[] = [];
	const joints: number[] = [];
	const indices: number[] = [];
	const oldPrimitives: Primitive[] = [];
	let material: ReturnType<Primitive["getMaterial"]> = null;
	let firstMaterial = true;

	for (const node of meshNodes) {
		const world = node.getWorldMatrix() as Mat4;
		const joint = jointIndex.get(node) ?? 0;
		for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
			oldPrimitives.push(primitive);
			if (firstMaterial) {
				material = primitive.getMaterial();
				firstMaterial = false;
			} else if (primitive.getMaterial() !== material) {
				throw new RuleError("rigid-skin-material", name, "all primitives must share one material");
			}
			const position = primitive.getAttribute("POSITION")?.getArray();
			if (!position) throw new RuleError("rigid-skin-attributes", name, "primitive without POSITION");
			const normal = primitive.getAttribute("NORMAL")?.getArray();
			const uv = primitive.getAttribute("TEXCOORD_0")?.getArray();
			const base = positions.length / 3;
			for (let v = 0; v < position.length / 3; v++) {
				positions.push(
					...transformPoint(
						world,
						position[v * 3] ?? 0,
						position[v * 3 + 1] ?? 0,
						position[v * 3 + 2] ?? 0,
					),
				);
				normals.push(
					...(normal
						? transformNormal(
								world,
								normal[v * 3] ?? 0,
								normal[v * 3 + 1] ?? 0,
								normal[v * 3 + 2] ?? 0,
							)
						: [0, 1, 0]),
				);
				uvs.push(uv?.[v * 2] ?? 0, uv?.[v * 2 + 1] ?? 0);
				joints.push(joint);
			}
			const source = primitive.getIndices()?.getArray();
			const count = source ? source.length : position.length / 3;
			for (let i = 0; i < count; i++) indices.push(base + (source ? (source[i] ?? 0) : i));
		}
	}

	const buffer = root.listBuffers()[0] ?? document.createBuffer();
	const accessor = (
		type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT4",
		array: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
	): Accessor => document.createAccessor().setType(type).setBuffer(buffer).setArray(array);
	const primitive = document
		.createPrimitive()
		.setAttribute("POSITION", accessor("VEC3", new Float32Array(positions)))
		.setAttribute("NORMAL", accessor("VEC3", new Float32Array(normals)))
		.setAttribute("TEXCOORD_0", accessor("VEC2", new Float32Array(uvs)))
		.setIndices(
			accessor(
				"SCALAR",
				positions.length / 3 > 0xffff ? new Uint32Array(indices) : new Uint16Array(indices),
			),
		);
	if (material) primitive.setMaterial(material);

	const vertexCount = positions.length / 3;
	let skin = null as ReturnType<Document["createSkin"]> | null;
	if (options.skin) {
		const jointData = new Uint16Array(vertexCount * 4);
		const weightData = new Float32Array(vertexCount * 4);
		for (let v = 0; v < vertexCount; v++) {
			jointData[v * 4] = joints[v] ?? 0;
			weightData[v * 4] = 1;
		}
		primitive
			.setAttribute("JOINTS_0", accessor("VEC4", jointData))
			.setAttribute("WEIGHTS_0", accessor("VEC4", weightData));
		const inverseBind = new Float32Array(nodes.length * 16);
		nodes.forEach((n, i) => {
			inverseBind.set(invertAffine(n.getWorldMatrix() as Mat4), i * 16);
		});
		skin = document.createSkin(`${name}_skin`).setInverseBindMatrices(accessor("MAT4", inverseBind));
		for (const node of nodes) skin.addJoint(node);
	}

	const staleAccessors = new Set<ReturnType<Primitive["getIndices"]>>();
	for (const old of oldPrimitives) {
		for (const semantic of old.listSemantics()) staleAccessors.add(old.getAttribute(semantic));
		staleAccessors.add(old.getIndices());
	}
	const staleMeshes = new Set(meshNodes.map((n) => n.getMesh()));
	for (const node of meshNodes) node.setMesh(null);
	for (const mesh of staleMeshes) mesh?.dispose();
	for (const stale of staleAccessors) stale?.dispose();

	const meshNode = document
		.createNode(`${name}_mesh`)
		.setMesh(document.createMesh(name).addPrimitive(primitive));
	if (skin) meshNode.setSkin(skin);
	scene.addChild(meshNode);
}
