import { bossesData, EventType } from "@gc/game";
import { afterEach, expect, test, vi } from "vitest";
import en from "../../../../locales/en.json" with { type: "json" };
import ptBR from "../../../../locales/pt-BR.json" with { type: "json" };
import {
	type AudioDeps,
	type ContextLike,
	createAudioEngine,
	decodedBytes,
	type GainLike,
	groupOf,
	type MediaLike,
	type NodeLike,
	type SourceLike,
} from "./audioEngine";
import { captionKeyFor, createEventAudio, type SoundContext, soundFor } from "./eventSounds";
import { createMerchantVoice } from "./merchantVoice";
import { musicFor } from "./webAudio";

afterEach(() => vi.useRealTimers());

interface Ramp {
	value: number;
	time: number;
}

type FakeGain = GainLike & { ramps: Ramp[]; allRamps: Ramp[] };

function fakeGain(): FakeGain {
	const ramps: Ramp[] = [];
	const allRamps: Ramp[] = [];
	return {
		ramps,
		allRamps,
		gain: {
			value: 1,
			setValueAtTime: () => {
				ramps.length = 0;
			},
			linearRampToValueAtTime: (value: number, time: number) => {
				ramps.push({ value, time });
				allRamps.push({ value, time });
			},
			cancelScheduledValues: () => undefined,
		},
		connect: () => undefined,
		disconnect: () => undefined,
	};
}

type FakeSource = SourceLike & { started: boolean };
type FakeMedia = MediaLike & { id: string };

function setup(
	files: readonly string[] = [],
	musicFiles: readonly string[] = [],
	extra: Partial<AudioDeps> & { decoded?: object } = {},
) {
	const gains: FakeGain[] = [];
	const sources: FakeSource[] = [];
	const medias: FakeMedia[] = [];
	const clock = { now: 0 };
	const warnings: string[] = [];
	const loads: string[] = [];
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
		decodeAudioData: async () => extra.decoded ?? {},
	};
	const deps: AudioDeps = {
		createContext: () => context,
		loadBytes: async (id) => {
			loads.push(id);
			return files.includes(id) ? new ArrayBuffer(8) : null;
		},
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
		...(extra.cacheBytes !== undefined ? { cacheBytes: extra.cacheBytes } : {}),
	};
	return {
		loads,
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
	expect(soundFor(EventType.MerchantArrived, 3, 4, 20, 0, ctx)?.ids).toBe("sfx_merchant_arrive");
});

