import { PNG } from "pngjs";
import type { BbAnimation, BbElement, BbGroup, BbKeyframe, BbModel, Vec3 } from "../assets-build/bbmodel";
import { PIXELS_PER_UNIT } from "../assets-build/bbmodel";
import type { Category } from "../assets-build/rules";
import { ramp, type TokenName } from "./palette";

/** Side of one flat colour swatch in the generated texture. */
const SWATCH = 8;
const TONE = { light: 0, mid: 1, dark: 2 } as const;

export interface PartDef {
	group: string;
	/** Pixels, absolute model space (origin at the centre of the base, front towards +Z). */
	from: Vec3;
	to: Vec3;
	color: TokenName;
	rotation?: Vec3;
}

export interface GroupDef {
	name: string;
	parent: string | null;
	/** Pivot in pixels. */
	origin: Vec3;
	/** Rest rotation in degrees (multiples of 22.5). */
	rotation?: Vec3;
}

export interface TrackDef {
	group: string;
	channel: BbKeyframe["channel"];
	/** [time in seconds, x, y, z]. Rotation in degrees, position in pixels, scale as a factor. */
	keys: readonly (readonly [number, number, number, number])[];
}

export interface ClipDef {
	name: string;
	/** Frames at 12 fps; the clip length is frames / 12. */
	frames: number;
	tracks: readonly TrackDef[];
}

export interface ModelDef {
	name: string;
	category: Category;
	/** Texture side in pixels, a multiple of 32. */
	texture: 32 | 64;
	groups: readonly GroupDef[];
	parts: readonly PartDef[];
	clips: readonly ClipDef[];
}

export interface GeneratedModel {
	bbmodel: BbModel & { meta: Record<string, unknown> };
	texture: PNG;
}

function swatchOrigin(index: number, side: number): [number, number] {
	const perRow = side / SWATCH;
	return [(index % perRow) * SWATCH, Math.floor(index / perRow) * SWATCH];
}

/** Builds the `.bbmodel` and its flat-swatch texture: one 3-tone ramp per colour, top light, bottom dark. */
export function generate(def: ModelDef): GeneratedModel {
	const colors = [...new Set(def.parts.map((p) => p.color))];
	if (colors.length * 3 > 12)
		throw new Error(`${def.name}: ${colors.length} colours exceed the 12-colour texture budget`);
	const swatches = colors.length * 3;
	if (swatches > (def.texture / SWATCH) ** 2) throw new Error(`${def.name}: texture too small`);

	const png = new PNG({ width: def.texture, height: def.texture });
	png.data.fill(0);
	colors.forEach((color, ci) => {
		ramp(color).forEach((rgb, tone) => {
			const [ox, oy] = swatchOrigin(ci * 3 + tone, def.texture);
			for (let y = 0; y < SWATCH; y++) {
				for (let x = 0; x < SWATCH; x++)
					png.data.set([rgb[0], rgb[1], rgb[2], 255], ((oy + y) * def.texture + ox + x) * 4);
			}
		});
	});
	const uvFor = (color: TokenName, tone: number): [number, number, number, number] => {
		const [ox, oy] = swatchOrigin(colors.indexOf(color) * 3 + tone, def.texture);
		return [ox, oy, ox + SWATCH, oy + SWATCH];
	};

	const uuid = (kind: string, name: string): string => `${kind}_${name}`;
	const elements: BbElement[] = def.parts.map((part, i) => {
		const face = (tone: number): { uv: [number, number, number, number]; texture: number } => ({
			uv: uvFor(part.color, tone),
			texture: 0,
		});
		return {
			uuid: uuid("e", String(i)),
			name: `${part.group}_${i}`,
			type: "cube",
			from: part.from,
			to: part.to,
			origin: part.rotation
				? (part.from.map((v, k) => (v + (part.to[k] ?? 0)) / 2) as Vec3)
				: part.from,
			...(part.rotation ? { rotation: part.rotation } : {}),
			faces: {
				north: face(TONE.mid),
				south: face(TONE.mid),
				east: face(TONE.mid),
				west: face(TONE.mid),
				up: face(TONE.light),
				down: face(TONE.dark),
			},
		};
	});

	const build = (parent: string | null): BbGroup[] =>
		def.groups
			.filter((g) => g.parent === parent)
			.map((g) => ({
				uuid: uuid("g", g.name),
				name: g.name,
				origin: g.origin,
				...(g.rotation ? { rotation: g.rotation } : {}),
				children: [
					...def.parts.flatMap((p, i) => (p.group === g.name ? [uuid("e", String(i))] : [])),
					...build(g.name),
				],
			}));

	const animations: BbAnimation[] = def.clips.map((clip) => {
		const animators: BbAnimation["animators"] = {};
		for (const track of clip.tracks) {
			const key = uuid("g", track.group);
			const animator = animators[key] ?? { name: track.group, keyframes: [] };
			for (const [time, x, y, z] of track.keys) {
				animator.keyframes.push({ channel: track.channel, time, data_points: [{ x, y, z }] });
			}
			animators[key] = animator;
		}
		return { name: clip.name, length: clip.frames / 12, animators };
	});

	return {
		bbmodel: {
			meta: { format_version: "4.10", model_format: "free", box_uv: false },
			name: def.name,
			resolution: { width: def.texture, height: def.texture },
			elements,
			outliner: build(null),
			textures: [{ name: `${def.name}_d.png`, width: def.texture, height: def.texture }],
			animations,
		},
		texture: png,
	};
}

export const pixelsPerUnit = (category: Category): number => PIXELS_PER_UNIT[category];
