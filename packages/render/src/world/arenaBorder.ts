import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PALETTE } from "../scene/palette";
import { flatMaterial, type GameScene } from "../scene/scene";

const WALL_HEIGHT = 1.4;
const WALL_THICKNESS = 1;

export interface ArenaBorder {
	/** Moves the four walls to the border of a square with this half side (u, absolute) given the render origin. */
	update(half: number, originX: number, originZ: number): void;
	dispose(): void;
}

/**
 * The visible, impassable edge of the arena (ADR-0030): four dark iron walls. The simulation stops bodies at the
 * line; the walls only draw it. They sit outside the line, so the playable floor is never covered.
 */
export function createArenaBorder(game: GameScene): ArenaBorder {
	const { scene } = game;
	const material = flatMaterial(scene, "arena_wall", PALETTE.ironBlack);
	const walls: Mesh[] = [];
	for (let side = 0; side < 4; side++) {
		const wall = CreateBox(`arena_wall_${side}`, { width: 1, height: WALL_HEIGHT, depth: 1 }, scene);
		wall.material = material;
		wall.alwaysSelectAsActiveMesh = true;
		walls.push(wall);
	}
	let shown = Number.NaN;
	let shownX = Number.NaN;
	let shownZ = Number.NaN;
	return {
		update(half, originX, originZ): void {
			if (half === shown && originX === shownX && originZ === shownZ) return;
			shown = half;
			shownX = originX;
			shownZ = originZ;
			const offset = half + WALL_THICKNESS / 2;
			walls.forEach((wall, side) => {
				// Sides 0 and 1 run along X (north, south) and own the corners; 2 and 3 run along Z (east, west).
				const alongX = side < 2;
				const sign = side % 2 === 0 ? 1 : -1;
				wall.scaling.set(
					alongX ? 2 * half + 2 * WALL_THICKNESS : WALL_THICKNESS,
					1,
					alongX ? WALL_THICKNESS : 2 * half,
				);
				wall.position.set(
					alongX ? -originX : sign * offset - originX,
					WALL_HEIGHT / 2,
					alongX ? sign * offset - originZ : -originZ,
				);
			});
		},
		dispose(): void {
			for (const wall of walls) wall.dispose();
		},
	};
}
