import type { PartDef } from "./model";
import type { TokenName } from "./palette";

/** A box from its centre-bottom, pixels: same convention as `box` in catalog.ts (kept here to avoid a cycle). */
function cube(
	color: TokenName,
	w: number,
	h: number,
	d: number,
	x = 0,
	y = 0,
	z = 0,
	rotation?: [number, number, number],
): PartDef {
	return {
		group: "root",
		from: [x - w / 2, y, z - d / 2],
		to: [x + w / 2, y + h, z + d / 2],
		color,
		...(rotation ? { rotation } : {}),
	};
}

export type BiomeId = "bone_swamp" | "infernal_forge" | "biomech_nest";

export interface BiomePropDef {
	name: string;
	biome: BiomeId;
	kind: "blocking" | "decor" | "breakable";
	/** Element budget class of Art Bible 5.1: small <= 4 elements, medium <= 8, large <= 16. */
	sizeClass: "small" | "medium" | "large";
	parts: PartDef[];
}

/** Ten props per biome (Art Bible 5.1 budgets), built only from palette tokens. */
export const BIOME_PROPS: BiomePropDef[] = [
	// Pantano de Ossos: lama, madeira podre, fungo e ossos.
	{
		name: "prop_swamp_stump_01",
		biome: "bone_swamp",
		kind: "blocking",
		sizeClass: "medium",
		parts: [
			cube("boneDark", 22, 6, 22),
			cube("rust", 18, 24, 18, 0, 6),
			cube("graveGreen", 20, 4, 20, 0, 30),
			cube("graveGreenLight", 6, 6, 6, 5, 34, 3),
		],
	},
	{
		name: "prop_swamp_tree_01",
		biome: "bone_swamp",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("boneDark", 20, 6, 20),
			cube("rust", 12, 80, 12, 0, 6),
			cube("rust", 6, 34, 6, 12, 56, 0, [0, 0, -45]),
			cube("rust", 6, 30, 6, -11, 64, 0, [0, 0, 45]),
			cube("graveGreen", 36, 10, 36, 0, 84),
			cube("graveGreenLight", 22, 8, 22, 0, 94),
			cube("graveGreen", 14, 24, 4, 0, 60, 8),
		],
	},
	{
		name: "prop_swamp_hut_01",
		biome: "bone_swamp",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("boneDark", 70, 6, 60),
			cube("boneDark", 60, 4, 50, 0, 6),
			cube("rust", 52, 44, 42, 0, 10),
			cube("night", 14, 26, 4, 0, 10, 22),
			cube("boneDark", 64, 8, 54, 0, 54),
			cube("graveGreen", 56, 6, 46, 0, 62),
			cube("boneDark", 8, 20, 8, -22, 68),
			cube("graveGreen", 6, 6, 6, 18, 36, 22),
		],
	},
	{
		name: "prop_swamp_bonearch_01",
		biome: "bone_swamp",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("boneDark", 14, 70, 14, -30),
			cube("boneDark", 14, 70, 14, 30),
			cube("bone", 74, 14, 14, 0, 62),
			cube("bone", 10, 14, 10, -30, 70),
			cube("bone", 10, 14, 10, 30, 70),
			cube("bone", 16, 12, 12, 0, 76),
			cube("graveGreen", 20, 6, 20, -30, 0),
			cube("graveGreen", 20, 6, 20, 30, 0),
		],
	},
	{
		name: "prop_reeds_01",
		biome: "bone_swamp",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("graveGreen", 3, 24, 3, -5),
			cube("graveGreenLight", 3, 30, 3, 0, 0, 3),
			cube("graveGreen", 3, 20, 3, 5, 0, -2),
			cube("rust", 4, 8, 4, 0, 30, 3),
		],
	},
	{
		name: "prop_swamp_skull_01",
		biome: "bone_swamp",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("graveGreen", 22, 4, 22),
			cube("bone", 14, 12, 14, 0, 4),
			cube("night", 10, 4, 4, 0, 8, 6),
		],
	},
	{
		name: "prop_mushroom_01",
		biome: "bone_swamp",
		kind: "decor",
		sizeClass: "small",
		parts: [cube("boneDark", 6, 14, 6), cube("flesh", 20, 6, 20, 0, 14), cube("bone", 4, 2, 4, 4, 20, 4)],
	},
	{
		name: "prop_swamp_log_01",
		biome: "bone_swamp",
		kind: "decor",
		sizeClass: "medium",
		parts: [
			cube("rust", 56, 14, 14, 0, 0, 0, [0, 22.5, 0]),
			cube("boneDark", 16, 12, 12, -26, 0, 4),
			cube("graveGreen", 30, 4, 12, 4, 14),
		],
	},
	{
		name: "prop_swamp_jar_01",
		biome: "bone_swamp",
		kind: "breakable",
		sizeClass: "small",
		parts: [
			cube("graveGreen", 14, 16, 14),
			cube("boneDark", 10, 4, 10, 0, 16),
			cube("graveGreenLight", 8, 3, 8, 0, 20),
		],
	},
	{
		name: "prop_swamp_nest_01",
		biome: "bone_swamp",
		kind: "breakable",
		sizeClass: "small",
		parts: [cube("rust", 26, 6, 26), cube("boneDark", 18, 4, 18, 0, 6), cube("bone", 8, 10, 8, 0, 10)],
	},
	// Forja Infernal: ferro, brasa e escoria.
	{
		name: "prop_anvil_01",
		biome: "infernal_forge",
		kind: "blocking",
		sizeClass: "medium",
		parts: [
			cube("stoneDark", 30, 8, 22),
			cube("ironDark", 18, 16, 14, 0, 8),
			cube("iron", 40, 10, 20, 0, 24),
			cube("ironLight", 12, 4, 16, 18, 28),
		],
	},
	{
		name: "prop_chimney_01",
		biome: "infernal_forge",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("ironDark", 44, 8, 44),
			cube("ironDark", 32, 60, 32, 0, 8),
			cube("iron", 36, 6, 36, 0, 68),
			cube("ironDark", 26, 40, 26, 0, 74),
			cube("rust", 30, 6, 30, 0, 114),
			cube("ember", 18, 6, 18, 0, 120),
			cube("iron", 6, 40, 4, 17, 20, 18),
		],
	},
	{
		name: "prop_furnace_01",
		biome: "infernal_forge",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("ironDark", 76, 8, 60),
			cube("ironDark", 68, 56, 52, 0, 8),
			cube("night", 28, 24, 4, 0, 14, 27),
			cube("ember", 22, 16, 3, 0, 18, 28),
			cube("iron", 72, 8, 56, 0, 64),
			cube("ironDark", 20, 36, 20, 20, 72),
			cube("iron", 24, 6, 24, 20, 108),
			cube("iron", 8, 30, 4, -26, 12, 28),
		],
	},
	{
		name: "prop_gearpile_01",
		biome: "infernal_forge",
		kind: "blocking",
		sizeClass: "medium",
		parts: [
			cube("ironDark", 40, 10, 34),
			cube("iron", 28, 10, 24, 0, 10, 0, [0, 22.5, 0]),
			cube("rust", 18, 10, 18, 4, 20),
			cube("ironLight", 10, 8, 10, -6, 30),
		],
	},
	{
		name: "prop_chain_01",
		biome: "infernal_forge",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("ironDark", 6, 6, 18, 0, 0, 0, [0, 22.5, 0]),
			cube("iron", 6, 6, 18, 4, 2, 10),
			cube("ironDark", 6, 6, 18, -2, 0, 20),
		],
	},
	{
		name: "prop_slag_01",
		biome: "infernal_forge",
		kind: "decor",
		sizeClass: "small",
		parts: [cube("ironDark", 30, 8, 24), cube("night", 18, 8, 16, 2, 8), cube("ember", 8, 3, 8, -4, 16)],
	},
	{
		name: "prop_emberrock_01",
		biome: "infernal_forge",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("stoneDark", 26, 14, 22),
			cube("rust", 16, 10, 14, 4, 14),
			cube("emberLight", 6, 5, 6, 6, 24),
		],
	},
	{
		name: "prop_pipe_01",
		biome: "infernal_forge",
		kind: "decor",
		sizeClass: "medium",
		parts: [
			cube("ironDark", 56, 12, 12, 0, 6),
			cube("iron", 14, 22, 14, -28, 0),
			cube("iron", 14, 22, 14, 28, 0),
			cube("rust", 8, 14, 14, 0, 4),
			cube("ember", 6, 6, 6, 10, 18, 4),
		],
	},
	{
		name: "prop_barrel_01",
		biome: "infernal_forge",
		kind: "breakable",
		sizeClass: "small",
		parts: [
			cube("rust", 18, 24, 18),
			cube("ironDark", 20, 3, 20, 0, 6),
			cube("ironDark", 20, 3, 20, 0, 16),
		],
	},
	{
		name: "prop_crate_01",
		biome: "infernal_forge",
		kind: "breakable",
		sizeClass: "small",
		parts: [
			cube("rust", 24, 22, 24),
			cube("ironDark", 26, 3, 26, 0, 0),
			cube("boneDark", 14, 3, 14, 0, 22),
		],
	},
	// Ninho Biomecanico: carne, ferro e cabos.
	{
		name: "prop_pod_01",
		biome: "biomech_nest",
		kind: "blocking",
		sizeClass: "medium",
		parts: [
			cube("ironDark", 34, 8, 34),
			cube("flesh", 26, 26, 26, 0, 8),
			cube("mist", 18, 10, 18, 0, 34),
			cube("emberLight", 6, 6, 6, 0, 44),
		],
	},
	{
		name: "prop_eggcluster_01",
		biome: "biomech_nest",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("ironDark", 66, 8, 58),
			cube("flesh", 24, 36, 24, -16, 8),
			cube("flesh", 20, 44, 20, 18, 8, -6),
			cube("flesh", 16, 28, 16, 4, 8, 18),
			cube("mist", 18, 8, 18, -16, 44),
			cube("mist", 16, 8, 16, 18, 52, -6),
			cube("emberLight", 6, 6, 6, -16, 52),
			cube("emberLight", 6, 6, 6, 18, 60, -6),
		],
	},
	{
		name: "prop_spire_01",
		biome: "biomech_nest",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("ironDark", 48, 8, 48),
			cube("iron", 32, 50, 32, 0, 8),
			cube("flesh", 26, 40, 26, 0, 58),
			cube("iron", 18, 36, 18, 0, 98),
			cube("iron", 10, 26, 10, 0, 134),
			cube("emberLight", 8, 8, 8, 0, 160),
			cube("iron", 6, 44, 4, 18, 16, 18),
		],
	},
	{
		name: "prop_tank_01",
		biome: "biomech_nest",
		kind: "blocking",
		sizeClass: "large",
		parts: [
			cube("ironDark", 64, 8, 64),
			cube("mist", 50, 74, 50, 0, 8),
			cube("flesh", 38, 56, 38, 0, 16),
			cube("ironDark", 56, 6, 56, 0, 82),
			cube("ironDark", 8, 34, 8, -28, 8, 28),
			cube("ironDark", 8, 34, 8, 28, 8, 28),
			cube("ember", 10, 10, 4, 0, 40, 26),
		],
	},
	{
		name: "prop_cable_01",
		biome: "biomech_nest",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("ironDark", 40, 5, 5, 0, 0, 0, [0, 22.5, 0]),
			cube("flesh", 24, 5, 5, 8, 0, 10),
			cube("mist", 6, 8, 6, -14, 0, 4),
		],
	},
	{
		name: "prop_circuit_01",
		biome: "biomech_nest",
		kind: "decor",
		sizeClass: "small",
		parts: [
			cube("ironDark", 30, 3, 24),
			cube("graveGreenLight", 4, 4, 14, -8, 3),
			cube("emberLight", 5, 5, 5, 8, 3, 4),
		],
	},
	{
		name: "prop_antenna_01",
		biome: "biomech_nest",
		kind: "decor",
		sizeClass: "medium",
		parts: [
			cube("ironDark", 16, 6, 16),
			cube("bone", 5, 56, 5, 0, 6),
			cube("iron", 20, 4, 4, 0, 40),
			cube("iron", 14, 4, 4, 0, 52),
			cube("emberLight", 6, 6, 6, 0, 62),
		],
	},
	{
		name: "prop_mesh_01",
		biome: "biomech_nest",
		kind: "decor",
		sizeClass: "medium",
		parts: [
			cube("ironDark", 50, 4, 40),
			cube("iron", 4, 24, 4, -22, 4, -16),
			cube("iron", 4, 24, 4, 22, 4, 16),
			cube("mist", 44, 4, 34, 0, 28),
			cube("flesh", 20, 6, 14, 6, 32),
		],
	},
	{
		name: "prop_egg_01",
		biome: "biomech_nest",
		kind: "breakable",
		sizeClass: "small",
		parts: [cube("flesh", 16, 22, 16), cube("mist", 12, 6, 12, 0, 22), cube("ironDark", 22, 4, 22)],
	},
	{
		name: "prop_canister_01",
		biome: "biomech_nest",
		kind: "breakable",
		sizeClass: "small",
		parts: [
			cube("iron", 14, 24, 14),
			cube("graveGreenLight", 10, 8, 4, 0, 8, 7),
			cube("ironDark", 16, 4, 16, 0, 24),
		],
	},
];

export interface BiomeTileSet {
	biome: BiomeId;
	/** Tile file prefix: `<prefix>_01` .. `<prefix>_04`. */
	prefix: string;
	/** Weighted colour list the 32x32 texture samples (repeat a token to weigh it). */
	palette: TokenName[];
	seed: number;
}

export const BIOME_TILES: BiomeTileSet[] = [
	{
		biome: "bone_swamp",
		prefix: "tile_swamp",
		palette: ["graveGreen", "graveGreen", "stoneDark", "boneDark", "night"],
		seed: 0x5a11,
	},
	{
		biome: "infernal_forge",
		prefix: "tile_forge",
		palette: ["ironDark", "ironDark", "rust", "stoneDark", "ember"],
		seed: 0xf0e6,
	},
	{
		biome: "biomech_nest",
		prefix: "tile_nest",
		palette: ["ironDark", "mist", "mist", "flesh", "shadow"],
		seed: 0x4e57,
	},
];
