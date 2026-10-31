import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { hexToRgb, type Rgb, TOKENS, type TokenName } from "./palette";

export type IconKind = "item" | "card" | "node";

export interface IconSpec {
	kind: IconKind;
	id: string;
	/** Item tier (1-based); picks the frame colour. Cards and nodes use the neutral frame. */
	tier?: number;
}

export const ICON_SIZE = 32;

/** Frame colour by rarity tier (Art Bible 3.3: item icons sit on a rarity background). */
const TIER_FRAME: TokenName[] = ["ironDark", "graveGreen", "mist", "rust", "bloodLight"];

const read = (dataDir: string, file: string): unknown =>
	JSON.parse(readFileSync(join(dataDir, file), "utf8"));

/** Every id that needs an icon: all of data/items.json, data/cards.json and data/ossuary.json. */
export function iconSpecs(dataDir: string): IconSpec[] {
	const items = read(dataDir, "items.json") as { id: string; tier: number }[];
	const cards = (read(dataDir, "cards.json") as { cards: { id: string }[] }).cards;
	const branches = (read(dataDir, "ossuary.json") as { branches: { nodes: { id: string }[] }[] }).branches;
	return [
		...items.map((i) => ({ kind: "item" as const, id: i.id, tier: i.tier })),
		...cards.map((c) => ({ kind: "card" as const, id: c.id })),
		...branches.flatMap((b) => b.nodes.map((n) => ({ kind: "node" as const, id: n.id }))),
	];
}

/** FNV-1a: a stable seed per id, so the same data always produces the same bytes. */
function seedOf(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
	return h >>> 0;
}

function fill(png: PNG, x0: number, y0: number, w: number, h: number, [r, g, b]: Rgb): void {
	for (let y = y0; y < y0 + h; y++) {
		for (let x = x0; x < x0 + w; x++) png.data.set([r, g, b, 255], (y * png.width + x) * 4);
	}
}

/**
 * A 32x32 stand-in the PO can replace: a rarity frame and a left-right symmetric 5x5 glyph (one block = 4 px) seeded by
 * the id, in bone on the dark ground, plus an ember accent block. Four colours at most, no antialiasing.
 */
export function buildIcon(spec: IconSpec): PNG {
	const png = new PNG({ width: ICON_SIZE, height: ICON_SIZE });
	const frame = hexToRgb(
		TOKENS[TIER_FRAME[Math.min(TIER_FRAME.length - 1, (spec.tier ?? 1) - 1)] ?? "ironDark"],
	);
	fill(png, 0, 0, ICON_SIZE, ICON_SIZE, frame);
	fill(png, 2, 2, ICON_SIZE - 4, ICON_SIZE - 4, hexToRgb(TOKENS.night));
	const bone = hexToRgb(TOKENS.bone);
	const accent = hexToRgb(TOKENS.emberLight);
	let bits = seedOf(`${spec.kind}:${spec.id}`);
	for (let row = 0; row < 5; row++) {
		for (let col = 0; col < 3; col++) {
			const on = bits & 1;
			bits = (bits >>> 1) | ((bits & 1) << 31);
			if (!on) continue;
			const color = row === 2 && col === 2 ? accent : bone;
			fill(png, 6 + col * 4, 6 + row * 4, 4, 4, color);
			fill(png, 6 + (4 - col) * 4, 6 + row * 4, 4, 4, color);
		}
	}
	return png;
}

/** Writes `<srcDir>/icons/<kind>/<id>.png` for every spec; byte-stable. */
export function writeIcons(srcDir: string, dataDir: string): string[] {
	const written: string[] = [];
	for (const spec of iconSpecs(dataDir)) {
		const dir = join(srcDir, "icons", spec.kind);
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, `${spec.id}.png`), PNG.sync.write(buildIcon(spec), { filterType: 0 }));
		written.push(`${spec.kind}/${spec.id}`);
	}
	return written;
}
