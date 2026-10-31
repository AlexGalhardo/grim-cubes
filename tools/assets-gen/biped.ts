import { REQUIRED_CLIPS } from "../assets-build/rules";
import type { ClipDef, GroupDef, ModelDef, PartDef, TrackDef } from "./model";
import type { TokenName } from "./palette";

export interface BipedSpec {
	name: string;
	category: "hero" | "enemies" | "bosses" | "npc";
	texture: 32 | 64;
	/** Pixels (64 px per unit). */
	legH: number;
	legW: number;
	legD: number;
	hipX: number;
	torsoH: number;
	torsoW: number;
	torsoD: number;
	headW: number;
	headH: number;
	headD: number;
	armW: number;
	armLen: number;
	/** Forward lean of the body group in degrees (multiples of 22.5). */
	hunch?: number;
	/** Z offsets in pixels: hind legs, forelegs (the arms) and head, for quadrupeds with a long torso. */
	legZ?: number;
	armZ?: number;
	headZ?: number;
	socket: "weapon_socket" | "hit_socket";
	colors: { legs: TokenName; torso: TokenName; head: TokenName; arms: TokenName };
	extraGroups?: readonly GroupDef[];
	extraParts?: readonly PartDef[];
}

type Keys = readonly (readonly [number, number, number, number])[];

const rot = (group: string, keys: Keys): TrackDef => ({ group, channel: "rotation", keys });
const pos = (group: string, keys: Keys): TrackDef => ({ group, channel: "position", keys });
const scale = (group: string, keys: Keys): TrackDef => ({ group, channel: "scale", keys });
/** Rotation about X only: [time, degrees]. */
const rx = (group: string, pairs: readonly (readonly [number, number])[]): TrackDef =>
	rot(
		group,
		pairs.map(([t, d]) => [t, d, 0, 0] as const),
	);

function swing(amplitude: number, frames: number): TrackDef[] {
	const d = frames / 12;
	const key = (a: number): readonly [number, number][] => [
		[0, 0],
		[d / 4, a],
		[d / 2, 0],
		[(3 * d) / 4, -a],
		[d, 0],
	];
	return [
		rx("leg_l", key(amplitude)),
		rx("leg_r", key(-amplitude)),
		rx("arm_l", key(-amplitude * 0.7)),
		rx("arm_r", key(amplitude * 0.7)),
	];
}

/** One clip per Art Bible §8 name; amplitudes are authored, not data (they only shape the look). */
function clip(name: string, spec: BipedSpec): ClipDef {
	const height = spec.legH + spec.torsoH + spec.headH;
	switch (name) {
		case "idle":
			return {
				name,
				frames: 6,
				tracks: [
					rx("body", [
						[0, 0],
						[0.25, 3],
						[0.5, 0],
					]),
					rx("head", [
						[0, 0],
						[0.25, -3],
						[0.5, 0],
					]),
				],
			};
		case "walk":
			return { name, frames: 6, tracks: swing(35, 6) };
		case "run":
			return { name, frames: 4, tracks: swing(50, 4) };
		case "attack":
		case "attack_melee":
			return {
				name,
				frames: 3,
				tracks: [
					rx("arm_r", [
						[0, 0],
						[1 / 12, -100],
						[2 / 12, 35],
						[3 / 12, 0],
					]),
					rx("body", [
						[0, 0],
						[1 / 12, -10],
						[2 / 12, 10],
						[3 / 12, 0],
					]),
				],
			};
		case "attack_ranged":
			return {
				name,
				frames: 2,
				tracks: [
					rx("arm_r", [
						[0, 0],
						[1 / 12, -90],
						[2 / 12, -90],
					]),
				],
			};
		case "hit":
			return {
				name,
				frames: 1,
				tracks: [
					rx("body", [
						[0, 0],
						[1 / 12, -15],
					]),
				],
			};
		case "dash":
			return {
				name,
				frames: 3,
				tracks: [
					rx("body", [
						[0, 0],
						[3 / 12, 45],
					]),
					...swing(40, 3),
				],
			};
		case "death":
			return {
				name,
				frames: 4,
				tracks: [
					rx("body", [
						[0, 0],
						[4 / 12, 90],
					]),
					pos("root", [
						[0, 0, 0, 0],
						[4 / 12, 0, -spec.legH / 2, 0],
					]),
				],
			};
		case "victory":
			return {
				name,
				frames: 6,
				tracks: [
					rx("arm_r", [
						[0, 0],
						[0.25, -160],
						[0.5, 0],
					]),
					rx("arm_l", [
						[0, 0],
						[0.25, -160],
						[0.5, 0],
					]),
				],
			};
		case "enrage":
			return {
				name,
				frames: 6,
				tracks: [
					scale("body", [
						[0, 1, 1, 1],
						[0.25, 1.1, 1.1, 1.1],
						[0.5, 1, 1, 1],
					]),
				],
			};
		case "phase_change":
			return {
				name,
				frames: 6,
				tracks: [
					rx("body", [
						[0, 0],
						[0.25, -22.5],
						[0.5, 0],
					]),
					rx("head", [
						[0, 0],
						[0.25, 22.5],
						[0.5, 0],
					]),
				],
			};
		case "death_execution":
			return {
				name,
				frames: 8,
				tracks: [
					rx("body", [
						[0, 0],
						[8 / 12, 90],
					]),
					pos("root", [
						[0, 0, 0, 0],
						[8 / 12, 0, -spec.legH / 2, 0],
					]),
				],
			};
		case "emerge":
			return {
				name,
				frames: 6,
				tracks: [
					pos("root", [
						[0, 0, -height, 0],
						[0.5, 0, 0, 0],
					]),
				],
			};
		case "submerge":
			return {
				name,
				frames: 6,
				tracks: [
					pos("root", [
						[0, 0, 0, 0],
						[0.5, 0, -height, 0],
					]),
				],
			};
		case "talk":
			return {
				name,
				frames: 4,
				tracks: [
					rx("head", [
						[0, 0],
						[1 / 12, 10],
						[2 / 12, -5],
						[3 / 12, 10],
						[4 / 12, 0],
					]),
				],
			};
		case "hand_over":
			return {
				name,
				frames: 4,
				tracks: [
					rx("arm_r", [
						[0, 0],
						[2 / 12, -70],
						[4 / 12, 0],
					]),
				],
			};
		default:
			throw new Error(`${spec.name}: no clip template for "${name}"`);
	}
}

