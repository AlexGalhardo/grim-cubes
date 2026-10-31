import { PNG } from "pngjs";
import type { Vec3 } from "../assets-build/bbmodel";
import type { Category } from "../assets-build/rules";
import { BIOME_PROPS, BIOME_TILES } from "./biomes";
import { biped } from "./biped";
import { type GeneratedModel, type GroupDef, generate, type ModelDef, type PartDef } from "./model";
import { hexToRgb, TOKENS, type TokenName } from "./palette";

/** Tiny deterministic PRNG (mulberry32); tools cannot import packages/core, and tile noise must be byte-stable. */
function prng(seed: number): () => number {
	let a = seed | 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const ROOT: GroupDef = { name: "root", parent: null, origin: [0, 0, 0] };

/** A box from its centre-bottom: pixels, centred on x/z, standing on `y`. */
function box(
	group: string,
	color: PartDef["color"],
	w: number,
	h: number,
	d: number,
	x = 0,
	y = 0,
	z = 0,
	rotation?: Vec3,
): PartDef {
	return {
		group,
		from: [x - w / 2, y, z - d / 2],
		to: [x + w / 2, y + h, z + d / 2],
		color,
		...(rotation ? { rotation } : {}),
	};
}

/** Static model: only a `root` group, one texture swatch per colour. */
function prop(name: string, category: Category, parts: PartDef[]): ModelDef {
	return { name, category, texture: 32, groups: [ROOT], parts, clips: [] };
}

const heroSpec = {
	name: "hero",
	category: "hero",
	texture: 64,
	legH: 52,
	legW: 16,
	legD: 16,
	hipX: 10,
	torsoH: 44,
	torsoW: 30,
	torsoD: 20,
	headW: 26,
	headH: 26,
	headD: 26,
	armW: 14,
	armLen: 40,
	socket: "weapon_socket",
	colors: { legs: "iron", torso: "blood", head: "boneDark", arms: "blood" },
} as const;

/** Execution hooded in blood red with iron plate; the ember accent marks the hero (Art Bible §3.3). */
const hero = biped({
	...heroSpec,
	extraParts: [
		box("head", "emberLight", 30, 14, 30, 0, 52 + 44 + 14, 0),
		box("body", "iron", 32, 10, 22, 0, 52 + 30, 0),
		box("body", "iron", 20, 20, 4, 0, 52 + 18, 12),
		box("arm_l", "iron", 14, 10, 22, -22, 52 + 44 - 10, 0),
		box("arm_r", "iron", 14, 10, 22, 22, 52 + 44 - 10, 0),
	],
});

const husk = biped({
	name: "husk",
	category: "enemies",
	texture: 64,
	legH: 44,
	legW: 14,
	legD: 14,
	hipX: 9,
	torsoH: 38,
	torsoW: 30,
	torsoD: 18,
	headW: 22,
	headH: 22,
	headD: 22,
	armW: 12,
	armLen: 46,
	hunch: 22.5,
	socket: "hit_socket",
	colors: { legs: "stoneDark", torso: "boneDark", head: "bone", arms: "boneDark" },
	extraParts: [
		box("body", "graveGreen", 32, 8, 20, 0, 44 + 6, 0),
		box("body", "bone", 20, 14, 4, 0, 44 + 16, 11),
	],
});

const wail = biped({
	name: "wail",
	category: "enemies",
	texture: 64,
	legH: 16,
	legW: 8,
	legD: 8,
	hipX: 6,
	torsoH: 14,
	torsoW: 14,
	torsoD: 10,
	headW: 38,
	headH: 28,
	headD: 26,
	armW: 6,
	armLen: 22,
	socket: "hit_socket",
	colors: { legs: "mist", torso: "shadow", head: "bone", arms: "mist" },
	extraParts: [
		box("head", "bloodLight", 6, 4, 2, -6, 16 + 14 + 14, 14),
		box("head", "bloodLight", 6, 4, 2, 6, 16 + 14 + 14, 14),
	],
});

const gravedigger = biped({
	name: "gravedigger",
	category: "bosses",
	texture: 64,
	legH: 120,
	legW: 40,
	legD: 40,
	hipX: 28,
	torsoH: 110,
	torsoW: 110,
	torsoD: 60,
	headW: 60,
	headH: 60,
	headD: 60,
	armW: 36,
	armLen: 100,
	socket: "hit_socket",
	colors: { legs: "stoneDark", torso: "stone", arms: "rust", head: "stone" },
	extraGroups: [{ name: "shovel", parent: "arm_r", origin: [73, 230 - 100, 0] }],
	extraParts: [
		box("head", "emberLight", 66, 14, 66, 0, 120 + 110 + 52, 0),
		box("body", "rust", 116, 20, 66, 0, 120 + 80, 0),
		box("arm_l", "rust", 56, 24, 56, -83, 230 - 24, 0),
		box("arm_r", "rust", 56, 24, 56, 83, 230 - 24, 0),
		box("shovel", "stoneDark", 8, 150, 8, 73, 230 - 100 - 30, 30),
		box("shovel", "stoneDark", 44, 56, 6, 73, 230 - 100 - 86, 30),
	],
});

const merchant = biped({
	name: "bone_merchant",
	category: "npc",
	texture: 64,
	legH: 40,
	legW: 20,
	legD: 20,
	hipX: 10,
	torsoH: 70,
	torsoW: 36,
	torsoD: 28,
	headW: 30,
	headH: 36,
	headD: 30,
	armW: 14,
	armLen: 54,
	socket: "weapon_socket",
	colors: { legs: "shadow", torso: "mist", head: "bone", arms: "mist" },
	extraParts: [
		box("body", "shadow", 52, 36, 34, 0, 40 - 4, 0),
		box("head", "shadow", 36, 18, 36, 0, 40 + 70 + 24, 0),
		box("body", "emberLight", 8, 12, 8, 24, 40 + 20, 20),
	],
});

/** The Swamp Matriarch (round 20): a hunched boss in rotten wood and moss, same rig as the Gravedigger. */
const matriarch = biped({
	name: "swamp_matriarch",
	category: "bosses",
	texture: 64,
	legH: 90,
	legW: 36,
	legD: 36,
	hipX: 30,
	torsoH: 120,
	torsoW: 120,
	torsoD: 70,
	headW: 56,
	headH: 56,
	headD: 56,
	armW: 30,
	armLen: 130,
	socket: "hit_socket",
	colors: { legs: "boneDark", torso: "graveGreen", arms: "boneDark", head: "bone" },
	extraParts: [
		box("head", "graveGreenLight", 62, 12, 62, 0, 90 + 120 + 44, 0),
		box("head", "graveGreen", 14, 30, 14, -22, 90 + 120 + 56, 0),
		box("head", "graveGreen", 14, 38, 14, 22, 90 + 120 + 56, 0),
		box("body", "boneDark", 128, 22, 76, 0, 90 + 90, 0),
		box("arm_l", "graveGreenLight", 40, 16, 40, -88, 210 - 16, 0),
		box("arm_r", "graveGreenLight", 40, 16, 40, 88, 210 - 16, 0),
		box("body", "graveGreenLight", 10, 10, 6, 0, 90 + 70, 38),
	],
});

/** The Forgemaster (round 30): a hulking smith in black iron with a hammer and a furnace glow. */
const forgemaster = biped({
	name: "forgemaster",
	category: "bosses",
	texture: 64,
	legH: 100,
	legW: 44,
	legD: 44,
	hipX: 32,
	torsoH: 130,
	torsoW: 130,
	torsoD: 80,
	headW: 56,
	headH: 56,
	headD: 56,
	armW: 40,
	armLen: 120,
	socket: "hit_socket",
	colors: { legs: "ironDark", torso: "iron", arms: "ironDark", head: "iron" },
	extraGroups: [{ name: "hammer", parent: "arm_r", origin: [90, 250 - 120, 0] }],
	extraParts: [
		box("head", "emberLight", 62, 10, 62, 0, 100 + 130 + 46, 0),
		box("body", "rust", 134, 22, 84, 0, 100 + 100, 0),
		box("body", "emberLight", 40, 30, 6, 0, 100 + 60, 42),
		box("arm_l", "rust", 60, 26, 60, -95, 250 - 26, 0),
		box("arm_r", "rust", 60, 26, 60, 95, 250 - 26, 0),
		box("hammer", "ironDark", 10, 140, 10, 90, 250 - 120 - 40, 36),
		box("hammer", "iron", 70, 56, 56, 90, 250 - 120 - 100, 36),
	],
});

/** The Alpha Hunter (round 40): a boss-sized quadruped, hind legs back, forelegs on the arm groups. */
const alphaHunter = biped({
	name: "alpha_hunter",
	category: "bosses",
	texture: 64,
	legH: 120,
	legW: 36,
	legD: 36,
	hipX: 56,
	torsoH: 90,
	torsoW: 120,
	torsoD: 260,
	headW: 70,
	headH: 70,
	headD: 90,
	armW: 36,
	armLen: 206,
	legZ: -90,
	armZ: 90,
	headZ: 160,
	socket: "hit_socket",
	colors: { legs: "ironDark", torso: "mist", head: "bone", arms: "ironDark" },
	extraParts: [
		box("head", "emberLight", 40, 10, 10, 0, 120 + 90 + 50, 160 + 46),
		box("body", "mist", 130, 20, 270, 0, 120 + 90 + 8, 0),
		box("body", "bone", 14, 40, 14, 0, 120 + 90 + 30, 70),
		box("body", "bone", 14, 40, 14, 0, 120 + 90 + 30, -10),
		box("body", "bone", 14, 40, 14, 0, 120 + 90 + 30, -90),
		box("body", "ironDark", 24, 24, 90, 0, 120 + 60, -170),
		box("arm_l", "bone", 44, 16, 44, -80, 4, 90),
		box("arm_r", "bone", 44, 16, 44, 80, 4, 90),
	],
});

/** The Nest Queen (round 50): a towering body with a bloated egg-studded abdomen and a sweeping tail. */
const nestQueen = biped({
	name: "nest_queen",
	category: "bosses",
	texture: 64,
	legH: 110,
	legW: 40,
	legD: 40,
	hipX: 36,
	torsoH: 120,
	torsoW: 130,
	torsoD: 80,
	headW: 60,
	headH: 56,
	headD: 60,
	armW: 36,
	armLen: 140,
	socket: "hit_socket",
	colors: { legs: "boneDark", torso: "flesh", head: "bone", arms: "boneDark" },
	extraGroups: [{ name: "tail", parent: "body", origin: [0, 110 + 30, -40] }],
	extraParts: [
		box("head", "emberLight", 48, 10, 10, 0, 110 + 120 + 36, 32),
		box("head", "bone", 12, 36, 12, -22, 110 + 120 + 74, 0),
		box("head", "bone", 12, 36, 12, 22, 110 + 120 + 74, 0),
		box("body", "flesh", 120, 100, 130, 0, 110 + 60, -100),
		box("body", "bone", 30, 30, 30, -30, 110 + 80, -176),
		box("body", "bone", 30, 30, 30, 30, 110 + 100, -176),
		box("body", "emberLight", 24, 24, 24, 0, 110 + 40, -176),
		box("body", "boneDark", 140, 18, 90, 0, 110 + 108, 0),
		box("tail", "boneDark", 28, 28, 120, 0, 110 + 30, -250),
		box("tail", "boneDark", 20, 20, 40, 0, 110 + 30, -330),
		box("arm_l", "bone", 44, 18, 44, -90, 120 + 110 - 18, 0),
		box("arm_r", "bone", 44, 18, 44, 90, 120 + 110 - 18, 0),
	],
});

/** Enemies 3 to 8 (A-02-02b): the husk rig re-proportioned per sizeClass in data/enemies.json, four colours each. */
const newEnemy = (
	name: string,
	dims: Partial<Parameters<typeof biped>[0]>,
	colors: { legs: TokenName; torso: TokenName; head: TokenName; arms: TokenName },
	extras: PartDef[] = [],
): ModelDef =>
	biped({
		name,
		category: "enemies",
		texture: 64,
		legH: 44,
		legW: 14,
		legD: 14,
		hipX: 9,
		torsoH: 38,
		torsoW: 30,
		torsoD: 18,
		headW: 22,
		headH: 22,
		headD: 22,
		armW: 12,
		armLen: 46,
		socket: "hit_socket",
		colors,
		extraParts: extras,
		...dims,
	});

const newEnemies: ModelDef[] = [
	newEnemy(
		"drowned",
		{
			hunch: 22.5,
			legH: 28,
			legW: 20,
			legD: 18,
			hipX: 16,
			torsoH: 40,
			torsoW: 56,
			torsoD: 30,
			headW: 26,
			headH: 22,
			headD: 26,
			armW: 16,
			armLen: 40,
		},
		{ legs: "graveGreen", torso: "boneDark", head: "bone", arms: "graveGreen" },
		[box("head", "graveGreenLight", 24, 6, 24, 0, 28 + 40 + 22, 0)],
	),
	newEnemy(
		"leech",
		{
			legH: 12,
			legW: 10,
			legD: 10,
			hipX: 7,
			torsoH: 24,
			torsoW: 28,
			torsoD: 40,
			headW: 18,
			headH: 16,
			headD: 18,
			armW: 8,
			armLen: 14,
		},
		{ legs: "flesh", torso: "bloodLight", head: "flesh", arms: "flesh" },
		[box("body", "blood", 30, 6, 42, 0, 12 + 22, 0)],
	),
	newEnemy(
		"forged",
		{
			legH: 54,
			legW: 20,
			legD: 20,
			hipX: 13,
			torsoH: 56,
			torsoW: 46,
			torsoD: 28,
			headW: 28,
			headH: 28,
			headD: 28,
			armW: 18,
			armLen: 58,
		},
		{ legs: "ironDark", torso: "iron", head: "ironLight", arms: "iron" },
		[
			box("body", "ironLight", 50, 8, 32, 0, 54 + 46, 0),
			box("head", "iron", 32, 8, 32, 0, 54 + 56 + 24, 0),
			box("arm_r", "ironLight", 22, 14, 22, 26, 54 + 56 - 14, 0),
		],
	),
	newEnemy(
		"watcher",
		{
			legH: 30,
			legW: 12,
			legD: 12,
			hipX: 8,
			torsoH: 46,
			torsoW: 22,
			torsoD: 22,
			headW: 30,
			headH: 30,
			headD: 30,
			armW: 8,
			armLen: 30,
		},
		{ legs: "ironDark", torso: "mist", head: "bone", arms: "ironDark" },
		[box("head", "emberLight", 12, 12, 4, 0, 30 + 46 + 10, 15)],
	),
	newEnemy(
		"hunter",
		{
			legH: 32,
			legW: 10,
			legD: 10,
			hipX: 8,
			torsoH: 26,
			torsoW: 22,
			torsoD: 80,
			headW: 20,
			headH: 20,
			headD: 26,
			armW: 8,
			armLen: 54,
			legZ: -32,
			armZ: 32,
			headZ: 50,
		},
		{ legs: "ironDark", torso: "flesh", head: "iron", arms: "iron" },
		[
			box("head", "flesh", 14, 4, 4, 0, 32 + 26 + 20, 50 + 14),
			box("arm_r", "iron", 6, 10, 6, 12, 0, 32 + 4),
		],
	),
	newEnemy(
		"breeder",
		{
			legH: 40,
			legW: 24,
			legD: 24,
			hipX: 16,
			torsoH: 70,
			torsoW: 64,
			torsoD: 52,
			headW: 26,
			headH: 24,
			headD: 26,
			armW: 14,
			armLen: 40,
		},
		{ legs: "ironDark", torso: "flesh", head: "iron", arms: "iron" },
		[
			box("body", "flesh", 44, 30, 36, 0, 40 + 20, 0),
			box("body", "iron", 20, 20, 8, 0, 40 + 30, 28),
			box("head", "iron", 30, 8, 30, 0, 40 + 70 + 20, 0),
		],
	),
];

const biomeProps: ModelDef[] = BIOME_PROPS.map((def) => prop(def.name, "props", def.parts));

const props: ModelDef[] = [
	prop("prop_tombstone_01", "props", [
		box("root", "stoneDark", 26, 6, 14, 0, 0, 0),
		box("root", "stone", 20, 34, 6, 0, 6, 0),
		box("root", "graveGreen", 20, 4, 7, 0, 6, 0),
		box("root", "stone", 12, 4, 7, 0, 30, 0),
	]),
	prop("prop_tombstone_02", "props", [
		box("root", "stoneDark", 22, 6, 12, 0, 0, 0),
		box("root", "stone", 16, 28, 6, 0, 6, 0, [0, 0, 22.5]),
		box("root", "graveGreen", 16, 4, 7, 0, 6, 0),
	]),
	prop("prop_dead_tree_01", "props", [
		box("root", "boneDark", 12, 90, 12, 0, 0, 0),
		box("root", "boneDark", 6, 36, 6, 10, 62, 0, [0, 0, -45]),
		box("root", "boneDark", 6, 30, 6, -9, 70, 0, [0, 0, 45]),
		box("root", "boneDark", 5, 22, 5, 6, 80, 5, [22.5, 0, -22.5]),
		box("root", "stoneDark", 18, 6, 18, 0, 0, 0),
	]),
	prop("prop_crypt_01", "props", [
		box("root", "stoneDark", 84, 8, 70, 0, 0, 0),
		box("root", "stone", 72, 62, 60, 0, 8, 0),
		box("root", "stoneDark", 80, 10, 66, 0, 70, 0),
		box("root", "stone", 60, 8, 54, 0, 80, 0),
		box("root", "night", 20, 34, 4, 0, 8, 30),
		box("root", "stone", 8, 40, 8, -26, 8, 32),
		box("root", "stone", 8, 40, 8, 26, 8, 32),
		box("root", "graveGreen", 74, 6, 62, 0, 62, 0),
	]),
	prop("prop_bone_01", "props", [
		box("root", "bone", 18, 10, 6, 0, 0, 0, [0, 22.5, 0]),
		box("root", "boneDark", 8, 10, 8, -9, 0, 0),
		box("root", "boneDark", 8, 10, 8, 9, 0, 0),
	]),
	prop("prop_grass_01", "props", [
		box("root", "graveGreen", 3, 12, 3, -4, 0, 0),
		box("root", "graveGreenLight", 3, 16, 3, 0, 0, 2),
		box("root", "graveGreen", 3, 10, 3, 4, 0, -2),
	]),
	prop("prop_urn_01", "props", [
		box("root", "rust", 14, 18, 14, 0, 0, 0),
		box("root", "boneDark", 10, 4, 10, 0, 18, 0),
		box("root", "rust", 18, 4, 4, 0, 10, 8),
	]),
	prop("prop_cross_01", "props", [
		box("root", "stoneDark", 16, 4, 16, 0, 0, 0),
		box("root", "boneDark", 6, 38, 6, 0, 4, 0),
		box("root", "boneDark", 22, 6, 6, 0, 28, 0),
	]),
	prop("prop_fence_01", "props", [
		box("root", "ironDark", 40, 4, 4, 0, 6, 0),
		box("root", "ironDark", 40, 4, 4, 0, 24, 0),
		box("root", "iron", 4, 34, 4, -18, 0, 0),
		box("root", "iron", 4, 34, 4, 0, 0, 0),
		box("root", "iron", 4, 34, 4, 18, 0, 0),
		box("root", "rust", 6, 6, 6, 0, 34, 0),
	]),
	prop("prop_bonepile_01", "props", [
		box("root", "boneDark", 36, 10, 28, 0, 0, 0),
		box("root", "bone", 26, 8, 20, 0, 10, 0),
		box("root", "bone", 14, 8, 12, 0, 18, 0),
		box("root", "emberLight", 6, 6, 6, 8, 26, 2),
	]),
];

const weapons: ModelDef[] = [
	prop("weapon_sword", "weapons", [
		box("root", "boneDark", 4, 12, 4, 0, -4, 0),
		box("root", "rust", 16, 4, 6, 0, 8, 0),
		box("root", "ironLight", 6, 44, 2, 0, 12, 0),
		box("root", "iron", 8, 6, 6, 0, -8, 0),
	]),
	prop("weapon_pistol", "weapons", [
		box("root", "boneDark", 6, 14, 8, 0, -10, 0),
		box("root", "iron", 8, 8, 24, 0, 4, 8),
		box("root", "ironDark", 4, 4, 8, 0, 8, 22),
	]),
	prop("weapon_smg", "weapons", [
		box("root", "boneDark", 6, 14, 8, 0, -10, 0),
		box("root", "iron", 10, 10, 34, 0, 4, 10),
		box("root", "ironDark", 6, 18, 6, 0, -10, 12),
		box("root", "ironDark", 4, 4, 10, 0, 8, 30),
	]),
	prop("weapon_mg", "weapons", [
		box("root", "boneDark", 6, 14, 8, 0, -10, 0),
		box("root", "iron", 12, 12, 40, 0, 4, 14),
		box("root", "ironDark", 6, 6, 22, 0, 8, 44),
		box("root", "rust", 14, 10, 12, 0, 16, 8),
	]),
	prop("weapon_bazooka", "weapons", [
		box("root", "boneDark", 6, 14, 8, 0, -10, 0),
		box("root", "iron", 16, 16, 56, 0, 2, 4),
		box("root", "rust", 20, 20, 10, 0, 0, 34),
		box("root", "ironDark", 12, 12, 6, 0, 4, -26),
	]),
];

/** Floor tiles: one flat quad per tile and a 32x32 stone texture (32 px per unit, Art Bible §5). */
function tile(
	index: number,
	prefix = "tile_cemetery",
	tokens: TokenName[] = ["stone", "stone", "stone", "stoneDark", "graveGreen", "boneDark"],
	seed = 0x7e57,
): { def: ModelDef; generated: GeneratedModel } {
	const name = `${prefix}_0${index}`;
	const palette = tokens.map((token) => hexToRgb(TOKENS[token]));
	const next = prng(seed + index);
	const png = new PNG({ width: 32, height: 32 });
	for (let i = 0; i < 32 * 32; i++) {
		const [r, g, b] = palette[Math.floor(next() * palette.length)] ?? palette[0] ?? [0, 0, 0];
		png.data.set([r, g, b, 255], i * 4);
	}
	const def: ModelDef = { name, category: "tiles", texture: 32, groups: [ROOT], parts: [], clips: [] };
	const generated: GeneratedModel = {
		texture: png,
		bbmodel: {
			meta: { format_version: "4.10", model_format: "free", box_uv: false },
			name,
			resolution: { width: 32, height: 32 },
			elements: [
				{
					uuid: "e_0",
					name: "floor",
					type: "quad",
					from: [-16, 0, -16],
					to: [16, 0, 16],
					faces: { up: { uv: [0, 0, 32, 32], texture: 0 } },
				},
			],
			outliner: [{ uuid: "g_root", name: "root", origin: [0, 0, 0], children: ["e_0"] }],
			textures: [{ name: `${name}_d.png`, width: 32, height: 32 }],
			animations: [],
		},
	};
	return { def, generated };
}

export interface CatalogEntry {
	name: string;
	category: Category;
	generated: GeneratedModel;
}

export function buildCatalog(): CatalogEntry[] {
	const modeled = [
		hero,
		husk,
		wail,
		gravedigger,
		merchant,
		matriarch,
		forgemaster,
		alphaHunter,
		nestQueen,
		...newEnemies,
		...props,
		...biomeProps,
		...weapons,
	].map((def) => ({
		name: def.name,
		category: def.category,
		generated: generate(def),
	}));
	const tiles = [1, 2, 3, 4].map((i) => {
		const { def, generated } = tile(i);
		return { name: def.name, category: def.category, generated };
	});
	const biomeTiles = BIOME_TILES.flatMap((set) =>
		[1, 2, 3, 4].map((i) => {
			const { def, generated } = tile(i, set.prefix, set.palette, set.seed);
			return { name: def.name, category: def.category, generated };
		}),
	);
	return [...modeled, ...tiles, ...biomeTiles];
}
