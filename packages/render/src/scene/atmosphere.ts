import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PALETTE } from "./palette";
import type { GameScene } from "./scene";

export interface BiomeLook {
	/** `fogColor` of data/biomes.json; the default night colour when absent. */
	fogColor?: string | undefined;
	/** `music` of data/biomes.json: the track to play while this biome is on. */
	music?: string | undefined;
}

export interface Atmosphere {
	/** Sets fog and clear colour for the biome of the round and announces its music when it changes. */
	update(biome: number): void;
	/** The biome (index into the list given at creation) in effect; -1 before the first update. */
	readonly biome: number;
}

/** Fog and sky follow the biome of the round (ADR-0030: one biome per ten rounds). */
export function createAtmosphere(
	game: GameScene,
	looks: readonly BiomeLook[],
	onMusic?: (track: string) => void,
): Atmosphere {
	const colors = looks.map((look) => Color3.FromHexString(look.fogColor ?? PALETTE.night));
	let current = -1;
	return {
		get biome(): number {
			return current;
		},
		update(biome): void {
			if (biome === current) return;
			current = biome;
			const color = colors[biome] ?? colors[0];
			if (!color) return;
			game.scene.fogColor.copyFrom(color);
			game.scene.clearColor.r = color.r;
			game.scene.clearColor.g = color.g;
			game.scene.clearColor.b = color.b;
			const track = looks[biome]?.music;
			if (track) onMusic?.(track);
		},
	};
}
