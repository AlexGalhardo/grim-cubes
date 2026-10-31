/** Art Bible §3 colours by name; every generated texture is built only from these and their ramps. */
export const TOKENS = {
	bone: "#D9C9A3",
	boneDark: "#8C7A5B",
	iron: "#5A5F66",
	ironDark: "#2E3136",
	ironLight: "#8A9099",
	rust: "#8A4A2B",
	blood: "#5E0E14",
	bloodLight: "#8E1A1F",
	ember: "#E07A2A",
	emberLight: "#F5B04A",
	night: "#14121C",
	shadow: "#2B2340",
	mist: "#3F3A52",
	stone: "#4A4A45",
	stoneDark: "#2F2E33",
	graveGreen: "#3E5A3A",
	graveGreenLight: "#7FBF6A",
	flesh: "#6E2F3F",
} as const;

export type TokenName = keyof typeof TOKENS;

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
	return [0, 1, 2].map((i) => Math.round((a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * t)) as unknown as Rgb;
}

/** Light, mid and dark tones: shadows lean towards the cold purple, lights towards warm bone (Art Bible §7). */
export function ramp(token: TokenName): [Rgb, Rgb, Rgb] {
	const base = hexToRgb(TOKENS[token]);
	return [mix(base, hexToRgb(TOKENS.bone), 0.22), base, mix(base, hexToRgb(TOKENS.shadow), 0.4)];
}
