import { EventType } from "@gc/game";
import { afterEach, expect, test, vi } from "vitest";
import {
	type AudioDeps,
	type ContextLike,
	createAudioEngine,
	type GainLike,
	type MediaLike,
	type NodeLike,
	type SourceLike,
} from "./audioEngine";
import { type SoundContext, soundFor } from "./eventSounds";
import { musicFor } from "./webAudio";

afterEach(() => vi.useRealTimers());

interface Ramp {
	value: number;
	time: number;
}

type FakeGain = GainLike & { ramps: Ramp[] };

function fakeGain(): FakeGain {
	const ramps: Ramp[] = [];
	return {
		ramps,
		gain: {
			value: 1,
			setValueAtTime: () => {
				ramps.length = 0;
			},
			linearRampToValueAtTime: (value: number, time: number) => ramps.push({ value, time }),
			cancelScheduledValues: () => undefined,
		},
		connect: () => undefined,
		disconnect: () => undefined,
	};
}

type FakeSource = SourceLike & { started: boolean };
type FakeMedia = MediaLike & { id: string };

function setup(files: readonly string[] = [], musicFiles: readonly string[] = []) {
	const gains: FakeGain[] = [];
	const sources: FakeSource[] = [];
	const medias: FakeMedia[] = [];
	const clock = { now: 0 };
	const warnings: string[] = [];
	let roll = 0.5;
	const context: ContextLike = {
		get currentTime() {
			return clock.now;
		},
		state: "suspended",
		destination: { connect: () => undefined, disconnect: () => undefined } as NodeLike,
		resume: async () => undefined,
		createGain: () => {
			const g = fakeGain();
			gains.push(g);
			return g;
		},
		createBufferSource: () => {
			const source: FakeSource = {
				buffer: null,
				playbackRate: { value: 1 },
				onended: null,
				started: false,
				connect: () => undefined,
				disconnect: () => undefined,
				start() {
					source.started = true;
				},
				stop: () => undefined,
			};
			sources.push(source);
			return source;
		},
		createMediaElementSource: () => ({ connect: () => undefined, disconnect: () => undefined }),
		decodeAudioData: async () => ({}),
	};
	const deps: AudioDeps = {
		createContext: () => context,
		loadBytes: async (id) => (files.includes(id) ? new ArrayBuffer(8) : null),
		createMedia: (id) => {
			const media: FakeMedia = {
				id,
				loop: false,
				onerror: null,
				play: async () => {
					if (!musicFiles.includes(id)) media.onerror?.();
				},
				pause: () => undefined,
			};
			medias.push(media);
			return media;
		},
		random: () => roll,
		warn: (message, id) => warnings.push(`${message}: ${id}`),
	};
	return {
		engine: createAudioEngine(deps),
		sources,
		medias,
		gains,
		clock,
		warnings,
		setRoll: (v: number) => {
			roll = v;
		},
	};
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

test("nothing plays before the unlock, and a sound plays after it", async () => {
	const { engine, sources } = setup(["a"]);
	expect(engine.play("a")).toBe(false);
	await engine.unlock();
	expect(engine.unlocked).toBe(true);
	expect(engine.play("a")).toBe(true);
	await flush();
	expect(sources).toHaveLength(1);
	expect(sources[0]?.started).toBe(true);
});

test("pitch varies by at most 5% and the same sound is throttled to one per 40 ms", async () => {
	const { engine, sources, clock, setRoll } = setup(["a"]);
	await engine.unlock();
	setRoll(1);
	engine.play("a");
	await flush();
	expect(sources[0]?.playbackRate.value).toBeCloseTo(1.05);
	expect(engine.play("a")).toBe(false);
	clock.now = 0.05;
	setRoll(0);
	expect(engine.play("a")).toBe(true);
	await flush();
	expect(sources[1]?.playbackRate.value).toBeCloseTo(0.95);
});

test("a sound has a voice limit and a voice frees its slot when it ends", async () => {
	const { engine, sources, clock } = setup(["a"]);
	await engine.unlock();
	engine.play("a", { maxVoices: 1 });
	await flush();
	clock.now = 1;
	expect(engine.play("a", { maxVoices: 1 })).toBe(false);
	sources[0]?.onended?.();
	expect(engine.play("a", { maxVoices: 1 })).toBe(true);
});

test("enemy sounds stop at 8 new sounds per frame, hero sounds go on to 12", async () => {
	const names = Array.from({ length: 14 }, (_, i) => `s${i}`);
	const { engine } = setup(names);
	await engine.unlock();
	engine.beginFrame();
	const enemy = names.slice(0, 10).filter((n) => engine.play(n, { priority: "enemy" }));
	expect(enemy).toHaveLength(8);
	const hero = names.slice(10).filter((n) => engine.play(n, { priority: "hero" }));
	expect(hero).toHaveLength(4);
	expect(engine.play("s0", { priority: "hero" })).toBe(false);
	engine.beginFrame();
	expect(engine.play("s9", { priority: "enemy" })).toBe(true);
});

test("a missing sound file plays silence and warns once", async () => {
	const { engine, sources, warnings, clock } = setup([]);
	await engine.unlock();
	engine.play("ghost");
	await flush();
	clock.now = 1;
	engine.play("ghost");
	await flush();
	expect(sources).toHaveLength(0);
	expect(warnings).toEqual(["sound file missing, playing silence: ghost"]);
});

test("bus volumes are percents clamped to 0..1", () => {
	const { engine, gains } = setup();
	engine.setVolume("master", 40);
	engine.setVolume("music", 250);
	engine.setVolume("sfx", -5);
	expect(gains[0]?.gain.value).toBeCloseTo(0.4);
	expect(gains[1]?.gain.value).toBe(1);
	expect(gains[3]?.gain.value).toBe(0);
});

test("music asked before the unlock starts when it happens, fading in over 1.5 s", async () => {
	const { engine, medias, gains } = setup([], ["mus_menu"]);
	engine.setMusic(["mus_menu"]);
	expect(medias).toHaveLength(0);
	await engine.unlock();
	expect(medias).toHaveLength(1);
	expect(medias[0]?.loop).toBe(true);
	expect(gains[gains.length - 1]?.ramps).toEqual([{ value: 1, time: 1.5 }]);
});

test("switching music crossfades: the old track ramps to 0 and the new one up to 1 over 1.5 s", async () => {
	vi.useFakeTimers();
	const { engine, medias, gains, clock } = setup([], ["mus_round", "mus_boss"]);
	await engine.unlock();
	engine.setMusic(["mus_round"]);
	const first = gains[gains.length - 1];
	clock.now = 10;
	engine.setMusic(["mus_boss"]);
	const second = gains[gains.length - 1];
	expect(medias.map((m) => m.id)).toEqual(["mus_round", "mus_boss"]);
	expect(first?.ramps).toEqual([{ value: 0, time: 11.5 }]);
	expect(second?.ramps).toEqual([{ value: 1, time: 11.5 }]);
	engine.setMusic(["mus_boss"]);
	expect(medias).toHaveLength(2);
});

test("a missing music file falls back to the next candidate and warns once; none left is silence", async () => {
	const { engine, medias, warnings } = setup([], ["mus_round"]);
	await engine.unlock();
	engine.setMusic(["mus_biome_cemetery", "mus_round"]);
	await flush();
	expect(medias.map((m) => m.id)).toEqual(["mus_biome_cemetery", "mus_round"]);
	expect(warnings).toEqual(["music file missing, playing silence: mus_biome_cemetery"]);
	engine.setMusic(["mus_nothing"]);
	await flush();
	expect(warnings).toHaveLength(2);
});

test("music follows the game state", () => {
	expect(musicFor({ state: "Round", menu: true, biomeTrack: "mus_biome_swamp" })).toEqual(["mus_menu"]);
	expect(musicFor({ state: "BossRound", menu: false, biomeTrack: null })).toEqual(["mus_boss"]);
	expect(musicFor({ state: "BossIntro", menu: false, biomeTrack: null })).toEqual(["mus_boss"]);
	expect(musicFor({ state: "Round", menu: false, biomeTrack: "mus_biome_swamp" })).toEqual([
		"mus_biome_swamp",
		"mus_round",
	]);
	expect(musicFor({ state: "Round", menu: false, biomeTrack: null })).toEqual(["mus_round"]);
});

const ctx: SoundContext = {
	hero: 1,
	enemyDeath: (entity) => (entity === 7 ? "sfx_enemy_wail_death" : "sfx_enemy_husk_death"),
	bossId: (entity) => (entity === 9 ? "gravedigger" : ""),
};

test("events map to sound ids", () => {
	expect(soundFor(EventType.Swung, 1, 0, 2, 1, ctx)?.ids).toBe("sfx_sword_swing_01");
	expect(soundFor(EventType.Fired, 1, 0, 0, 1, ctx)?.ids).toBe("sfx_pistol_shot_01");
	expect(soundFor(EventType.Damaged, 10, 0, 0, 5, ctx)?.ids).toEqual([
		"sfx_sword_hit_01",
		"sfx_sword_hit_02",
	]);
	expect(soundFor(EventType.Damaged, 10, 1, 0, 5, ctx)?.ids).toBe("sfx_enemy_hit_01");
	expect(soundFor(EventType.PlayerHit, 5, 0, 0, 1, ctx)?.ids).toBe("sfx_player_hit");
	expect(soundFor(EventType.LevelUp, 2, 0, 0, 0, ctx)?.ids).toBe("sfx_player_levelup");
	expect(soundFor(EventType.RoundStarted, 1, 0, 0, 0, ctx)?.ids).toBe("sfx_round_start_drum");
	expect(soundFor(EventType.BossTelegraph, 1, 0, 1, 9, ctx)?.ids).toBe("sfx_boss_telegraph");
	expect(soundFor(EventType.Exploded, 0, 0, 3, 4, ctx)?.ids).toBe("sfx_explosion_01");
});

test("deaths depend on who died, and quiet events map to nothing", () => {
	expect(soundFor(EventType.Died, 0, 0, 0, 1, ctx)?.ids).toBe("sfx_player_death");
	expect(soundFor(EventType.Died, 0, 0, 0, 7, ctx)?.ids).toBe("sfx_enemy_wail_death");
	expect(soundFor(EventType.Died, 0, 1, 0, 7, ctx)).toBeNull();
	expect(soundFor(EventType.PlayerHit, 1, 0, 1, 1, ctx)).toBeNull();
	expect(soundFor(EventType.OriginShifted, 1, 1, 0, 0, ctx)).toBeNull();
	expect(soundFor(EventType.EnemyTelegraph, 1, 0, 0.5, 3, ctx)).toBeNull();
});

test("a fragment pickup plays its sound and a boss entry is named after the boss", () => {
	expect(soundFor(EventType.FragmentPicked, 2, 0, 0, 1, ctx)?.ids).toBe("sfx_pickup_fragment_01");
});

test("boss voices are named after the boss and the moment", () => {
	expect(soundFor(EventType.BossDied, 0, 0, 0, 9, ctx)?.ids).toBe("voice_gravedigger_death");
	expect(soundFor(EventType.BossPhase, 2, 0, 0, 9, ctx)?.ids).toBe("voice_gravedigger_phase");
	expect(soundFor(EventType.BossDied, 0, 0, 0, 3, ctx)).toBeNull();
	expect(soundFor(EventType.BossStealth, 1, 0.15, 3, 9, ctx)?.ids).toBe("sfx_boss_stealth");
	expect(soundFor(EventType.BossStealth, 0, 1, 0, 9, ctx)?.ids).toBe("sfx_boss_reveal");
});
