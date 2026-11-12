/**
 * Render-side copy of the Art Bible palette (§3 tokens, §4 lighting). `render` cannot read the Tailwind
 * theme in `ui` (layering, SDD 01 §2), so the values live here with the token they mirror.
 */
export const PALETTE = {
	/** --color-night: fog and clear colour (Art Bible §4). */
	night: "#14121C",
	/** --color-night-2: ground placeholder. */
	night2: "#1C1926",
	/** --color-shadow: hemispheric ground colour (Art Bible §4). */
	shadow: "#2B2340",
	/** --color-mist: hemispheric sky colour (Art Bible §4). */
	mist: "#3F3A52",
	/** --color-bone: placeholder hero cube. */
	bone: "#D9C9A3",
	/** --color-damage-white: damage numbers on enemies; near white because pure #FFFFFF is banned (Art Bible §3.1). */
	damageWhite: "#F4F1EA",
	/** --color-bone-dark and --color-rust: broken prop dust. */
	boneDark: "#8C7A5B",
	rust: "#8A4A2B",
	/** --color-blood and --color-blood-light: gore (Art Bible §9). */
	blood: "#5E0E14",
	bloodLight: "#8E1A1F",
	/** --color-flesh: the Nest Queen eggs and the nest biome. */
	flesh: "#6E2F3F",
	/** --color-sludge: swamp mud and moss. */
	sludge: "#6B8F3A",
	/** --color-mud: the Matriarch pools. */
	mud: "#4A3B2A",
	/** --color-ember and --color-ember-light: fire, explosions, projectiles. */
	ember: "#E07A2A",
	emberLight: "#F5B04A",
	/** --color-iron-dark: blood colour with reduced gore. */
	ironDark: "#2E3136",
	/** --color-iron: reduced-gore death cubes. */
	iron: "#5A5F66",
	/** --color-iron-black: the "Carrasco de Ferro Negro" skin (round 50). */
	ironBlack: "#2B2A33",
	/** Elite auras (data/elites.json `aura`): steel_gray, amber, wine and orange map to these tokens. */
	ironLight: "#8A9099",
	/** Directional "dead sun" colour (Art Bible §4); not a UI token. */
	sun: "#C9B8A8",
} as const;

/** Art Bible §4 lighting values. */
export const LIGHTING = {
	sunDirection: [-0.5, -1, -0.3],
	sunIntensity: 4.2,
	hemiIntensity: 2.5,
	/** Sky colour of the hemispheric light: a cool iron grey, light enough for the dark model textures to read. */
	hemiSky: "#8A9099",
	/** Floor diffuse multiplier: the lights are raised for the models, the ground is kept dark (grimdark). */
	floorShade: 0.13,
	/** Share of each ground tile's own light/dark variation kept (1 = authored texture); less noise lets the characters read. */
	floorContrast: 0.5,
	/** Albedo gain of the character atlas: the lights saturate a lit model, so only the albedo can lift it off the ground. */
	characterGain: 1.4,
	/** A faint light from the camera: it lifts the silhouettes of the darkest models off the ground. */
	rimIntensity: 0.6,
	/** Per-biome multiplier baked into the floor strip: the cemetery tiles are the lightest, so they are dimmed most. */
	floorBiomeShade: [0.55, 0.7, 0.78, 1, 0.55],
	/** Per-biome RGB multiplier of the floor strip: the Frozen Catacombs recolour the cemetery tiles cold blue. */
	floorBiomeTint: [
		[1, 1, 1],
		[1, 1, 1],
		[1, 1, 1],
		[1, 1, 1],
		[0.8, 1, 1.4],
	],
	fogStart: 28,
	fogEnd: 60,
} as const;

/** Resolves a kebab-case Art Bible token (`iron-light`) to its hex; throws on a name the palette does not have. */
export function paletteHex(token: string): string {
	const key = token.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()) as keyof typeof PALETTE;
	const hex = PALETTE[key];
	if (hex === undefined) throw new RangeError(`unknown palette token "${token}"`);
	return hex;
}
