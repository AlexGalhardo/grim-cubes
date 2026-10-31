import { Document } from "@gltf-transform/core";
import { type Category, RuleError } from "./rules";

export type Vec3 = [number, number, number];

export interface BbFace {
	uv: [number, number, number, number];
}

export interface BbElement {
	uuid: string;
	name: string;
	type: string;
	from: Vec3;
	to: Vec3;
	origin?: Vec3;
	rotation?: Vec3;
	inflate?: number;
	faces?: Partial<Record<FaceName, BbFace>>;
}

export interface BbGroup {
	uuid: string;
	name: string;
	origin: Vec3;
	rotation?: Vec3;
	children: (string | BbGroup)[];
}

export interface BbKeyframe {
	channel: "rotation" | "position" | "scale";
	time: number;
	data_points: { x: number | string; y: number | string; z: number | string }[];
}

export interface BbAnimation {
	name: string;
	length: number;
	animators: Record<string, { name?: string; keyframes: BbKeyframe[] }>;
}

export interface BbModel {
	name?: string;
	resolution: { width: number; height: number };
	elements: BbElement[];
	outliner: (string | BbGroup)[];
	textures?: { name?: string; width?: number; height?: number }[];
	animations?: BbAnimation[];
}

type FaceName = "north" | "south" | "east" | "west" | "up" | "down";
const FACES: readonly FaceName[] = ["north", "south", "east", "west", "up", "down"];

/** Art Bible §5.1 element budget per category (the largest class of each; per-class tightening is a later pass). */
export const ELEMENT_BUDGET: Readonly<Record<Category, number>> = {
	hero: 24,
	enemies: 20,
	bosses: 48,
	npc: 28,
	props: 16,
	tiles: 8,
	weapons: 8,
};

/** Art Bible §5: characters 64 px per unit, props and terrain 32. */
export const PIXELS_PER_UNIT: Readonly<Record<Category, number>> = {
	hero: 64,
	enemies: 64,
	bosses: 64,
	npc: 64,
	props: 32,
	tiles: 32,
	weapons: 64,
};

const ROTATION_STEP = 22.5;
const CHARACTER: readonly Category[] = ["hero", "enemies", "bosses", "npc"];

function fail(rule: string, asset: string, detail: string): never {
	throw new RuleError(rule, asset, detail);
}

function groups(entries: readonly (string | BbGroup)[], out: BbGroup[] = []): BbGroup[] {
	for (const entry of entries) {
		if (typeof entry === "string") continue;
		out.push(entry);
		groups(entry.children, out);
	}
	return out;
}

export function parseBbmodel(name: string, text: string): BbModel {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return fail("bbmodel-json", name, "not valid JSON");
	}
	const model = json as Partial<BbModel>;
	if (!model || !Array.isArray(model.elements) || !Array.isArray(model.outliner) || !model.resolution) {
		return fail("bbmodel-json", name, "missing elements, outliner or resolution");
	}
	return model as BbModel;
}

