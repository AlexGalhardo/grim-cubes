/**
 * Game audio on the plain Web Audio API (SDD 08 sections 1 and 2): master, music and sfx buses, an unlock on the
 * first input, a cached sfx buffer per sound with a voice limit and pitch variation, and a music player that
 * crossfades between tracks. Every browser dependency comes in through `AudioDeps`, so a fake drives the tests.
 */

export interface ParamLike {
	value: number;
	setValueAtTime(value: number, time: number): unknown;
	linearRampToValueAtTime(value: number, time: number): unknown;
	cancelScheduledValues(time: number): unknown;
}

export interface NodeLike {
	connect(to: NodeLike): unknown;
	disconnect(): unknown;
}

export interface GainLike extends NodeLike {
	gain: ParamLike;
}

export interface SourceLike extends NodeLike {
	buffer: unknown;
	playbackRate: { value: number };
	onended: (() => void) | null;
	start(when?: number): unknown;
	stop(): unknown;
}

export interface MediaLike {
	loop: boolean;
	play(): Promise<void>;
	pause(): void;
	/** Fires `onerror` when the file is missing or cannot be decoded. */
	onerror: (() => void) | null;
}

export interface ContextLike {
	readonly currentTime: number;
	readonly state: string;
	readonly destination: NodeLike;
	resume(): Promise<void>;
	createGain(): GainLike;
	createBufferSource(): SourceLike;
	createMediaElementSource(element: MediaLike): NodeLike;
	decodeAudioData(data: ArrayBuffer): Promise<unknown>;
}

export interface AudioDeps {
	createContext(): ContextLike;
	/** The bytes of a sound id, or null when the file does not exist. */
	loadBytes(id: string): Promise<ArrayBuffer | null>;
	/** An element streaming the music file of `id`. */
	createMedia(id: string): MediaLike;
	random(): number;
	warn(message: string, id: string): void;
	/** Decoded-audio budget in bytes for the sounds that are not pinned (default `EVICTABLE_BYTES`). */
	cacheBytes?: number;
	/** Sounds that stay decoded once loaded: the frequent combat effects (default `FREQUENT_SFX`). */
	pinned?: (id: string) => boolean;
}

export type Bus = "master" | "music" | "sfx";
export type Priority = "hero" | "boss" | "elite" | "ui" | "enemy";

export interface PlayOptions {
	priority?: Priority;
	/** Voices of this id allowed at once (default 6). */
	maxVoices?: number;
	/** Playback rate spread, +-fraction (default 0.05). */
	pitchSpread?: number;
}

/**
 * Decoded PCM is the largest item of the Android memory budget (SDD 14): the rarely heard sounds (boss effects, voice
 * lines, chest and round cues) share this many bytes of decoded audio and the least recently played are dropped; the
 * frequent combat effects below stay decoded.
 */
export const EVICTABLE_BYTES = 8 * 1024 * 1024;
export const FREQUENT_SFX = (id: string): boolean =>
	/^sfx_(enemy_|sword_|pistol_|pickup_|player_hit|explosion|dash|prop_break)/.test(id);

/** Bytes of a decoded buffer (AudioBuffer: float32 samples per channel); 0 for anything else. */
export function decodedBytes(buffer: unknown): number {
	if (typeof buffer !== "object" || buffer === null) return 0;
	const { length, numberOfChannels } = buffer as { length?: unknown; numberOfChannels?: unknown };
	return typeof length === "number" && typeof numberOfChannels === "number"
		? length * numberOfChannels * 4
		: 0;
}

const THROTTLE_SECONDS = 0.04;
const MAX_NEW_PER_FRAME = 12;
/** Enemy and UI sounds stop at this many new sounds in a frame, keeping room for the hero, bosses and elites. */
const LOW_PRIORITY_BUDGET = 8;
const DEFAULT_VOICES = 6;
const CROSSFADE_SECONDS = 1.5;
/** -3 dB for 200 ms when the hero is hit (SDD 08 section 2). */
const DUCK_GAIN = 0.708;
/** -6 dB under a voice line (boss and Merchant): held for the length of the line, then released over `VOICE_RELEASE`. */
const VOICE_DUCK_GAIN = 0.5;
const VOICE_ATTACK = 0.1;
const VOICE_RELEASE = 0.4;

/**
 * Sound polyphony per group (SDD 14: <= 24 simultaneous voices). The group comes from the id: `voice_*` lines never
 * pile up, UI clicks stay few, everything else shares the rest.
 */
export const GROUP_VOICES = { voice: 2, ui: 4, sfx: 24 } as const;
export type SoundGroup = keyof typeof GROUP_VOICES;
export const groupOf = (id: string): SoundGroup =>
	id.startsWith("voice_") ? "voice" : id.startsWith("sfx_ui_") ? "ui" : "sfx";
