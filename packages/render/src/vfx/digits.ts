import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Constants } from "@babylonjs/core/Engines/constants";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { createInstanceSet, type InstanceSet } from "./instances";

const MAX_DIGITS = 6;
/** Hits on the same owner closer together than this add up into one number. */
const MERGE_SECONDS = 0.1;
/** Inter, the same face the UI draws every number in (`GC Digits`, Art Bible §11): its 1, 5 and 2 are unambiguous. */
const FONT_FAMILY = '"Inter", sans-serif';
const FONT_PX = 64;
/** Inter's digit height as a share of the font size. */
const DIGIT_HEIGHT = 0.727;
/** Neighbouring cells overlap by this share of the advance; the cell padding is transparent, so nothing is covered. */
const ADVANCE = 0.9;

export interface DigitAtlasLayout {
	cellWidth: number;
	cellHeight: number;
	atlasWidth: number;
	/** Baseline of the digits inside a cell, from the top. */
	baseline: number;
}

/** Cell geometry of the digit atlas: one cell per digit, with room for the outline on every side. */
export function digitAtlasLayout(outline: number): DigitAtlasLayout {
	const pad = Math.ceil(outline) + 1;
	const ink = Math.ceil(FONT_PX * DIGIT_HEIGHT);
	const cellWidth = Math.ceil(FONT_PX * 0.62) + 2 * pad;
	const cellHeight = ink + 2 * pad;
	return { cellWidth, cellHeight, atlasWidth: cellWidth * 10, baseline: pad + ink };
}

/**
 * Paints the ten digits in white with a dark outline into a canvas atlas. Without a DOM (unit tests) the atlas is a
 * plain white block: the glyphs only matter on screen.
 */
