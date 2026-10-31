import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { Elite, type GameWorld, Position, PrevPosition, queryElites } from "@gc/game";
import { auraHex } from "../scene/aura";
import type { GameScene } from "../scene/scene";
import { createInstanceSet, type InstanceSet, writeTransform } from "./instances";

export interface EliteAuras {
	/** Draws the ground pattern and the slow motes of every live elite; `seconds` is the render clock. */
	sync(world: GameWorld, alpha: number, seconds: number): void;
	/** Instances drawn for the modifier at `index` (0-based) last sync. */
	drawn(index: number): number;
}

/** Elites with an aura at once; the rest keep only the tint. */
const MAX_ELITES = 12;
const PADS = 12;
const MOTES = 4;
const PER_ELITE = PADS + MOTES;
const PAD_SIZE = 0.28;
const MOTE_SIZE = 0.12;
const MOTE_RISE = 0.5;
const MOTE_HEIGHT = 1.8;
const SPIN = 0.6;

type Shape = "ring" | "spikes" | "pulse" | "sparks";
/** Art Bible section 3.3: the colour tells the modifier and the shape backs it up for colour-blind players. */
const SHAPES: readonly Shape[] = ["ring", "spikes", "pulse", "sparks"];

interface Layer {
	set: InstanceSet;
	count: number;
}

/**
 * Art Bible section 9 elite auras: a ring of emissive pads on the ground plus slow rising motes, one thin-instance
 * mesh per modifier so the colour needs no per-instance buffer. `radius` is the elite's ground footprint.
 */
export function createEliteAuras(game: GameScene, auras: readonly string[], radius: number): EliteAuras {
	const layers: Layer[] = auras.map((aura, index) => {
		const shape = SHAPES[index % SHAPES.length] ?? "ring";
		const mesh = CreateBox(
			`vfx_elite_aura_${index}`,
			shape === "spikes" ? { width: 1, height: 3, depth: 1 } : { width: 1, height: 0.3, depth: 1 },
			game.scene,
		);
		const material = new StandardMaterial(`vfx_elite_aura_${index}`, game.scene);
		material.disableLighting = true;
		material.emissiveColor = Color3.FromHexString(auraHex(aura));
		material.diffuseColor = Color3.Black();
		mesh.material = material;
		return { set: createInstanceSet(mesh, MAX_ELITES * PER_ELITE, false), count: 0 };
	});

	return {
		drawn: (index): number => layers[index]?.count ?? 0,
		sync(world, alpha, seconds): void {
			for (const layer of layers) layer.count = 0;
			const list = queryElites(world);
			let elites = 0;
			for (let i = 0; i < list.length && elites < MAX_ELITES; i++) {
				const e = list[i] ?? 0;
				const index = (Elite.modifier[e] ?? 0) - 1;
				const layer = layers[index];
				if (!layer) continue;
				elites++;
				const shape = SHAPES[index % SHAPES.length] ?? "ring";
				const px = PrevPosition.x[e] ?? 0;
				const pz = PrevPosition.z[e] ?? 0;
				const x = px + ((Position.x[e] ?? 0) - px) * alpha;
				const z = pz + ((Position.z[e] ?? 0) - pz) * alpha;
				const spin = seconds * SPIN + e;
				for (let k = 0; k < PADS; k++) {
					const angle = (k / PADS) * Math.PI * 2 + spin;
					const r =
						shape === "pulse"
							? radius * (1.1 + 0.25 * Math.sin(seconds * 3 + e))
							: shape === "spikes" && k % 2 === 1
								? radius * 1.35
								: radius * 1.1;
					const size = shape === "sparks" ? PAD_SIZE * (k % 3 === 0 ? 1 : 0.5) : PAD_SIZE;
					writeTransform(
						layer.set.matrices,
						layer.count++,
						x + Math.cos(angle) * r,
						shape === "spikes" ? 0.3 : 0.02,
						z + Math.sin(angle) * r,
						size,
						angle,
					);
				}
				for (let k = 0; k < MOTES; k++) {
					const phase = (seconds * MOTE_RISE + k / MOTES + e * 0.37) % 1;
					const angle = (k / MOTES) * Math.PI * 2 + spin * 2;
					writeTransform(
						layer.set.matrices,
						layer.count++,
						x + Math.cos(angle) * radius * 0.7,
						phase * MOTE_HEIGHT,
						z + Math.sin(angle) * radius * 0.7,
						MOTE_SIZE * (1 - phase * 0.6),
						angle,
					);
				}
			}
			for (const layer of layers) layer.set.commit(layer.count);
		},
	};
}