const DUCK_SECONDS = 0.2;

const LOW_PRIORITY: ReadonlySet<Priority> = new Set(["ui", "enemy"]);

export interface AudioEngine {
	/** Resumes the context; nothing plays before this, and the wanted music starts once it runs. */
	unlock(): Promise<void>;
	readonly unlocked: boolean;
	setVolume(bus: Bus, percent: number): void;
	/** Call once per rendered frame before the frame's sounds: resets the new-sound budget. */
	beginFrame(): void;
	/** Plays the first id of `ids` chosen at random; returns false when it was dropped (locked, throttled, full). */
	play(ids: string | readonly string[], options?: PlayOptions): boolean;
	/** The music wanted now: the first candidate whose file exists plays, with a crossfade from the previous one. */
	setMusic(candidates: readonly string[]): void;
	/** Dips the music for 200 ms. */
	duck(): void;
	readonly activeVoices: number;
}

interface Voice {
	id: string;
}

export function createAudioEngine(deps: AudioDeps): AudioEngine {
	const ctx = deps.createContext();
	const master = ctx.createGain();
	const musicBus = ctx.createGain();
	const duckGain = ctx.createGain();
	const sfxBus = ctx.createGain();
	musicBus.connect(duckGain);
	duckGain.connect(master);
	sfxBus.connect(master);
	master.connect(ctx.destination);
	const buses: Record<Bus, GainLike> = { master, music: musicBus, sfx: sfxBus };

	const buffers = new Map<string, unknown>();
	const cacheBytes = deps.cacheBytes ?? EVICTABLE_BYTES;
	const pinned = deps.pinned ?? FREQUENT_SFX;
	let evictableBytes = 0;
	const sizes = new Map<string, number>();

	/** A sound just played: it becomes the most recently used of the evictable ones (Map order is the LRU order). */
	function touch(id: string, buffer: unknown): void {
		if (pinned(id)) return;
		buffers.delete(id);
		buffers.set(id, buffer);
	}

	function remember(id: string, buffer: unknown): void {
		buffers.set(id, buffer);
		if (pinned(id)) return;
		const size = decodedBytes(buffer);
		sizes.set(id, size);
		evictableBytes += size;
		// A playing source keeps its own reference, so dropping the cache entry never cuts a sound short.
		for (const [other] of buffers) {
			if (evictableBytes <= cacheBytes) break;
			if (other === id || pinned(other)) continue;
			evictableBytes -= sizes.get(other) ?? 0;
			sizes.delete(other);
			buffers.delete(other);
			loading.delete(other);
		}
	}
	const loading = new Map<string, Promise<unknown>>();
	const missing = new Set<string>();
	const lastStart = new Map<string, number>();
	const voices = new Set<Voice>();
	const perId = new Map<string, number>();
	const perGroup: Record<SoundGroup, number> = { voice: 0, ui: 0, sfx: 0 };
	let voiceDuckUntil = 0;
	let unlocked = false;
	let newThisFrame = 0;

	const warnOnce = (message: string, id: string): void => {
		if (missing.has(id)) return;
		missing.add(id);
		deps.warn(message, id);
	};

	function load(id: string): Promise<unknown> {
		const cached = loading.get(id);
		if (cached) return cached;
		const pending = deps
			.loadBytes(id)
			.then(async (bytes) => {
				if (!bytes) {
					warnOnce("sound file missing, playing silence", id);
					return null;
				}
				const decoded = await ctx.decodeAudioData(bytes);
				remember(id, decoded);
				return decoded;
			})
			.catch(() => {
				warnOnce("sound file could not be loaded, playing silence", id);
				return null;
			});
		loading.set(id, pending);
		return pending;
	}

	/** Dips the music under a voice line for as long as it lasts (sidechain), then brings it back. */
	function duckForVoice(buffer: unknown): void {
		const now = ctx.currentTime;
		const length = (buffer as { duration?: unknown }).duration;
		const seconds = typeof length === "number" && length > 0 ? length : 3;
		voiceDuckUntil = now + VOICE_ATTACK + seconds + VOICE_RELEASE;
		duckGain.gain.cancelScheduledValues(now);
		duckGain.gain.setValueAtTime(duckGain.gain.value, now);
		duckGain.gain.linearRampToValueAtTime(VOICE_DUCK_GAIN, now + VOICE_ATTACK);
		duckGain.gain.setValueAtTime(VOICE_DUCK_GAIN, now + VOICE_ATTACK + seconds);
		duckGain.gain.linearRampToValueAtTime(1, voiceDuckUntil);
	}

	function start(id: string, buffer: unknown, options: PlayOptions): void {
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		const spread = options.pitchSpread ?? 0.05;
		source.playbackRate.value = 1 + (deps.random() * 2 - 1) * spread;
		source.connect(sfxBus);
		const voice: Voice = { id };
		const group = groupOf(id);
		voices.add(voice);
		perId.set(id, (perId.get(id) ?? 0) + 1);
		perGroup[group]++;
		if (group === "voice") duckForVoice(buffer);
		source.onended = () => {
			voices.delete(voice);
			perGroup[group] = Math.max(0, perGroup[group] - 1);
			perId.set(id, Math.max(0, (perId.get(id) ?? 1) - 1));
			source.disconnect();
		};
		source.start();
	}

	// Music: one live track plus the one fading out. Each track has its own gain under the music bus.
	interface Track {
		key: string;
		gain: GainLike;
		media: MediaLike;
	}
	let current: Track | null = null;
	let wanted: readonly string[] = [];
	let wantedKey = "";

	function fadeOut(track: Track): void {
		const now = ctx.currentTime;
		track.gain.gain.cancelScheduledValues(now);
		track.gain.gain.setValueAtTime(track.gain.gain.value, now);
		track.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS);
		const media = track.media;
		const gain = track.gain;
		setTimeout(
			() => {
				media.pause();
				gain.disconnect();
			},
			CROSSFADE_SECONDS * 1000 + 50,
		);
	}

	function startTrack(candidates: readonly string[], index: number): Track | null {
		const id = candidates[index];
		if (id === undefined || !unlocked) return null;
		if (missing.has(id)) return startTrack(candidates, index + 1);
		const media = deps.createMedia(id);
		media.loop = true;
		const gain = ctx.createGain();
		gain.gain.value = 0;
		ctx.createMediaElementSource(media).connect(gain);
		gain.connect(musicBus);
		const track: Track = { key: wantedKey, gain, media };
		media.onerror = () => {
			warnOnce("music file missing, playing silence", id);
			if (current !== track) return;
			// Fall through to the next candidate with the same crossfade.
			fadeOut(track);
			current = startTrack(candidates, index + 1);
		};
		const now = ctx.currentTime;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
		// Deferred so `current` already points at this track when a failing file reports back.
		void Promise.resolve()
			.then(() => media.play())
			.catch(() => media.onerror?.());
		return track;
	}

	function applyMusic(): void {
		if (!unlocked || current?.key === wantedKey) return;
		if (current) fadeOut(current);
		current = startTrack(wanted, 0);
	}

	return {
		get unlocked(): boolean {
			return unlocked;
		},
		get activeVoices(): number {
			return voices.size;
		},
		async unlock(): Promise<void> {
			if (unlocked) return;
			await ctx.resume();
			unlocked = true;
			applyMusic();
		},
		setVolume(bus, percent): void {
			buses[bus].gain.value = Math.min(1, Math.max(0, percent / 100));
		},
		beginFrame(): void {
			newThisFrame = 0;
		},
		play(ids, options = {}): boolean {
			if (!unlocked) return false;
			const list = typeof ids === "string" ? [ids] : ids;
			const id = list[Math.min(list.length - 1, Math.floor(deps.random() * list.length))];
			if (id === undefined) return false;
			const budget = LOW_PRIORITY.has(options.priority ?? "enemy")
				? LOW_PRIORITY_BUDGET
				: MAX_NEW_PER_FRAME;
			if (newThisFrame >= budget) return false;
			const now = ctx.currentTime;
			if (now - (lastStart.get(id) ?? Number.NEGATIVE_INFINITY) < THROTTLE_SECONDS) return false;
			if ((perId.get(id) ?? 0) >= (options.maxVoices ?? DEFAULT_VOICES)) return false;
			if (perGroup[groupOf(id)] >= GROUP_VOICES[groupOf(id)]) return false;
			if (missing.has(id)) return false;
			lastStart.set(id, now);
			newThisFrame++;
			const ready = buffers.get(id);
			if (ready) {
				touch(id, ready);
				start(id, ready, options);
			} else void load(id).then((buffer) => buffer && start(id, buffer, options));
			return true;
		},
		setMusic(candidates): void {
			const key = candidates.join("|");
			if (key === wantedKey) return;
			wanted = candidates;
			wantedKey = key;
			applyMusic();
		},
		duck(): void {
			const now = ctx.currentTime;
			// A voice line already holds the music lower than a hit would.
			if (now < voiceDuckUntil) return;
			duckGain.gain.cancelScheduledValues(now);
			duckGain.gain.setValueAtTime(DUCK_GAIN, now);
			duckGain.gain.linearRampToValueAtTime(1, now + DUCK_SECONDS);
		},
	};
}
