import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { BiomeMap, BiomeMix } from "@gc/game";
import { PALETTE } from "./palette";
import type { GameScene } from "./scene";

export interface BiomeLook {
	/** `fogColor` of data/biomes.json; the default night colour when absent. */
	fogColor?: string | undefined;
	/** `music` of data/biomes.json: the track to play while this biome dominates. */
	music?: string | undefined;
}

export interface Atmosphere {
	/** Mixes fog and clear colour for the hero at an absolute world position (origin + position). */
	update(absX: number, absZ: number): void;
	/** The biome (index into the list given at creation) that dominates the current position. */
	readonly biome: number;
}

/** Fog and sky follow the biome under the hero, blending across the 16 u border; music changes with the dominant one. */
export function createAtmosphere(
	game: GameScene,
	map: BiomeMap,
	looks: readonly BiomeLook[],
	onMusic?: (track: string) => void,
): Atmosphere {
	const colors = looks.map((look) => Color3.FromHexString(look.fogColor ?? PALETTE.night));
	const mix: BiomeMix = { from: 0, to: 0, t: 0 };
	let current = -1;
	return {
		get biome(): number {
			return current;
		},
		update(absX, absZ): void {
			map.mix(absX, absZ, mix);
			const a = colors[mix.from] ?? colors[0];
			const b = colors[mix.to] ?? a;
			if (!a || !b) return;
			Color3.LerpToRef(a, b, mix.t, game.scene.fogColor);
			game.scene.clearColor.r = game.scene.fogColor.r;
			game.scene.clearColor.g = game.scene.fogColor.g;
			game.scene.clearColor.b = game.scene.fogColor.b;
			const dominant = mix.t < 0.5 ? mix.from : mix.to;
			if (dominant !== current) {
				current = dominant;
				const track = looks[dominant]?.music;
				if (track) onMusic?.(track);
			}
		},
	};
}
