import type { Animation, AnimationChannel, Document, Node } from "@gltf-transform/core";
import { RuleError } from "../assets-build/rules";

export const VAT_FPS = 12;
/** Texture size every target (WebGL2 mobile, Android WebView) is guaranteed to support. */
export const VAT_MAX_TEXTURE_SIZE = 4096;
/** Art Bible §8: clips every common enemy ships with. */
export const ENEMY_CLIPS = ["idle", "walk", "attack", "hit", "death"] as const;

export interface VatClip {
	/** First and last row of the clip, both inclusive (the Babylon shader convention). */
	from: number;
	to: number;
}

export interface VatMeta {
	format: "rgba32f";
	fps: number;
	boneCount: number;
	/** Texels per row: (boneCount + 1) * 4, one mat4 per bone as in Babylon's VertexAnimationBaker. */
	width: number;
	height: number;
	clips: Record<string, VatClip>;
}

export interface VatResult {
	data: Float32Array;
	meta: VatMeta;
}

export type Mat4 = number[];

export function multiply(a: Mat4, b: Mat4): Mat4 {
	const out = new Array<number>(16).fill(0);
	for (let c = 0; c < 4; c++) {
		for (let r = 0; r < 4; r++) {
			let sum = 0;
			for (let k = 0; k < 4; k++) sum += (a[k * 4 + r] ?? 0) * (b[c * 4 + k] ?? 0);
			out[c * 4 + r] = sum;
		}
	}
	return out;
}

/** Inverse of an affine column-major mat4 (last row 0,0,0,1); glTF node transforms are always affine. */
export function invertAffine(m: Mat4): Mat4 {
	// Row-major view of the 3x3 block: row r = (m[r], m[4 + r], m[8 + r]).
	const [a, b, c, d, e, f, g, h, i] = [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]].map(
		(v) => v ?? 0,
	) as [number, number, number, number, number, number, number, number, number];
	const tx = m[12] ?? 0;
	const ty = m[13] ?? 0;
	const tz = m[14] ?? 0;
	const co0 = e * i - f * h;
	const co1 = f * g - d * i;
	const co2 = d * h - e * g;
	const det = a * co0 + b * co1 + c * co2;
	if (Math.abs(det) < 1e-12)
		throw new RuleError("vat-singular", "skin", "joint base transform is not invertible");
	const r = 1 / det;
	// Inverse rows (row-major): inv[row][col].
	const inv = [
		[co0 * r, (c * h - b * i) * r, (b * f - c * e) * r],
		[co1 * r, (a * i - c * g) * r, (c * d - a * f) * r],
		[co2 * r, (b * g - a * h) * r, (a * e - b * d) * r],
	] as const;
	const out: Mat4 = identity();
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) out[col * 4 + row] = inv[row]?.[col] ?? 0;
		out[12 + row] = -((inv[row]?.[0] ?? 0) * tx + (inv[row]?.[1] ?? 0) * ty + (inv[row]?.[2] ?? 0) * tz);
	}
	return out;
}

function ancestors(node: Node): Node[] {
	const chain: Node[] = [];
	for (let n: Node | null = node; n; n = n.getParentNode()) chain.push(n);
	return chain;
}

/**
 * World matrix of the space the skeleton lives in: the parent of the skeleton root, which is the single top
 * joint or, with several top joints, their lowest common ancestor (this is what Babylon's loader uses).
 * Ancestors that are not joints would otherwise be applied twice, once in the bake and once more by the mesh
 * world matrix.
 *
 * shortcut: the base is evaluated at the rest pose, so a non-joint ancestor that is animated (root motion)
 * would not be tracked; rigid-skin models (D5) never animate non-joint nodes.
 */
function skeletonBase(joints: readonly Node[]): Mat4 {
	const jointSet = new Set<Node>(joints);
	const tops = joints.filter(
		(j) =>
			!ancestors(j)
				.slice(1)
				.some((a) => jointSet.has(a)),
	);
	const first = tops[0];
	if (!first) return identity();
	const skeletonRoot =
		tops.length === 1 ? first : ancestors(first).find((c) => tops.every((t) => ancestors(t).includes(c)));
	return (skeletonRoot?.getParentNode()?.getWorldMatrix() as Mat4 | undefined) ?? identity();
}

function slerp(a: readonly number[], b: readonly number[], t: number): number[] {
	let dot =
		(a[0] ?? 0) * (b[0] ?? 0) +
		(a[1] ?? 0) * (b[1] ?? 0) +
		(a[2] ?? 0) * (b[2] ?? 0) +
		(a[3] ?? 0) * (b[3] ?? 0);
	const sign = dot < 0 ? -1 : 1;
	dot *= sign;
	let wa = 1 - t;
	let wb = t;
	if (dot < 0.9995) {
		const theta = Math.acos(dot);
		const sin = Math.sin(theta);
		wa = Math.sin((1 - t) * theta) / sin;
		wb = Math.sin(t * theta) / sin;
	}
	const out = [0, 1, 2, 3].map((i) => wa * (a[i] ?? 0) + sign * wb * (b[i] ?? 0));
	const length = Math.hypot(...out) || 1;
	return out.map((v) => v / length);
}

