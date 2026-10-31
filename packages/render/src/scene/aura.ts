import { PALETTE } from "./palette";

/** `aura` token names of data/elites.json mapped to the palette tokens they stand for. */
const AURA_HEX: Readonly<Record<string, string>> = {
	steel_gray: PALETTE.ironLight,
	amber: PALETTE.emberLight,
	wine: PALETTE.bloodLight,
	orange: PALETTE.ember,
};

export function auraHex(aura: string): string {
	return AURA_HEX[aura] ?? PALETTE.ironLight;
}

/** Average colour of several auras (a boss with two elite modifiers), as `#RRGGBB`. */
export function mixAuras(auras: readonly string[]): string {
	if (auras.length === 0) return "#FFFFFF";
	const channel = (hex: string, offset: number): number =>
		Number.parseInt(hex.slice(1 + offset, 3 + offset), 16);
	const hexes = auras.map(auraHex);
	const avg = (offset: number): string =>
		Math.round(hexes.reduce((sum, h) => sum + channel(h, offset), 0) / hexes.length)
			.toString(16)
			.padStart(2, "0");
	return `#${avg(0)}${avg(2)}${avg(4)}`.toUpperCase();
}
