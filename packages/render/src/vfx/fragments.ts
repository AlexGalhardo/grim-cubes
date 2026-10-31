import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Fragment, type GameWorld, Position, PrevPosition, queryFragments } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface FragmentRenderer {
	/** Mirrors every fragment pile into the instance buffer; `seconds` drives the spin and bob. */
	sync(world: GameWorld, alpha: number, seconds: number): void;
	readonly live: number;
	readonly capacity: number;
}

const BASE_SIZE = 0.25;
/** A pile of many fragments grows up to this much (Art Bible section 5.1: 0.25 u cube, piles read larger). */
const MAX_EXTRA_SIZE = 0.2;
const VALUE_FOR_MAX_SIZE = 40;
const HOVER = 0.3;
const BOB = 0.06;
const SPIN_RATE = 2;

/** Fragment piles as emissive embers: one thin-instance mesh, one draw call. */
export function createFragmentRenderer(game: GameScene, capacity: number): FragmentRenderer {
	const mesh = CreateBox("vfx_fragments", { size: 1 }, game.scene);
	const material = new StandardMaterial("vfx_fragments", game.scene);
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
		sync(world, alpha, seconds): void {
			const list = queryFragments(world);
			let n = 0;
			for (let i = 0; i < list.length && n < capacity; i++) {
				const e = list[i] ?? 0;
				const px = PrevPosition.x[e] ?? 0;
				const pz = PrevPosition.z[e] ?? 0;
				const x = px + ((Position.x[e] ?? 0) - px) * alpha;
				const z = pz + ((Position.z[e] ?? 0) - pz) * alpha;
				const size =
					BASE_SIZE + MAX_EXTRA_SIZE * Math.min(1, (Fragment.value[e] ?? 0) / VALUE_FOR_MAX_SIZE);
				const phase = seconds * SPIN_RATE + e;
				writeTransform(set.matrices, n++, x, HOVER + Math.sin(phase) * BOB, z, size, phase);
			}
			live = n;
			set.commit(n);
		},
	};
}
