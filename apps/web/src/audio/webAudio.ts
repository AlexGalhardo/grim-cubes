import type { AudioDeps, ContextLike, MediaLike } from "./audioEngine";

const SOUND_URL = (id: string): string => `/assets/audio/${id}.mp3`;

/** The browser side of `AudioDeps`: AudioContext, fetch for sfx bytes and an `Audio` element per music track. */
export function createWebAudioDeps(warn: AudioDeps["warn"]): AudioDeps {
	return {
		createContext: () => new AudioContext() as unknown as ContextLike,
		async loadBytes(id): Promise<ArrayBuffer | null> {
			const response = await fetch(SOUND_URL(id));
			// A dev server answers a missing file with index.html (200): only audio counts.
			const type = response.headers.get("content-type") ?? "";
			return response.ok && !type.startsWith("text/") ? response.arrayBuffer() : null;
		},
		createMedia(id): MediaLike {
			const element = new Audio(SOUND_URL(id));
			element.preload = "auto";
			return element as unknown as MediaLike;
		},
		random: Math.random,
		warn,
	};
}

export interface MusicState {
	/** `RunState` name. */
	state: string;
	/** The difficulty screen (the pre-run menu) is open. */
	menu: boolean;
	/** Track of the biome under the hero (`onMusic`), if any. */
	biomeTrack: string | null;
}

/** The ambience loop of the biome under the hero while a run is on screen; none on the menus and the results. */
export function ambienceFor({ state, menu, biomeTrack }: MusicState): string | null {
	if (menu || state === "Results" || state === "Idle") return null;
	const biome = biomeTrack ? /^mus_biome_(\w+)$/.exec(biomeTrack)?.[1] : undefined;
	return biome ? `sfx_ambience_${biome}` : null;
}

/** The loop heard while a weapon keeps firing (the machine guns), or null for a weapon of one-off shots. */
export function weaponLoopFor(weaponId: string | undefined): string | null {
	return weaponId === "smg" || weaponId === "mg" ? `sfx_${weaponId}_loop` : null;
}

/** The tracks to try, best first: menu screens, the boss fight, or the biome with the generic round track behind. */
export function musicFor({ state, menu, biomeTrack }: MusicState): readonly string[] {
	if (menu || state === "Results") return ["mus_menu"];
	if (state === "BossIntro" || state === "BossRound") return ["mus_boss"];
	return biomeTrack ? [biomeTrack, "mus_round"] : ["mus_round"];
}