/** SDD 09 §2.1 rules for a `.bbmodel`; the PNG itself (colors, forbidden pure white/black) is checked separately. */
export function validateBbmodel(name: string, category: Category, model: BbModel): void {
	for (const element of model.elements) {
		if (element.type !== "cube" && element.type !== "quad") {
			fail(
				"bbmodel-element-type",
				name,
				`element "${element.name}" is a ${element.type}; only cube and quad are allowed`,
			);
		}
		for (const angle of element.rotation ?? []) {
			if (Math.abs(angle / ROTATION_STEP - Math.round(angle / ROTATION_STEP)) > 1e-6) {
				fail(
					"bbmodel-rotation",
					name,
					`element "${element.name}" rotates ${angle} degrees, not a multiple of ${ROTATION_STEP}`,
				);
			}
		}
		const size = [0, 1, 2].map((i) => Math.abs((element.to[i] ?? 0) - (element.from[i] ?? 0)));
		const flat = size.filter((s) => s === 0).length;
		const thin = size.some((s) => s > 0 && s < 1);
		if (flat > 1 || thin || (flat === 1 && element.type === "cube")) {
			fail(
				"bbmodel-element-size",
				name,
				`element "${element.name}" is degenerate (${size.join(" x ")} px)`,
			);
		}
	}
	for (const group of groups(model.outliner)) {
		for (const angle of group.rotation ?? []) {
			if (Math.abs(angle / ROTATION_STEP - Math.round(angle / ROTATION_STEP)) > 1e-6) {
				fail(
					"bbmodel-rotation",
					name,
					`group "${group.name}" rotates ${angle} degrees, not a multiple of ${ROTATION_STEP}`,
				);
			}
		}
	}
	if (model.elements.length > ELEMENT_BUDGET[category]) {
		fail(
			"bbmodel-element-budget",
			name,
			`${model.elements.length} elements, ${category} budget is ${ELEMENT_BUDGET[category]}`,
		);
	}

	const groupNames = new Set(groups(model.outliner).map((g) => g.name));
	const required = CHARACTER.includes(category) ? ["root", "body", "head"] : ["root"];
	for (const needed of required) {
		if (!groupNames.has(needed)) fail("bbmodel-groups", name, `missing group "${needed}"`);
	}
	if (CHARACTER.includes(category)) {
		const socket = category === "hero" || category === "npc" ? "weapon_socket" : "hit_socket";
		if (!groupNames.has(socket)) fail("bbmodel-socket", name, `missing group "${socket}"`);
	}

	const textures = model.textures ?? [];
	if (textures.length !== 1) fail("bbmodel-texture", name, `expected 1 texture, found ${textures.length}`);
	const { width, height } = model.resolution;
	if (width % 32 !== 0 || height % 32 !== 0) {
		fail("bbmodel-texture", name, `resolution ${width}x${height} is not a multiple of 32`);
	}
}

type Mat3 = number[];

/** Euler degrees to a rotation matrix, R = Rz * Ry * Rx (Blockbench's ZYX order). */
function euler(rotation: readonly number[] | undefined): Mat3 {
	const [rx, ry, rz] = (rotation ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180) as Vec3;
	const [cx, sx, cy, sy, cz, sz] = [
		Math.cos(rx),
		Math.sin(rx),
		Math.cos(ry),
		Math.sin(ry),
		Math.cos(rz),
		Math.sin(rz),
	] as const;
	// Row-major Rz * Ry * Rx.
	return [
		cz * cy,
		cz * sy * sx - sz * cx,
		cz * sy * cx + sz * sx,
		sz * cy,
		sz * sy * sx + cz * cx,
		sz * sy * cx - cz * sx,
		-sy,
		cy * sx,
		cy * cx,
	];
}

function apply(m: Mat3, v: Vec3): Vec3 {
	return [
		(m[0] ?? 0) * v[0] + (m[1] ?? 0) * v[1] + (m[2] ?? 0) * v[2],
		(m[3] ?? 0) * v[0] + (m[4] ?? 0) * v[1] + (m[5] ?? 0) * v[2],
		(m[6] ?? 0) * v[0] + (m[7] ?? 0) * v[1] + (m[8] ?? 0) * v[2],
	];
}

function toQuaternion(m: Mat3): [number, number, number, number] {
	const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m as [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	];
	const trace = m00 + m11 + m22;
	let q: [number, number, number, number];
	if (trace > 0) {
		const s = Math.sqrt(trace + 1) * 2;
		q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
	} else if (m00 > m11 && m00 > m22) {
		const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
		q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
	} else if (m11 > m22) {
		const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
		q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
	} else {
		const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
		q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
	}
	return q;
}

function multiplyQuaternion(a: readonly number[], b: readonly number[]): [number, number, number, number] {
	const [ax, ay, az, aw] = a as [number, number, number, number];
	const [bx, by, bz, bw] = b as [number, number, number, number];
	return [
		aw * bx + ax * bw + ay * bz - az * by,
		aw * by - ax * bz + ay * bw + az * bx,
		aw * bz + ax * by - ay * bx + az * bw,
		aw * bw - ax * bx - ay * by - az * bz,
	];
}

const num = (v: number | string | undefined): number => Number(v ?? 0);

