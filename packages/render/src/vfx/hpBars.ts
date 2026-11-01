import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
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
import { CAMERA } from "../scene/camera";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, type InstanceSet } from "./instances";

export interface HpBarSwitch {
	hero: boolean;
	enemies: boolean;
}

export interface HpBars {
	/** Which bars to draw (the Options screen); the hero's and the enemies' are independent. */
	setHpBars(on: HpBarSwitch): void;
	/** Mirrors the bars into the instance buffers; call once per rendered frame. */
	sync(world: GameWorld, alpha: number): void;
	/** Bars drawn last sync. */
	readonly live: number;
}

const CAPACITY = 160;
const HEIGHT = 0.12;
const MIN_WIDTH = 0.8;
const ENEMY_Y = 2;
const HERO_Y = 2.3;
const HERO_WIDTH = 1.4;
/** The fill is a hair in front of the back plate so the two never z-fight. */
const FILL_LIFT = 0.01;

/**
 * Health bars drawn by the engine (no HUD DOM): one dark plate and one coloured fill, both thin instances of a quad
 * tilted back by the camera elevation, so the cost is two draw calls however many bars show. The hero's bar is always
 * full-width and Ember-light; an enemy's shows only once it is hurt (Blood-light), and bosses keep their own bar.
 */
export function createHpBars(game: GameScene): HpBars {
	const plateMaterial = unlit(game, "hp_plate", PALETTE.night);
	const fillMaterial = unlit(game, "hp_fill", PALETTE.bone);
	const plate = quad(game, "hp_plates", plateMaterial);
	const fill = quad(game, "hp_fills", fillMaterial);
	const elevation = Math.PI / 2 - CAMERA.beta;
	const cosE = Math.cos(elevation);
	const sinE = Math.sin(elevation);
	const enemyColor = Color3.FromHexString(PALETTE.bloodLight);
	const heroColor = Color3.FromHexString(PALETTE.emberLight);
	let show: HpBarSwitch = { hero: true, enemies: true };
	let live = 0;

	function write(set: InstanceSet, n: number, x: number, y: number, z: number, width: number): void {
		const o = n * 16;
		const m = set.matrices;
		m[o] = width;
		m[o + 5] = HEIGHT * cosE;
		m[o + 6] = HEIGHT * sinE;
		m[o + 9] = -sinE;
		m[o + 10] = cosE;
		m[o + 12] = x;
		m[o + 13] = y;
		m[o + 14] = z;
	}

	function bar(
		n: number,
		x: number,
		y: number,
		z: number,
		width: number,
		ratio: number,
		color: Color3,
	): void {
		write(plate, n, x, y, z, width);
		const filled = Math.max(0.001, Math.min(1, ratio)) * width;
		// The fill is anchored on the left edge of the plate (camera right is +x).
		write(fill, n, x - (width - filled) / 2, y + FILL_LIFT, z - FILL_LIFT, filled);
		const colors = fill.colors;
		if (colors) {
			colors[n * 4] = color.r;
			colors[n * 4 + 1] = color.g;
			colors[n * 4 + 2] = color.b;
			colors[n * 4 + 3] = 1;
		}
		const back = plate.colors;
		if (back) {
			back[n * 4] = back[n * 4 + 1] = back[n * 4 + 2] = back[n * 4 + 3] = 1;
		}
	}

	return {
		get live(): number {
			return live;
		},
		setHpBars(on): void {
			show = { hero: on.hero, enemies: on.enemies };
		},
		sync(world, alpha): void {
			let n = 0;
			const hero = findHero(world);
			if (show.hero && hero >= 0) {
				const max = Math.max(1, Health.max[hero] ?? 1);
				const px = PrevPosition.x[hero] ?? 0;
				const pz = PrevPosition.z[hero] ?? 0;
				bar(
					n++,
					px + ((Position.x[hero] ?? 0) - px) * alpha,
					HERO_Y,
					pz + ((Position.z[hero] ?? 0) - pz) * alpha,
					HERO_WIDTH,
					(Health.hp[hero] ?? 0) / max,
					heroColor,
				);
			}
			if (show.enemies) {
				const enemies = queryEnemies(world);
				for (let i = 0; i < enemies.length && n < CAPACITY; i++) {
					const e = enemies[i] ?? 0;
					const hp = Health.hp[e] ?? 0;
					const max = Health.max[e] ?? 0;
					if (hp <= 0 || max <= 0 || hp >= max || (Boss.id[e] ?? 0) > 0) continue;
					const px = PrevPosition.x[e] ?? 0;
					const pz = PrevPosition.z[e] ?? 0;
					const radius = Radius.r[e] ?? enemiesData[EnemyType.id[e] ?? 0]?.radius ?? 0.5;
					bar(
						n++,
						px + ((Position.x[e] ?? 0) - px) * alpha,
						ENEMY_Y,
						pz + ((Position.z[e] ?? 0) - pz) * alpha,
						Math.max(MIN_WIDTH, radius * 2),
						hp / max,
						enemyColor,
					);
				}
			}
			live = n;
			plate.commit(n);
			fill.commit(n);
		},
	};
}

function unlit(game: GameScene, name: string, hex: string): StandardMaterial {
	const material = new StandardMaterial(name, game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(hex);
	material.diffuseColor = Color3.Black();
	material.backFaceCulling = false;
	return material;
}

function quad(game: GameScene, name: string, material: StandardMaterial): InstanceSet {
	const mesh = CreatePlane(name, { width: 1, height: 1 }, game.scene);
	mesh.material = material;
	return createInstanceSet(mesh, CAPACITY, true);
}