test("deaths depend on who died, and quiet events map to nothing", () => {
	expect(soundFor(EventType.Died, 0, 0, 0, 1, ctx)?.ids).toBe("sfx_player_death");
	expect(soundFor(EventType.Died, 0, 0, 0, 7, ctx)?.ids).toBe("sfx_enemy_wail_death");
	expect(soundFor(EventType.Died, 0, 1, 0, 7, ctx)).toBeNull();
	expect(soundFor(EventType.PlayerHit, 1, 0, 1, 1, ctx)).toBeNull();
	expect(soundFor(EventType.OriginShifted, 1, 1, 0, 0, ctx)).toBeNull();
	expect(soundFor(EventType.BossPattern, 1, 0, 0, 3, ctx)).toBeNull();
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

test("a voice id maps to its caption key and other sounds have none", () => {
	expect(captionKeyFor("voice_gravedigger_entry")).toBe("voice.gravedigger.entry");
	expect(captionKeyFor("voice_swamp_matriarch_death")).toBe("voice.swamp_matriarch.death");
	expect(captionKeyFor("sfx_boss_telegraph")).toBeNull();
	expect(captionKeyFor("voice_gravedigger_hello")).toBeNull();
});

test("every boss has an entry, phase and death caption in both languages", () => {
	for (const boss of bossesData) {
		for (const moment of ["entry", "phase", "death"]) {
			const key = `voice.${boss.id}.${moment}`;
			expect((en as Record<string, string>)[key], key).toBeTruthy();
			expect((ptBR as Record<string, string>)[key], key).toBeTruthy();
		}
	}
});

test("the event audio reports the caption of a boss voice, with or without the file", () => {
	const played: string[] = [];
	const captions: string[] = [];
	const engine = {
		play: (ids: string | readonly string[]) => {
			played.push(String(ids));
			return true;
		},
		duck: () => undefined,
	};
	const visit = createEventAudio(engine as never, ctx, (key) => captions.push(key));
	visit(EventType.BossDied, 0, 0, 0, 9);
	visit(EventType.BossPhase, 2, 0, 0, 9);
	visit(EventType.Swung, 1, 0, 2, 1);
	expect(played).toEqual([
		"voice_gravedigger_death",
		"sfx_boss_death",
		"voice_gravedigger_phase",
		"sfx_sword_swing_01",
	]);
	expect(captions).toEqual(["voice.gravedigger.death", "voice.gravedigger.phase"]);
});

test("rarely heard sounds share a decoded-audio budget and the least recently played is dropped", async () => {
	// Each decoded buffer is 1000 frames x 2 channels x 4 bytes = 8000 bytes; the budget holds two.
	const { engine, loads, clock } = setup(["boss_a", "boss_b", "boss_c"], [], {
		decoded: { length: 1000, numberOfChannels: 2 },
		cacheBytes: 16000,
	});
	await engine.unlock();
	const play = async (id: string): Promise<void> => {
		clock.now += 1;
		engine.beginFrame();
		engine.play(id);
		await flush();
	};
	await play("boss_a");
	await play("boss_b");
	await play("boss_a");
	await play("boss_c");
	expect(loads).toEqual(["boss_a", "boss_b", "boss_c"]);
	await play("boss_a");
	await play("boss_b");
	expect(loads).toEqual(["boss_a", "boss_b", "boss_c", "boss_b"]);
});

test("frequent combat effects stay decoded however much else is played", async () => {
	const { engine, loads, clock } = setup(["sfx_sword_hit_01", "voice_a", "voice_b", "voice_c"], [], {
		decoded: { length: 1000, numberOfChannels: 2 },
		cacheBytes: 8000,
	});
	await engine.unlock();
	const play = async (id: string): Promise<void> => {
		clock.now += 1;
		engine.beginFrame();
		engine.play(id);
		await flush();
	};
	await play("sfx_sword_hit_01");
	for (const id of ["voice_a", "voice_b", "voice_c"]) await play(id);
	await play("sfx_sword_hit_01");
	expect(loads.filter((id) => id === "sfx_sword_hit_01")).toHaveLength(1);
});

test("decodedBytes reads an AudioBuffer and ignores anything else", () => {
	expect(decodedBytes({ length: 100, numberOfChannels: 2 })).toBe(800);
	expect(decodedBytes({})).toBe(0);
	expect(decodedBytes(null)).toBe(0);
});

test("the spiked boots hit has a sound, at most two voices at once", () => {
	const sound = soundFor(EventType.ThornsHit, 3, 4, 0.5, 8, ctx);
	expect(sound?.ids).toBe("sfx_enemy_hit_01");
	expect(sound?.options?.maxVoices).toBe(2);
});

test("the merchant takes turns between the lines of a moment and captions each one", () => {
	const played: string[] = [];
	const captions: string[] = [];
	const voice = createMerchantVoice({ play: (ids) => !!played.push(String(ids)) }, (key) =>
		captions.push(key),
	);
	for (let i = 0; i < 4; i++) voice.say("arrive");
	voice.say("farewell");
	expect(played).toEqual([
		"voice_merchant_arrive_1",
		"voice_merchant_arrive_2",
		"voice_merchant_arrive_3",
		"voice_merchant_arrive_1",
		"voice_merchant_farewell_1",
	]);
	expect(captions[1]).toBe("voice.merchant.arrive_2");
});

test("a voice line holds the music at -6 dB for its length and a hit does not raise it", async () => {
	const { engine, gains, clock } = setup(["voice_gravedigger_entry"], [], { decoded: { duration: 2 } });
	await engine.unlock();
	const duck = gains[2] as FakeGain;
	engine.play("voice_gravedigger_entry");
	await flush();
	expect(duck.allRamps[0]).toEqual({ value: 0.5, time: 0.1 });
	expect(duck.allRamps[1]?.value).toBe(1);
	expect(duck.allRamps[1]?.time).toBeCloseTo(2.5);
	const ramps = duck.allRamps.length;
	clock.now = 1;
	engine.duck();
	expect(duck.allRamps).toHaveLength(ramps);
	clock.now = 3;
	engine.duck();
	expect(duck.allRamps.length).toBeGreaterThan(ramps);
});

test("polyphony is capped per group: 2 voice lines, 4 UI sounds and 24 sound effects at once", async () => {
	const ids = [
		...Array.from({ length: 3 }, (_, i) => `voice_boss${i}_entry`),
		...Array.from({ length: 5 }, (_, i) => `sfx_ui_${i}`),
		...Array.from({ length: 26 }, (_, i) => `sfx_x${i}`),
	];
	const { engine, clock } = setup(ids);
	await engine.unlock();
	const accepted = { voice: 0, ui: 0, sfx: 0 };
	for (const [n, id] of ids.entries()) {
		clock.now = n * 0.05;
		engine.beginFrame();
		if (engine.play(id, { priority: "hero" })) accepted[groupOf(id)]++;
		await flush();
	}
	expect(accepted).toEqual({ voice: 2, ui: 4, sfx: 24 });
});

test("the remaining events and the boss death have a sound", () => {
	expect(soundFor(EventType.ConsumableDropped, 1, 2, 1, 0, ctx)?.ids).toBe("sfx_consumable_drop");
	expect(soundFor(EventType.EliteEscaped, 1, 2, 0, 5, ctx)?.ids).toBe("sfx_elite_escape");
	expect(soundFor(EventType.EnemyShotFired, 1, 2, 0, 5, ctx)?.ids).toBe("sfx_enemy_shot");
	expect(soundFor(EventType.EnemyTelegraph, 1, 0, 0.5, 5, ctx)?.ids).toBe("sfx_enemy_charge");
	const played: string[] = [];
	const audio = createEventAudio(
		{
			play: (ids: string | readonly string[]) => !!played.push(String(ids)),
			duck: () => undefined,
		} as never,
		ctx,
	);
	audio(EventType.BossDied, 0, 0, 0, 9);
	expect(played).toEqual(["voice_gravedigger_death", "sfx_boss_death"]);
});
