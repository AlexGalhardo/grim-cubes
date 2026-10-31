import type { AudioEngine } from "./audioEngine";

/** The surface a biome's music track says the hero walks on: mud in the swamp and the nest, stone elsewhere. */
export function surfaceFor(biomeTrack: string | null): "mud" | "stone" {
	return biomeTrack === "mus_biome_swamp" || biomeTrack === "mus_biome_nest" ? "mud" : "stone";
}

/** One step every `stride` units walked; the first call only remembers where the hero is. */
export function createFootsteps(
	engine: Pick<AudioEngine, "play">,
	stride = 1.7,
): { update(x: number, z: number, biomeTrack: string | null): void; reset(): void } {
	let last: { x: number; z: number } | null = null;
	let walked = 0;
	return {
		update(x, z, biomeTrack): void {
			if (last) {
				walked += Math.hypot(x - last.x, z - last.z);
				// A jump larger than any walk (an origin shift, a respawn) is not walking.
				if (Math.hypot(x - last.x, z - last.z) > 5) walked = 0;
			}
			last = { x, z };
			if (walked < stride) return;
			walked -= stride;
			engine.play(`sfx_step_${surfaceFor(biomeTrack)}`, {
				priority: "hero",
				maxVoices: 2,
				pitchSpread: 0.08,
			});
		},
		reset(): void {
			last = null;
			walked = 0;
		},
	};
}