/** Corners of one face seen from outside (top-left, top-right, bottom-right, bottom-left) and its outward normal. */
function faceCorners(
	face: FaceName,
	lo: Vec3,
	hi: Vec3,
): { corners: [Vec3, Vec3, Vec3, Vec3]; normal: Vec3 } {
	const [x0, y0, z0] = lo;
	const [x1, y1, z1] = hi;
	switch (face) {
		case "north": // -Z, +X on the left
			return {
				corners: [
					[x1, y1, z0],
					[x0, y1, z0],
					[x0, y0, z0],
					[x1, y0, z0],
				],
				normal: [0, 0, -1],
			};
		case "south": // +Z, -X on the left
			return {
				corners: [
					[x0, y1, z1],
					[x1, y1, z1],
					[x1, y0, z1],
					[x0, y0, z1],
				],
				normal: [0, 0, 1],
			};
		case "east": // +X, +Z on the left
			return {
				corners: [
					[x1, y1, z1],
					[x1, y1, z0],
					[x1, y0, z0],
					[x1, y0, z1],
				],
				normal: [1, 0, 0],
			};
		case "west": // -X, -Z on the left
			return {
				corners: [
					[x0, y1, z0],
					[x0, y1, z1],
					[x0, y0, z1],
					[x0, y0, z0],
				],
				normal: [-1, 0, 0],
			};
		case "up": // +Y, top of the UV is north (-Z)
			return {
				corners: [
					[x0, y1, z0],
					[x1, y1, z0],
					[x1, y1, z1],
					[x0, y1, z1],
				],
				normal: [0, 1, 0],
			};
		case "down": // -Y, top of the UV is south (+Z)
			return {
				corners: [
					[x0, y0, z1],
					[x1, y0, z1],
					[x1, y0, z0],
					[x0, y0, z0],
				],
				normal: [0, -1, 0],
			};
	}
}

/**
 * Builds the glTF a Blockbench export would produce: one node per group (origin = pivot, rotation = rest
 * rotation), one mesh per group holding its cubes, and animations as node TRS tracks. Conventions
 * (face orientation, ZYX Euler, rotation keyframes added on top of the rest rotation) follow Blockbench's
 * generic model and should be re-checked against a real export when the PO refines models.
 */
