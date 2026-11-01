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
	/** The boss of the round (`bosses.json` id), for its own track. */
	bossId?: string | undefined;
}

/** The tracks to try, best first: menu screens, the boss fight, or the biome with the generic round track behind. */
export function musicFor({ state, menu, biomeTrack, bossId }: MusicState): readonly string[] {
	if (menu || state === "Results") return ["mus_menu"];
	if (state === "BossIntro" || state === "BossRound")
		return bossId ? [`mus_boss_${bossId}`, "mus_boss"] : ["mus_boss"];
	return biomeTrack ? [biomeTrack, "mus_round"] : ["mus_round"];
}
