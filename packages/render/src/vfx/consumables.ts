import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Consumable, type GameWorld, Position, PrevPosition, queryConsumables } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface ConsumableRenderer {
	/** Draws every consumable on the ground; `seconds` drives the spin and bob. */
	sync(world: GameWorld, alpha: number, seconds: number): void;
	readonly live: number;
}

/** GDD 15.4 kinds: 1 blood vial (red), 2 bone magnet (bone). */
const KIND_VIAL = 1;
const SIZE = 0.35;
const HOVER = 0.35;
const BOB = 0.08;
const SPIN_RATE = 1.5;
const CAPACITY = 64;
/** A pulsing ring on the ground marks every pick-up: diameter swells between these (u) at this rate (Hz). */
const RING_MIN = 0.7;
const RING_MAX = 1.2;
const RING_HZ = 1.1;
const RING_LAYER = 0.04;

/** Blood vials and bone magnets as emissive cubes: two meshes (one colour each), one draw call per kind. */
export function createConsumableRenderer(game: GameScene): ConsumableRenderer {
	const make = (name: string, hex: string) => {
		const mesh = CreateBox(name, { size: 1 }, game.scene);
		const material = new StandardMaterial(name, game.scene);
		material.disableLighting = true;
		material.emissiveColor = Color3.FromHexString(hex);
		material.diffuseColor = Color3.Black();
		mesh.material = material;
		return createInstanceSet(mesh, CAPACITY, false);
	};
	const makeRing = (name: string, hex: string) => {
		const mesh = CreateTorus(name, { diameter: 1, thickness: 0.07, tessellation: 20 }, game.scene);
		const material = new StandardMaterial(name, game.scene);
		material.disableLighting = true;
		material.emissiveColor = Color3.FromHexString(hex);
		material.diffuseColor = Color3.Black();
		mesh.material = material;
		return createInstanceSet(mesh, CAPACITY, false);
	};
	const vialRings = makeRing("vfx_vial_rings", PALETTE.bloodLight);
	const magnetRings = makeRing("vfx_magnet_rings", PALETTE.bone);
	const vials = make("vfx_vials", PALETTE.bloodLight);
	const magnets = make("vfx_magnets", PALETTE.bone);
	let live = 0;
	return {
		get live(): number {
			return live;
		},
		sync(world, alpha, seconds): void {
			const list = queryConsumables(world);
			let nVials = 0;
			let nMagnets = 0;
			for (let i = 0; i < list.length; i++) {
				const e = list[i] ?? 0;
				const isVial = (Consumable.kind[e] ?? 0) === KIND_VIAL;
				const n = isVial ? nVials : nMagnets;
				if (n >= CAPACITY) continue;
				const px = PrevPosition.x[e] ?? 0;
				const pz = PrevPosition.z[e] ?? 0;
				const x = px + ((Position.x[e] ?? 0) - px) * alpha;
				const z = pz + ((Position.z[e] ?? 0) - pz) * alpha;
				const phase = seconds * SPIN_RATE + e;
				writeTransform(
					(isVial ? vials : magnets).matrices,
					n,
					x,
					HOVER + Math.sin(phase) * BOB,
					z,
					SIZE,
					phase,
				);
				const pulse =
					RING_MIN +
					(RING_MAX - RING_MIN) * (0.5 + 0.5 * Math.sin(seconds * RING_HZ * Math.PI * 2 + e));
				writeTransform((isVial ? vialRings : magnetRings).matrices, n, x, RING_LAYER, z, pulse, 0);
				if (isVial) nVials++;
				else nMagnets++;
			}
			live = nVials + nMagnets;
			vials.commit(nVials);
			magnets.commit(nMagnets);
			vialRings.commit(nVials);
			magnetRings.commit(nMagnets);
		},
	};
}