export function bbmodelToDocument(name: string, category: Category, model: BbModel): Document {
	const ppu = PIXELS_PER_UNIT[category];
	const doc = new Document();
	const buffer = doc.createBuffer();
	const material = doc.createMaterial("material");
	const scene = doc.createScene();
	const byId = new Map(model.elements.map((e) => [e.uuid, e]));
	const nodeOf = new Map<string, ReturnType<Document["createNode"]>>();
	const restRotation = new Map<string, [number, number, number, number]>();
	const { width: texWidth, height: texHeight } = model.resolution;

	const build = (
		group: BbGroup,
		parent: ReturnType<Document["createNode"]> | null,
		parentOrigin: Vec3,
	): void => {
		const q = toQuaternion(euler(group.rotation));
		const node = doc
			.createNode(group.name)
			.setTranslation([
				(group.origin[0] - parentOrigin[0]) / ppu,
				(group.origin[1] - parentOrigin[1]) / ppu,
				(group.origin[2] - parentOrigin[2]) / ppu,
			])
			.setRotation(q);
		nodeOf.set(group.uuid, node);
		restRotation.set(group.uuid, q);
		if (parent) parent.addChild(node);
		else scene.addChild(node);

		const positions: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];
		for (const child of group.children) {
			if (typeof child !== "string") continue;
			const element = byId.get(child);
			if (!element) fail("bbmodel-outliner", name, `outliner references unknown element ${child}`);
			const origin = element.origin ?? element.from;
			const rotation = euler(element.rotation);
			const inflate = element.inflate ?? 0;
			const lo = element.from.map((v) => v - inflate) as Vec3;
			const hi = element.to.map((v) => v + inflate) as Vec3;
			for (const faceName of FACES) {
				const face = element.faces?.[faceName];
				const { corners, normal } = faceCorners(faceName, lo, hi);
				const area =
					Math.hypot(
						corners[1][0] - corners[0][0],
						corners[1][1] - corners[0][1],
						corners[1][2] - corners[0][2],
					) *
					Math.hypot(
						corners[3][0] - corners[0][0],
						corners[3][1] - corners[0][1],
						corners[3][2] - corners[0][2],
					);
				if (!face || area === 0) continue;
				const base = positions.length / 3;
				const [u0, v0, u1, v1] = face.uv;
				const faceUv: [number, number][] = [
					[u0 / texWidth, v0 / texHeight],
					[u1 / texWidth, v0 / texHeight],
					[u1 / texWidth, v1 / texHeight],
					[u0 / texWidth, v1 / texHeight],
				];
				corners.forEach((corner, i) => {
					const relative: Vec3 = [
						corner[0] - origin[0],
						corner[1] - origin[1],
						corner[2] - origin[2],
					];
					const turned = apply(rotation, relative);
					positions.push(
						(turned[0] + origin[0] - group.origin[0]) / ppu,
						(turned[1] + origin[1] - group.origin[1]) / ppu,
						(turned[2] + origin[2] - group.origin[2]) / ppu,
					);
					normals.push(...apply(rotation, normal));
					uvs.push(...(faceUv[i] ?? [0, 0]));
				});
				indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
			}
		}
		if (indices.length > 0) {
			const accessor = (
				type: "SCALAR" | "VEC2" | "VEC3",
				array: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer>,
			): ReturnType<Document["createAccessor"]> =>
				doc.createAccessor().setType(type).setBuffer(buffer).setArray(array);
			const primitive = doc
				.createPrimitive()
				.setAttribute("POSITION", accessor("VEC3", new Float32Array(positions)))
				.setAttribute("NORMAL", accessor("VEC3", new Float32Array(normals)))
				.setAttribute("TEXCOORD_0", accessor("VEC2", new Float32Array(uvs)))
				.setIndices(accessor("SCALAR", new Uint16Array(indices)))
				.setMaterial(material);
			node.setMesh(doc.createMesh(group.name).addPrimitive(primitive));
		}
		for (const child of group.children) {
			if (typeof child !== "string") build(child, node, group.origin);
		}
	};
	for (const entry of model.outliner) {
		if (typeof entry !== "string") build(entry, null, [0, 0, 0]);
	}

	for (const animation of model.animations ?? []) {
		const gltfAnimation = doc.createAnimation(animation.name);
		for (const [groupId, animator] of Object.entries(animation.animators)) {
			const node = nodeOf.get(groupId);
			if (!node) continue;
			for (const channel of ["rotation", "position", "scale"] as const) {
				const frames = animator.keyframes
					.filter((k) => k.channel === channel)
					.sort((a, b) => a.time - b.time);
				if (frames.length === 0) continue;
				const rest = restRotation.get(groupId) ?? [0, 0, 0, 1];
				const restTranslation = node.getTranslation();
				const output: number[] = [];
				for (const frame of frames) {
					const p = frame.data_points[0] ?? { x: 0, y: 0, z: 0 };
					const v: Vec3 = [num(p.x), num(p.y), num(p.z)];
					if (channel === "rotation")
						output.push(...multiplyQuaternion(rest, toQuaternion(euler(v))));
					else if (channel === "position") {
						output.push(
							restTranslation[0] + v[0] / ppu,
							restTranslation[1] + v[1] / ppu,
							restTranslation[2] + v[2] / ppu,
						);
					} else output.push(v[0], v[1], v[2]);
				}
				const sampler = doc
					.createAnimationSampler()
					.setInput(
						doc
							.createAccessor()
							.setType("SCALAR")
							.setBuffer(buffer)
							.setArray(new Float32Array(frames.map((f) => f.time))),
					)
					.setOutput(
						doc
							.createAccessor()
							.setType(channel === "rotation" ? "VEC4" : "VEC3")
							.setBuffer(buffer)
							.setArray(new Float32Array(output)),
					)
					.setInterpolation("LINEAR");
				gltfAnimation.addSampler(sampler).addChannel(
					doc
						.createAnimationChannel()
						.setTargetNode(node)
						.setTargetPath(channel === "position" ? "translation" : channel)
						.setSampler(sampler),
				);
			}
		}
	}
	return doc;
}
