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
	/** --color-blood and --color-blood-light: gore (Art Bible §9). */
	blood: "#5E0E14",
	bloodLight: "#8E1A1F",
	/** --color-ember and --color-ember-light: fire, explosions, projectiles. */
	ember: "#E07A2A",
	emberLight: "#F5B04A",
	/** --color-iron-dark: blood colour with reduced gore. */
	ironDark: "#2E3136",
	/** --color-iron: reduced-gore death cubes. */
	iron: "#5A5F66",
	/** Directional "dead sun" colour (Art Bible §4); not a UI token. */
	sun: "#C9B8A8",
} as const;

/** Art Bible §4 lighting values. */
export const LIGHTING = {
	sunDirection: [-0.5, -1, -0.3],
	sunIntensity: 1.1,
	hemiIntensity: 0.45,
	fogStart: 28,
	fogEnd: 60,
} as const;
