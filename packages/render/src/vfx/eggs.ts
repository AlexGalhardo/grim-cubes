import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Egg, type GameWorld, Position, queryEggs, Radius } from "@gc/game";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, writeTransform } from "./instances";

export interface EggRenderer {
	/** Mirrors every Nest Queen egg into the instance buffer; the shell shakes harder as the hatch nears. */
	sync(world: GameWorld, seconds: number): void;
	readonly live: number;
}

const CAPACITY = 16;
/** Steps left (at 60 Hz) under which the egg trembles and cracks: the last second. */
const TREMBLE_STEPS = 60;
const TREMBLE_AMPLITUDE = 0.08;
const TREMBLE_HZ = 14;
const SIZE_PER_RADIUS = 1.6;
const CORE_RATIO = 0.55;
/** The ember core swells to this share of the shell as the hatch nears: light through the cracks. */
const CRACKED_CORE_RATIO = 0.95;

/** Eggs as bone-coloured cubes with an ember core: one shell mesh and one core mesh, two draw calls. */
export function createEggRenderer(game: GameScene): EggRenderer {
	const shell = CreateBox("vfx_eggs", { size: 1 }, game.scene);
	const shellMaterial = new StandardMaterial("vfx_eggs", game.scene);
	shellMaterial.diffuseColor = Color3.FromHexString(PALETTE.bone);
	shellMaterial.specularColor = Color3.Black();
	shell.material = shellMaterial;
	const shells = createInstanceSet(shell, CAPACITY, false);
	const core = CreateBox("vfx_eggs_core", { size: 1 }, game.scene);
	const coreMaterial = new StandardMaterial("vfx_eggs_core", game.scene);
	coreMaterial.disableLighting = true;
	coreMaterial.emissiveColor = Color3.FromHexString(PALETTE.ember);
	coreMaterial.diffuseColor = Color3.Black();
	core.material = coreMaterial;
	const cores = createInstanceSet(core, CAPACITY, false);
	let live = 0;
	return {
		get live(): number {
			return live;
		},
		sync(world, seconds): void {
			const list = queryEggs(world);
			let n = 0;
			for (let i = 0; i < list.length && n < CAPACITY; i++) {
				const e = list[i] ?? 0;
				const size = (Radius.r[e] ?? 0.6) * SIZE_PER_RADIUS;
				const hatch = Egg.hatch[e] ?? 0;
				const shake =
					hatch < TREMBLE_STEPS
						? Math.sin(seconds * TREMBLE_HZ * Math.PI * 2 + e) *
							TREMBLE_AMPLITUDE *
							(1 - hatch / TREMBLE_STEPS)
						: 0;
				const x = (Position.x[e] ?? 0) + shake;
				const z = Position.z[e] ?? 0;
				writeTransform(shells.matrices, n, x, size / 2, z, size, e);
				const cracked =
					hatch < TREMBLE_STEPS
						? CORE_RATIO + (CRACKED_CORE_RATIO - CORE_RATIO) * (1 - hatch / TREMBLE_STEPS)
						: CORE_RATIO;
				writeTransform(cores.matrices, n, x, size / 2, z, size * cracked, e + 1);
				n++;
			}
			live = n;
			shells.commit(n);
			cores.commit(n);
		},
	};
}