function paintAtlas(layout: DigitAtlasLayout, outline: number, outlineColor: string): Uint8Array {
	const { cellWidth, cellHeight, atlasWidth, baseline } = layout;
	const bytes = new Uint8Array(atlasWidth * cellHeight * 4).fill(255);
	if (typeof document === "undefined") return bytes;
	const canvas = document.createElement("canvas");
	canvas.width = atlasWidth;
	canvas.height = cellHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) return bytes;
	ctx.clearRect(0, 0, atlasWidth, cellHeight);
	ctx.font = `700 ${FONT_PX}px ${FONT_FAMILY}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.lineJoin = "round";
	ctx.lineWidth = outline * 2;
	ctx.strokeStyle = outlineColor;
	ctx.fillStyle = "#FFFFFF";
	for (let d = 0; d < 10; d++) {
		const cx = d * cellWidth + cellWidth / 2;
		ctx.strokeText(String(d), cx, baseline);
		ctx.fillText(String(d), cx, baseline);
	}
	return new Uint8Array(ctx.getImageData(0, 0, atlasWidth, cellHeight).data.buffer);
}

export interface DamageNumbers {
	/** Shows `value` above (x, z); crit numbers are larger and use `critColor`. */
	spawn(value: number, x: number, z: number, crit: boolean, owner?: number): void;
	/** Size multiplier of every number (small screens draw them smaller). */
	setScale(scale: number): void;
	update(dtSeconds: number): void;
	shift(dx: number, dz: number): void;
	clear(): void;
	readonly live: number;
	readonly dropped: number;
}

export interface DamageNumbersConfig {
	pool: number;
	lifeSeconds: number;
	rise: number;
	height: number;
	/** Camera elevation in radians: the digit quads are tilted to face it. */
	elevation: number;
	color: readonly [number, number, number];
	critColor: readonly [number, number, number];
	/** Outline thickness in atlas pixels. */
	outline: number;
	/** Colour of the outline (a CSS colour). */
	outlineColor: string;
	/** Size multiplier of a crit number. */
	critScale: number;
}

/**
 * Damage numbers drawn by the engine: one quad mesh per digit (UVs pick the glyph from a generated Inter
 * atlas), thin instances for every digit on screen, so ten draw calls cover any number of numbers. The camera never
 * rotates, so the quads are tilted once instead of being billboarded.
 */
export function createDamageNumbers(scene: Scene, config: DamageNumbersConfig): DamageNumbers {
	const layout = digitAtlasLayout(config.outline);
	const { cellWidth, cellHeight, atlasWidth } = layout;
	const texture = RawTexture.CreateRGBATexture(
		paintAtlas(layout, config.outline, config.outlineColor),
		atlasWidth,
		cellHeight,
		scene,
		false,
		false,
		Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
		Constants.TEXTURETYPE_UNSIGNED_BYTE,
	);
	texture.hasAlpha = true;
	// The face may still be downloading when the scene is built: draw the atlas again once it is there.
	if (typeof document !== "undefined" && document.fonts) {
		void document.fonts.load(`700 ${FONT_PX}px ${FONT_FAMILY}`, "0123456789").then(() => {
			texture.update(paintAtlas(layout, config.outline, config.outlineColor));
		});
	}
	const material = new StandardMaterial("vfx_digits", scene);
	material.diffuseTexture = texture;
	material.useAlphaFromDiffuseTexture = true;
	material.disableLighting = true;
	// Unlit: the colour is emissive white times the glyph texture times the instance colour; without it the digits render black.
	material.emissiveColor = Color3.White();
	material.specularColor = Color3.Black();
	material.backFaceCulling = false;

	const sets: InstanceSet[] = [];
	for (let d = 0; d < 10; d++) {
		const quad = CreatePlane(`vfx_digit_${d}`, { width: 1, height: 1 }, scene);
		const u0 = (d * cellWidth) / atlasWidth;
		const u1 = ((d + 1) * cellWidth) / atlasWidth;
		quad.setVerticesData(VertexBuffer.UVKind, [u0, 1, u1, 1, u1, 0, u0, 0], true);
		quad.material = material;
		sets.push(createInstanceSet(quad, config.pool * MAX_DIGITS, true));
	}

	const x = new Float32Array(config.pool);
	const z = new Float32Array(config.pool);
	const age = new Float32Array(config.pool);
	const value = new Int32Array(config.pool);
	const crit = new Uint8Array(config.pool);
	let live = 0;
	let dropped = 0;
	const owner = new Int32Array(config.pool).fill(-1);
	let sizeScale = 1;
	const counts = new Int32Array(10);
	const cosE = Math.cos(config.elevation);
	const sinE = Math.sin(config.elevation);

	function remove(i: number): void {
		const last = --live;
		x[i] = x[last] ?? 0;
		z[i] = z[last] ?? 0;
		age[i] = age[last] ?? 0;
		value[i] = value[last] ?? 0;
		crit[i] = crit[last] ?? 0;
		owner[i] = owner[last] ?? -1;
	}

	return {
		get live(): number {
			return live;
		},
		get dropped(): number {
			return dropped;
		},
		setScale(scale): void {
			sizeScale = scale;
		},
		spawn(amount, px, pz, isCrit, who = -1): void {
			if (who >= 0) {
				for (let k = 0; k < live; k++) {
					if (owner[k] !== who || (age[k] ?? 0) > MERGE_SECONDS) continue;
					value[k] = (value[k] ?? 0) + Math.max(0, Math.round(amount));
					if (isCrit) crit[k] = 1;
					return;
				}
			}
			if (live >= config.pool) {
				dropped++;
				return;
			}
			const i = live++;
			x[i] = px;
			z[i] = pz;
			age[i] = 0;
			value[i] = Math.max(0, Math.round(amount));
			crit[i] = isCrit ? 1 : 0;
			owner[i] = who;
		},
		update(dt): void {
			counts.fill(0);
			for (let i = 0; i < live; ) {
				age[i] = (age[i] ?? 0) + dt;
				if ((age[i] ?? 0) >= config.lifeSeconds) {
					remove(i);
					continue;
				}
				const t = (age[i] ?? 0) / config.lifeSeconds;
				const scale = (crit[i] ? config.critScale : 1) * config.height * sizeScale;
				const width = scale * (cellWidth / cellHeight);
				const color = crit[i] ? config.critColor : config.color;
				// Digits are peeled off the integer right to left: no strings, so nothing is allocated per frame.
				let rest = (value[i] ?? 0) % 10 ** MAX_DIGITS;
				const digitCount = rest < 10 ? 1 : Math.min(MAX_DIGITS, Math.floor(Math.log10(rest)) + 1);
				const y = 1.9 + config.rise * t;
				for (let k = digitCount - 1; k >= 0; k--) {
					const d = rest % 10;
					rest = Math.floor(rest / 10);
					const set = sets[d];
					const n = counts[d] ?? 0;
					if (!set || n >= set.capacity) continue;
					counts[d] = n + 1;
					const offset = (k - (digitCount - 1) / 2) * (width * ADVANCE);
					const o = n * 16;
					// Quad tilted back by the camera elevation so it faces the camera; scaled to the glyph aspect.
					set.matrices[o] = width;
					set.matrices[o + 1] = 0;
					set.matrices[o + 2] = 0;
					set.matrices[o + 4] = 0;
					set.matrices[o + 5] = scale * cosE;
					set.matrices[o + 6] = scale * sinE;
					set.matrices[o + 8] = 0;
					set.matrices[o + 9] = -sinE;
					set.matrices[o + 10] = cosE;
					set.matrices[o + 12] = (x[i] ?? 0) + offset;
					set.matrices[o + 13] = y;
					set.matrices[o + 14] = z[i] ?? 0;
					const colors = set.colors;
					if (colors) {
						colors[n * 4] = color[0];
						colors[n * 4 + 1] = color[1];
						colors[n * 4 + 2] = color[2];
						colors[n * 4 + 3] = Math.min(1, (1 - t) * 3);
					}
				}
				i++;
			}
			for (let d = 0; d < 10; d++) sets[d]?.commit(counts[d] ?? 0);
		},
		shift(dx, dz): void {
			for (let i = 0; i < live; i++) {
				x[i] = (x[i] ?? 0) - dx;
				z[i] = (z[i] ?? 0) - dz;
			}
		},
		clear(): void {
			live = 0;
			for (const set of sets) set.commit(0);
		},
	};
}
