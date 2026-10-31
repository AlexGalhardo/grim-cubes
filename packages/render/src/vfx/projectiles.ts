import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import {
	EnemyShot,
	type GameWorld,
	Position,
	PrevPosition,
	Projectile,
	queryEnemyShots,
	queryProjectiles,
} from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface ProjectileRenderer {
	/** Mirrors every live projectile into the instance buffer, interpolated between steps. */
	sync(world: GameWorld, alpha: number): void;
	readonly live: number;
	readonly capacity: number;
}

/** Height above the ground at which shots fly (about the hero's chest). */
const FLIGHT_HEIGHT = 0.7;

/** Projectiles as emissive cubes: one thin-instance mesh, one draw call for the whole pool. */
export function createProjectileRenderer(
	game: GameScene,
	capacity: number,
	size: number,
): ProjectileRenderer {
	return createShotRenderer(
		game,
		"vfx_projectiles",
		capacity,
		size,
		PALETTE.ember,
		queryProjectiles,
		(e) => Projectile.life[e] ?? 0,
	);
}

/** Shots fired at the hero (the Watcher): same single draw call, blood-light so they read as hostile. */
export function createEnemyShotRenderer(game: GameScene, capacity: number, size: number): ProjectileRenderer {
	return createShotRenderer(
		game,
		"vfx_enemy_shots",
		capacity,
		size,
		PALETTE.bloodLight,
		queryEnemyShots,
		(e) => EnemyShot.life[e] ?? 0,
	);
}

function createShotRenderer(
	game: GameScene,
	name: string,
	capacity: number,
	size: number,
	color: string,
	query: (world: GameWorld) => readonly number[],
	life: (entity: number) => number,
): ProjectileRenderer {
	const mesh = CreateBox(name, { size: 1 }, game.scene);
	const material = new StandardMaterial(name, game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(color);
	material.diffuseColor = Color3.Black();
	mesh.material = material;
	const set = createInstanceSet(mesh, capacity, false);
	let live = 0;
	return {
		capacity,
		get live(): number {
			return live;
		},
		sync(world, alpha): void {
			const list = query(world);
			let n = 0;
			for (let i = 0; i < list.length && n < capacity; i++) {
				const e = list[i] ?? 0;
				if (life(e) === 0) continue;
				const px = PrevPosition.x[e] ?? 0;
				const pz = PrevPosition.z[e] ?? 0;
				const x = px + ((Position.x[e] ?? 0) - px) * alpha;
				const z = pz + ((Position.z[e] ?? 0) - pz) * alpha;
				writeTransform(set.matrices, n++, x, FLIGHT_HEIGHT, z, size, 0);
			}
			live = n;
			set.commit(n);
		},
	};
}
