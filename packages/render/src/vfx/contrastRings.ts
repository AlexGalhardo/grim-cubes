import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import {
	Boss,
	EnemyType,
	enemiesData,
	findHero,
	type GameWorld,
	Health,
	Position,
	PrevPosition,
	queryEnemies,
	Radius,
} from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet } from "./instances";

export interface ContrastRings {
	/** Draws a pale ring under the hero (strong) and under every live enemy (faint). Once per rendered frame. */
	sync(world: GameWorld, alpha: number): void;
	setEnabled(on: boolean): void;
	readonly live: number;
}

const CAPACITY = 320;
const THICKNESS = 0.07;
const LAYER = 0.035;
const HERO_DIAMETER = 1.3;
const HERO_ALPHA = 0.85;
const ENEMY_ALPHA = 0.3;
const ENEMY_MIN_DIAMETER = 0.9;
const ENEMY_RADIUS_TO_DIAMETER = 2.2;
const BOSS_ALPHA = 0.5;

/**
 * A pale ground ring under the hero and the enemies so they stand out of the map (the scene is grimdark and the
 * floor is dark, but the models are too). One thin-instance torus for all of them: one draw call, the hero's ring
 * brighter than the enemies'. It is the whole effect on the `low` and `minimum` presets and costs nothing per frame
 * beyond the matrix writes.
 */
export function createContrastRings(game: GameScene): ContrastRings {
	const mesh = CreateTorus(
		"vfx_contrast_rings",
		{ diameter: 1, thickness: THICKNESS, tessellation: 20 },
		game.scene,
	);
	const material = new StandardMaterial("vfx_contrast_rings", game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.White();
	material.diffuseColor = Color3.Black();
	mesh.material = material;
	const set = createInstanceSet(mesh, CAPACITY, true);
	const tint = Color3.FromHexString(PALETTE.bone);
	let enabled = true;
	let live = 0;

	function ring(n: number, x: number, z: number, diameter: number, alpha: number): void {
		const o = n * 16;
		const m = set.matrices;
		m[o] = m[o + 5] = m[o + 10] = diameter;
		m[o + 12] = x;
		m[o + 13] = LAYER;
		m[o + 14] = z;
		const colors = set.colors;
		if (colors) {
			colors[n * 4] = tint.r;
			colors[n * 4 + 1] = tint.g;
			colors[n * 4 + 2] = tint.b;
			colors[n * 4 + 3] = alpha;
		}
	}

	return {
		get live(): number {
			return live;
		},
		setEnabled(on): void {
			enabled = on;
		},
		sync(world, alpha): void {
			let n = 0;
			if (enabled) {
				const hero = findHero(world);
				if (hero >= 0 && (Health.hp[hero] ?? 0) > 0) {
					const px = PrevPosition.x[hero] ?? 0;
					const pz = PrevPosition.z[hero] ?? 0;
					ring(
						n++,
						px + ((Position.x[hero] ?? 0) - px) * alpha,
						pz + ((Position.z[hero] ?? 0) - pz) * alpha,
						HERO_DIAMETER,
						HERO_ALPHA,
					);
				}
				const enemies = queryEnemies(world);
				for (let i = 0; i < enemies.length && n < CAPACITY; i++) {
					const e = enemies[i] ?? 0;
					if ((Health.hp[e] ?? 0) <= 0) continue;
					const px = PrevPosition.x[e] ?? 0;
					const pz = PrevPosition.z[e] ?? 0;
					const radius = Radius.r[e] ?? enemiesData[EnemyType.id[e] ?? 0]?.radius ?? 0.5;
					ring(
						n++,
						px + ((Position.x[e] ?? 0) - px) * alpha,
						pz + ((Position.z[e] ?? 0) - pz) * alpha,
						Math.max(ENEMY_MIN_DIAMETER, radius * ENEMY_RADIUS_TO_DIAMETER),
						(Boss.id[e] ?? 0) > 0 ? BOSS_ALPHA : ENEMY_ALPHA,
					);
				}
			}
			live = n;
			set.commit(n);
		},
	};
}