/** Builds the groups, parts and every mandatory clip of a humanoid; `extra*` adds the identity details. */
export function biped(spec: BipedSpec): ModelDef {
	const { legH, legW, legD, hipX, torsoH, torsoW, torsoD, headW, headH, headD, armW, armLen } = spec;
	const shoulderY = legH + torsoH - 4;
	const armX = torsoW / 2 + armW / 2;
	const legZ = spec.legZ ?? 0;
	const armZ = spec.armZ ?? 0;
	const headZ = spec.headZ ?? 0;
	const groups: GroupDef[] = [
		{ name: "root", parent: null, origin: [0, 0, 0] },
		{ name: "leg_l", parent: "root", origin: [-hipX, legH, legZ] },
		{ name: "leg_r", parent: "root", origin: [hipX, legH, legZ] },
		{
			name: "body",
			parent: "root",
			origin: [0, legH, 0],
			...(spec.hunch ? { rotation: [spec.hunch, 0, 0] as [number, number, number] } : {}),
		},
		{ name: "head", parent: "body", origin: [0, legH + torsoH, headZ] },
		{ name: "arm_l", parent: "body", origin: [-armX, shoulderY, armZ] },
		{ name: "arm_r", parent: "body", origin: [armX, shoulderY, armZ] },
		spec.socket === "weapon_socket"
			? { name: "weapon_socket", parent: "arm_r", origin: [armX, shoulderY - armLen, armW / 2 + 2] }
			: { name: "hit_socket", parent: "body", origin: [0, legH + torsoH * 0.6, torsoD / 2 + 1] },
		...(spec.extraGroups ?? []),
	];
	const parts: PartDef[] = [
		{
			group: "leg_l",
			from: [-hipX - legW / 2, 0, legZ - legD / 2],
			to: [-hipX + legW / 2, legH, legZ + legD / 2],
			color: spec.colors.legs,
		},
		{
			group: "leg_r",
			from: [hipX - legW / 2, 0, legZ - legD / 2],
			to: [hipX + legW / 2, legH, legZ + legD / 2],
			color: spec.colors.legs,
		},
		{
			group: "body",
			from: [-torsoW / 2, legH, -torsoD / 2],
			to: [torsoW / 2, legH + torsoH, torsoD / 2],
			color: spec.colors.torso,
		},
		{
			group: "head",
			from: [-headW / 2, legH + torsoH, headZ - headD / 2],
			to: [headW / 2, legH + torsoH + headH, headZ + headD / 2],
			color: spec.colors.head,
		},
		{
			group: "arm_l",
			from: [-armX - armW / 2, shoulderY - armLen, armZ - armW / 2],
			to: [-armX + armW / 2, shoulderY, armZ + armW / 2],
			color: spec.colors.arms,
		},
		{
			group: "arm_r",
			from: [armX - armW / 2, shoulderY - armLen, armZ - armW / 2],
			to: [armX + armW / 2, shoulderY, armZ + armW / 2],
			color: spec.colors.arms,
		},
		...(spec.extraParts ?? []),
	];
	return {
		name: spec.name,
		category: spec.category,
		texture: spec.texture,
		groups,
		parts,
		clips: REQUIRED_CLIPS[spec.category].map((name) => clip(name, spec)),
	};
}
