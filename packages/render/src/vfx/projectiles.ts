import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { type GameWorld, Position, PrevPosition, Projectile, queryProjectiles } from "@gc/game";
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
	const mesh = CreateBox("vfx_projectiles", { size: 1 }, game.scene);
	const material = new StandardMaterial("vfx_projectiles", game.scene);
	material.disableLighting = true;
	material.emissiveColor = Color3.FromHexString(PALETTE.emberLight);
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
			const list = queryProjectiles(world);
			let n = 0;
			for (let i = 0; i < list.length && n < capacity; i++) {
				const e = list[i] ?? 0;
				if ((Projectile.life[e] ?? 0) === 0) continue;
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