function sample(channel: AnimationChannel, time: number, name: string): number[] {
	const sampler = channel.getSampler();
	if (!sampler) throw new RuleError("vat-sampler", name, "channel without sampler");
	const interpolation = sampler.getInterpolation();
	if (interpolation === "CUBICSPLINE") {
		throw new RuleError("vat-interpolation", name, "CUBICSPLINE is not supported, export LINEAR or STEP");
	}
	const times = sampler.getInput()?.getArray();
	const values = sampler.getOutput()?.getArray();
	if (!times || !values || times.length === 0) throw new RuleError("vat-sampler", name, "empty sampler");
	const size = channel.getTargetPath() === "rotation" ? 4 : 3;
	const at = (i: number): number[] => Array.from(values.subarray(i * size, i * size + size));
	const last = times.length - 1;
	if (time <= (times[0] ?? 0)) return at(0);
	if (time >= (times[last] ?? 0)) return at(last);
	let i = 0;
	while ((times[i + 1] ?? 0) <= time) i++;
	if (interpolation === "STEP") return at(i);
	const t = (time - (times[i] ?? 0)) / ((times[i + 1] ?? 0) - (times[i] ?? 0));
	const a = at(i);
	const b = at(i + 1);
	if (size === 4) return slerp(a, b, t);
	return a.map((v, k) => v + ((b[k] ?? 0) - v) * t);
}

function clipDuration(animation: Animation): number {
	let duration = 0;
	for (const channel of animation.listChannels()) {
		const times = channel.getSampler()?.getInput()?.getArray();
		duration = Math.max(duration, times?.[times.length - 1] ?? 0);
	}
	return duration;
}

/** Sets the TRS of every node the animation targets to its value at `time`; untouched nodes keep their pose. */
export function applyAnimationAt(animation: Animation, time: number, name: string): void {
	for (const channel of animation.listChannels()) {
		const node = channel.getTargetNode();
		const path = channel.getTargetPath();
		if (!node) continue;
		const value = sample(channel, time, name);
		if (path === "translation") node.setTranslation(value as [number, number, number]);
		else if (path === "rotation") node.setRotation(value as [number, number, number, number]);
		else if (path === "scale") node.setScale(value as [number, number, number]);
	}
}

export function assertVatLimits(name: string, width: number, height: number): void {
	if (width > VAT_MAX_TEXTURE_SIZE) {
		throw new RuleError("vat-width", name, `texture width ${width} exceeds ${VAT_MAX_TEXTURE_SIZE}`);
	}
	if (height > VAT_MAX_TEXTURE_SIZE) {
		throw new RuleError("vat-height", name, `texture height ${height} exceeds ${VAT_MAX_TEXTURE_SIZE}`);
	}
}

/**
 * Bakes per-frame skin matrices (inverse(base) * jointWorld * inverseBind, glTF column-major, which is the layout Babylon's
 * Matrix uses) into the row layout of VertexAnimationBaker: row = frame, bone b at texels [4b, 4b + 3].
 */
export function bakeVat(
	name: string,
	document: Document,
	required: readonly string[] = ENEMY_CLIPS,
	fps: number = VAT_FPS,
): VatResult {
	const root = document.getRoot();
	const skins = root.listSkins();
	const skin = skins[0];
	if (skins.length !== 1 || !skin)
		throw new RuleError("vat-single-skin", name, `expected 1 skin, found ${skins.length}`);
	const joints = skin.listJoints();
	const ibm = skin.getInverseBindMatrices();
	const animations = new Map(root.listAnimations().map((a) => [a.getName(), a]));
	for (const clip of required) {
		if (!animations.has(clip)) throw new RuleError("vat-clips", name, `missing clip "${clip}"`);
	}

	const nodes: Node[] = root.listNodes();
	const rest = nodes.map((n) => ({
		t: n.getTranslation(),
		r: n.getRotation(),
		s: n.getScale(),
	}));
	const restore = (): void => {
		nodes.forEach((n, i) => {
			const r = rest[i];
			if (r) n.setTranslation(r.t).setRotation(r.r).setScale(r.s);
		});
	};

	const inverseBase = invertAffine(skeletonBase(joints));
	const width = (joints.length + 1) * 4;
	const rows: number[][] = [];
	const clips: Record<string, VatClip> = {};
	const ordered = [...required, ...[...animations.keys()].filter((k) => !required.includes(k)).sort()];
	for (const clipName of ordered) {
		const animation = animations.get(clipName);
		if (!animation) continue;
		const frames = Math.ceil(clipDuration(animation) * fps - 1e-6) + 1;
		const from = rows.length;
		for (let f = 0; f < frames; f++) {
			restore();
			applyAnimationAt(animation, f / fps, name);
			const row = new Array<number>(width * 4).fill(0);
			joints.forEach((joint, b) => {
				const inverseBind = ibm
					? (ibm.getElement(b, new Array<number>(16).fill(0)) as Mat4)
					: identity();
				row.splice(
					b * 16,
					16,
					...multiply(multiply(inverseBase, joint.getWorldMatrix() as Mat4), inverseBind),
				);
			});
			// Slot after the last bone mirrors Babylon's (bones + 1) layout; keep it identity so stray indices are harmless.
			row.splice(joints.length * 16, 16, ...identity());
			rows.push(row);
		}
		clips[clipName] = { from, to: rows.length - 1 };
	}
	restore();

	assertVatLimits(name, width, rows.length);
	const data = new Float32Array(rows.length * width * 4);
	rows.forEach((row, i) => {
		data.set(row, i * width * 4);
	});
	return {
		data,
		meta: { format: "rgba32f", fps, boneCount: joints.length, width, height: rows.length, clips },
	};
}

export function identity(): Mat4 {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
