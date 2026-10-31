import { PNG } from "pngjs";
import { RuleError } from "./rules";

export const ATLAS_SIZE = 2048;
/** Edge pixels copied outwards so NEAREST sampling never bleeds a neighbour sprite. */
export const EXTRUDE = 2;

export interface Sprite {
	name: string;
	png: PNG;
}

export interface Placement {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

function intersects(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function contains(a: Rect, b: Rect): boolean {
	return b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
}

/** MaxRects, best-short-side-fit. Input is sorted by (height desc, name) so the result is reproducible. */
export function packSprites(atlasName: string, sprites: readonly Sprite[]): Placement[] {
	const sorted = [...sprites].sort(
		(a, b) => b.png.height - a.png.height || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
	);
	let free: Rect[] = [{ x: 0, y: 0, w: ATLAS_SIZE, h: ATLAS_SIZE }];
	const placements: Placement[] = [];
	for (const sprite of sorted) {
		const w = sprite.png.width + EXTRUDE * 2;
		const h = sprite.png.height + EXTRUDE * 2;
		let best: Rect | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (const f of free) {
			if (w > f.w || h > f.h) continue;
			const score = Math.min(f.w - w, f.h - h);
			if (
				score < bestScore ||
				(score === bestScore && best !== null && (f.y < best.y || (f.y === best.y && f.x < best.x)))
			) {
				best = f;
				bestScore = score;
			}
		}
		if (!best) {
			throw new RuleError(
				"atlas-overflow",
				atlasName,
				`no room for ${sprite.name} (${w}x${h}) in ${ATLAS_SIZE}x${ATLAS_SIZE}`,
			);
		}
		const used: Rect = { x: best.x, y: best.y, w, h };
		const next: Rect[] = [];
		for (const f of free) {
			if (!intersects(f, used)) {
				next.push(f);
				continue;
			}
			if (used.x > f.x) next.push({ x: f.x, y: f.y, w: used.x - f.x, h: f.h });
			if (used.x + used.w < f.x + f.w)
				next.push({ x: used.x + used.w, y: f.y, w: f.x + f.w - used.x - used.w, h: f.h });
			if (used.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: used.y - f.y });
			if (used.y + used.h < f.y + f.h)
				next.push({ x: f.x, y: used.y + used.h, w: f.w, h: f.y + f.h - used.y - used.h });
		}
		free = next.filter(
			(a, i) => !next.some((b, j) => i !== j && contains(b, a) && (!contains(a, b) || j < i)),
		);
		placements.push({
			name: sprite.name,
			x: used.x + EXTRUDE,
			y: used.y + EXTRUDE,
			width: sprite.png.width,
			height: sprite.png.height,
		});
	}
	return placements;
}

export function renderAtlas(sprites: readonly Sprite[], placements: readonly Placement[]): PNG {
	const atlas = new PNG({ width: ATLAS_SIZE, height: ATLAS_SIZE });
	atlas.data.fill(0);
	const byName = new Map(sprites.map((s) => [s.name, s.png]));
	for (const p of placements) {
		const src = byName.get(p.name);
		if (!src) continue;
		for (let dy = -EXTRUDE; dy < p.height + EXTRUDE; dy++) {
			const sy = Math.min(Math.max(dy, 0), p.height - 1);
			for (let dx = -EXTRUDE; dx < p.width + EXTRUDE; dx++) {
				const sx = Math.min(Math.max(dx, 0), p.width - 1);
				const from = (sy * p.width + sx) * 4;
				const to = ((p.y + dy) * ATLAS_SIZE + (p.x + dx)) * 4;
				atlas.data.set(src.data.subarray(from, from + 4), to);
			}
		}
	}
	return atlas;
}
