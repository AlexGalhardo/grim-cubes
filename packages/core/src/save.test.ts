import { expect, test } from "vitest";
import { createKeyMap } from "./keys";
import { LEGACY_OSSUARY_COSTS } from "./legacyOssuary";
import { createPadMap } from "./pad";
import {
	checksumOf,
	createMetaState,
	createSettings,
	DEFAULT_HERO,
	MAX_SAVE_BYTES,
	migrateClasses,
	migrateOssuary,
	parseGlobal,
	parseSave,
	profileOf,
	SAVE_SCHEMA_VERSION,
	SaveError,
	serializeGlobal,
	serializeSave,
	validateMeta,
	validateProfile,
} from "./save";

const meta = () => {
	const m = createMetaState();
	m.souls = 285;
	m.records.normal = 12;
	m.stats = { kills: 340, runs: 3, bossKills: 1, elitesKilled: 1, bestBossRound: 10 };
	m.ossuary = { flesh_1: true };
	m.unlocks = ["grim"];
	return m;
};

test("a save round-trips and uses schemaVersion 15", async () => {
	const text = await serializeSave(meta(), "0.1.0", new Date("2026-10-31T12:00:00Z"));
	const envelope = JSON.parse(text) as { schemaVersion: number; app: string; savedAt: string };
	expect(envelope.schemaVersion).toBe(15);
	expect(SAVE_SCHEMA_VERSION).toBe(15);
	expect(envelope.app).toBe("grim-cubes");
	expect(envelope.savedAt).toBe("2026-10-31T12:00:00.000Z");
	expect(await parseSave(text)).toEqual(meta());
});

test("a tampered or corrupted save is rejected", async () => {
	const text = await serializeSave(meta(), "0.1.0");
	const edited = text.replace('"souls":285', '"souls":999999');
	await expect(parseSave(edited)).rejects.toThrow("checksum mismatch");
	await expect(parseSave(text.slice(0, 40))).rejects.toBeInstanceOf(SaveError);
	await expect(parseSave("")).rejects.toBeInstanceOf(SaveError);
	await expect(parseSave("[]")).rejects.toBeInstanceOf(SaveError);
});

test("untrusted fields are validated", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown> & {
		data: Record<string, unknown>;
	};
	const bad = async (patch: (d: Record<string, unknown>) => void): Promise<void> => {
		const copy = structuredClone(base);
		patch(copy.data);
		await expect(parseSave(JSON.stringify(copy))).rejects.toBeInstanceOf(SaveError);
	};
	await bad((d) => {
		d.souls = -1;
	});
	await bad((d) => {
		d.souls = 1.5;
	});
	await bad((d) => {
		d.souls = 1e12;
	});
	await bad((d) => {
		d.souls = "9";
	});
	await bad((d) => {
		d.unlocks = [1];
	});
	await bad((d) => {
		d.records = null;
	});
});

test("a save from another app or a newer schema is refused", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown>;
	await expect(parseSave(JSON.stringify({ ...base, app: "other" }))).rejects.toBeInstanceOf(SaveError);
	await expect(
		parseSave(JSON.stringify({ ...base, schemaVersion: SAVE_SCHEMA_VERSION + 1 })),
	).rejects.toThrow("newer version");
});

test("size, list and key limits protect the parser", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown> & {
		data: Record<string, unknown>;
	};
	const reject = async (patch: (d: Record<string, unknown>) => void): Promise<void> => {
		const copy = structuredClone(base);
		patch(copy.data);
		await expect(parseSave(JSON.stringify(copy))).rejects.toBeInstanceOf(SaveError);
	};
	await reject((d) => {
		d.unlocks = Array.from({ length: 257 }, (_, i) => `u${i}`);
	});
	await reject((d) => {
		d.ossuary = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`n${i}`, true]));
	});
	for (const key of ["__proto__", "constructor", "prototype"]) {
		const text = (await serializeSave(meta(), "0.1.0")).replace('"flesh_1":true', `"${key}":true`);
		await expect(parseSave(text)).rejects.toBeInstanceOf(SaveError);
	}
	await expect(parseSave(`{"pad":"${"x".repeat(MAX_SAVE_BYTES)}"}`)).rejects.toThrow("too large");
	const edge = structuredClone(base);
	edge.data.unlocks = Array.from({ length: 256 }, (_, i) => `u${i}`);
	edge.checksum = await checksumOf(validateProfile(edge.data));
	expect((await parseSave(JSON.stringify(edge))).unlocks).toHaveLength(256);
});

test("a newer schema is reported with the newer code", async () => {
	const base = JSON.parse(await serializeSave(meta(), "0.1.0")) as Record<string, unknown>;
	await expect(parseSave(JSON.stringify({ ...base, schemaVersion: 99 }))).rejects.toMatchObject({
		code: "newer",
	});
	await expect(parseSave("nope")).rejects.toMatchObject({ code: "invalid" });
});

const SETTINGS_BY_VERSION: Record<number, string[] | null> = {
	1: null,
	2: ["preset", "volume", "screenShake", "locale"],
	3: ["preset", "volume", "screenShake", "locale", "gameSpeed"],
	4: ["preset", "volume", "screenShake", "locale", "gameSpeed", "telemetry"],
	5: [
		"preset",
		"volume",
		"screenShake",
		"locale",
		"gameSpeed",
		"telemetry",
		"brightness",
		"contrast",
		"colorblind",
		"flashReduction",
		"uiScale",
		"gore",
	],
	6: [
		"preset",
		"volume",
		"screenShake",
		"locale",
		"gameSpeed",
		"telemetry",
		"brightness",
		"contrast",
		"colorblind",
		"flashReduction",
		"uiScale",
		"gore",
		"keys",
	],
	7: [
		"preset",
		"volume",
		"screenShake",
		"locale",
		"gameSpeed",
		"telemetry",
		"brightness",
		"contrast",
		"colorblind",
		"flashReduction",
		"uiScale",
		"gore",
		"keys",
		"pad",
	],
	8: [
		"preset",
		"volume",
		"screenShake",
		"locale",
		"gameSpeed",
		"telemetry",
		"brightness",
		"contrast",
		"colorblind",
		"flashReduction",
		"uiScale",
		"gore",
		"keys",
		"pad",
		"subtitles",
	],
	9: [
		"preset",
		"volume",
		"screenShake",
		"locale",
		"gameSpeed",
		"telemetry",
		"brightness",
		"contrast",
		"colorblind",
		"flashReduction",
		"uiScale",
		"gore",
		"keys",
		"pad",
		"subtitles",
	],
};

/** A save as the given older schema wrote it: only the settings keys it knew, with its own checksum. */
async function legacySave(version: number): Promise<string> {
	const current = {
		schemaVersion: 9,
		savedAt: "2026-10-30T10:00:00.000Z",
		app: "grim-cubes",
		appVersion: "0.1.0",
		checksum: "",
		data: JSON.parse(JSON.stringify(meta())) as { settings: Record<string, unknown> } & Record<
			string,
			unknown
		>,
	};
	const keys = SETTINGS_BY_VERSION[version] ?? null;
	const { settings, run: _run, ...withEasy } = current.data;
	const { bestBossRound: _boss, ...oldStats } = meta().stats;
	const rest = {
		...withEasy,
		records: { normal: meta().records.normal, grim: 0, nightmare: 0 },
		stats: oldStats,
	};
	const picked = keys ? Object.fromEntries(keys.map((k) => [k, settings[k]])) : null;
	// Before schema 15 there were no heal and super keys or buttons.
	for (const group of ["keys", "pad"]) {
		const { heal: _h, super: _s, ...older } = (picked?.[group] ?? {}) as Record<string, unknown>;
		if (picked && group in picked) picked[group] = older;
	}
	// Schemas 7 and 8 stored only the dash and pause buttons.
	if (picked && "pad" in picked && version < 9) {
		const { dash, pause } = picked.pad as { dash: number; pause: number };
		picked.pad = { dash, pause };
	}
	const data: Record<string, unknown> = picked ? { ...rest, settings: picked } : rest;
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data)));
	const checksum = `sha256-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
	return JSON.stringify({ ...current, schemaVersion: version, checksum, data });
}

test("saves from schemas 1 to 9 load with the defaults of every setting they lacked", async () => {
	for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
		const loaded = await parseSave(await legacySave(version));
		expect(loaded.settings.gameSpeed, `v${version}`).toBe(1);
		expect(loaded.settings.telemetry, `v${version}`).toBe(false);
		expect(loaded.settings.brightness, `v${version}`).toBe(0);
		expect(loaded.settings.contrast, `v${version}`).toBe(100);
		expect(loaded.settings.colorblind, `v${version}`).toBe("off");
		expect(loaded.settings.flashReduction, `v${version}`).toBe(false);
		expect(loaded.settings.uiScale, `v${version}`).toBe(100);
		expect(loaded.settings.gore, `v${version}`).toBe(true);
		expect(loaded.settings.keys, `v${version}`).toEqual(createKeyMap());
		expect(loaded.settings.pad, `v${version}`).toEqual({
			dash: 0,
			pause: 9,
			reroll: 2,
			speed: 8,
			heal: 1,
			super: 3,
		});
		expect(loaded.settings.subtitles, `v${version}`).toBe(true);
		expect(loaded.settings.lastSlot, `v${version}`).toBe(0);
		expect(loaded.settings.hpBarHero, `v${version}`).toBe(true);
		expect(loaded.settings.hpBarEnemies, `v${version}`).toBe(true);
		expect(loaded.run, `v${version}`).toBeNull();
	}
	expect((await parseSave(await legacySave(1))).settings).toEqual(createSettings());
});

test("a legacy save with a tampered checksum is still refused", async () => {
	const legacy = JSON.parse(await legacySave(3)) as { data: { souls: number } };
	legacy.data.souls += 1;
	await expect(parseSave(JSON.stringify(legacy))).rejects.toThrow("checksum mismatch");
});

test("visual and other settings are validated: ranges, modes, scales and types", () => {
	const ok = createSettings();
	const bad = (patch: Record<string, unknown>) => () =>
		validateMeta({ ...createMetaState(), settings: { ...ok, ...patch } });
	expect(bad({ preset: "Bad Id" })).toThrow(SaveError);
	expect(bad({ locale: "fr" })).toThrow(SaveError);
	expect(bad({ volume: { master: 101, music: 0, sfx: 0 } })).toThrow(SaveError);
	expect(bad({ gameSpeed: 4 })).toThrow(SaveError);
	expect(bad({ telemetry: "yes" })).toThrow(SaveError);
	expect(bad({ brightness: 51 })).toThrow(SaveError);
	expect(bad({ brightness: 0.5 })).toThrow(SaveError);
	expect(bad({ contrast: 49 })).toThrow(SaveError);
	expect(bad({ colorblind: "achromatopsia" })).toThrow(SaveError);
	expect(bad({ uiScale: 110 })).toThrow(SaveError);
	expect(bad({ flashReduction: 1 })).toThrow(SaveError);
	expect(bad({ gore: "full" })).toThrow(SaveError);
	expect(bad({ keys: { ...ok.keys, dash: "KeyW" } })).toThrow(SaveError);
	expect(bad({ keys: { ...ok.keys, reroll: "Enter" } })).toThrow(SaveError);
	expect(bad({ keys: { ...ok.keys, up: 5 } })).toThrow(SaveError);
	expect(bad({ keys: "wasd" })).toThrow(SaveError);
	expect(bad({ pad: { dash: 9, pause: 9 } })).toThrow(SaveError);
	expect(bad({ pad: { dash: 13, pause: 9 } })).toThrow(SaveError);
	expect(bad({ pad: { dash: "A", pause: 9 } })).toThrow(SaveError);
	expect(bad({ pad: [0, 9] })).toThrow(SaveError);
	expect(bad({ pad: { ...ok.pad, reroll: 9 } })).toThrow(SaveError);
	expect(bad({ pad: { ...ok.pad, speed: 14 } })).toThrow(SaveError);
	expect(bad({ subtitles: "yes" })).toThrow(SaveError);
	const edge = validateMeta({
		...createMetaState(),
		settings: {
			...ok,
			brightness: -50,
			contrast: 150,
			colorblind: "tritanopia",
			uiScale: 150,
			gore: false,
		},
	});
	expect(
		validateMeta({
			...createMetaState(),
			settings: { ...ok, keys: { ...ok.keys, dash: "KeyF", speed: "KeyZ" } },
		}).settings.keys,
	).toMatchObject({ dash: "KeyF", speed: "KeyZ" });
	expect(
		validateMeta({
			...createMetaState(),
			settings: { ...ok, pad: { dash: 3, pause: 7, reroll: 2, speed: 8, heal: 1, super: 4 } },
		}).settings.pad,
	).toEqual({ dash: 3, pause: 7, reroll: 2, speed: 8, heal: 1, super: 4 });
	// A schema 7 or 8 pad without reroll and speed gets their default buttons; Y is taken by the dash here, so the
	// super takes the next free one.
	expect(
		validateMeta({ ...createMetaState(), settings: { ...ok, pad: { dash: 3, pause: 7 } } }).settings.pad,
	).toEqual({ dash: 3, pause: 7, reroll: 2, speed: 8, heal: 1, super: 4 });
	expect(edge.settings).toMatchObject({
		brightness: -50,
		contrast: 150,
		colorblind: "tritanopia",
		uiScale: 150,
		gore: false,
	});
});

const checkpoint = () => ({
	seed: 4242,
	difficulty: "grim" as const,
	round: 7,
	gold: 123.5,
	xp: 40.25,
	level: 4,
	hp: 82.5,
	weapon: { id: "boomerang", tier: 2 },
	equipment: [6, 0, 3, 10, 0, 1],
	eliteFragments: 3,
	relics: 1,
	owned: { ring: 2 },
	modifiers: [{ stat: "damage", op: "mult", value: 0.1 }],
	cardRerollsLeft: 1,
	revivesSpent: 0,
	bag: 12,
	rng: Array.from({ length: 10 }, (_, i) => i * 1_000_003 - 2_000_000_000),
	origin: { x: 128, z: -256 },
	position: { x: 3.5, z: -1.25 },
	kills: 88,
	damageDealt: 5120.5,
	elitesKilled: 1,
	bossRounds: [5],
	hero: "ranged",
	seconds: 412,
	daily: "2026-11-11" as string | null,
});

test("a run checkpoint round-trips inside the slot and is null when absent", async () => {
	const m = meta();
	m.run = checkpoint();
	const parsed = await parseSave(await serializeSave(m, "0.1.0"));
	expect(parsed.run).toEqual(checkpoint());
	expect((await parseSave(await serializeSave(meta(), "0.1.0"))).run).toBeNull();
});

test("a malformed checkpoint is refused field by field", async () => {
	const bad = async (patch: Record<string, unknown>): Promise<void> => {
		const m = meta() as unknown as Record<string, unknown>;
		m.run = { ...structuredClone(checkpoint()), ...patch };
		await expect(serializeSave(m as unknown as ReturnType<typeof meta>, "0.1.0")).rejects.toBeInstanceOf(
			SaveError,
		);
	};
	await bad({ difficulty: "bogus" });
	await bad({ round: 0 });
	await bad({ gold: -1 });
	await bad({ gold: Number.NaN });
	await bad({ hp: Number.POSITIVE_INFINITY });
	await bad({ rng: [1, 2, 3] });
	await bad({ rng: Array.from({ length: 10 }, () => 1.5) });
	await bad({ owned: { __proto__x: 1, constructor: 1 } });
	await bad({ owned: { ring: -1 } });
	await bad({ modifiers: Array.from({ length: 513 }, () => ({ stat: "a", op: "b", value: 1 })) });
	await bad({ modifiers: [{ stat: "", op: "add", value: 1 }] });
	await bad({ weapon: { id: "x".repeat(65), tier: 0 } });
	await bad({ equipment: [11] });
	await bad({ equipment: [-1] });
	await bad({ equipment: "all" });
	await bad({ eliteFragments: -1 });
	await bad({ relics: 1.5 });
	await bad({ origin: { x: "0", z: 0 } });
	await bad({ bossRounds: [-1] });
});

test("a slot file written by schema 10 (no Easy record) still verifies and gets an Easy record of 0", async () => {
	const m = meta();
	const data = { ...JSON.parse(JSON.stringify(m)), records: { normal: 12, grim: 0, nightmare: 0 } };
	delete data.settings;
	delete data.daily;
	delete data.run;
	delete data.stats.bestBossRound;
	data.run = null;
	const text = JSON.stringify({
		schemaVersion: 10,
		savedAt: "2026-10-31T10:00:00.000Z",
		app: "grim-cubes",
		appVersion: "0.1.0",
		checksum: await checksumOf(data),
		data,
	});
	const loaded = await parseSave(text);
	expect(loaded.records).toEqual({ easy: 0, normal: 12, grim: 0, nightmare: 0 });
	const tampered = text.replace('"souls":285', '"souls":286');
	await expect(parseSave(tampered)).rejects.toThrow("checksum mismatch");
});

test("a schema 9 save has no checkpoint and no last slot, and its checksum still verifies", async () => {
	const loaded = await parseSave(await legacySave(9));
	expect(loaded.run).toBeNull();
	expect(loaded.settings.lastSlot).toBe(0);
});

test("settings.lastSlot accepts 0 to 3 and refuses anything else", () => {
	const ok = createSettings();
	for (const lastSlot of [0, 1, 2, 3]) {
		expect(validateMeta({ ...createMetaState(), settings: { ...ok, lastSlot } }).settings.lastSlot).toBe(
			lastSlot,
		);
	}
	for (const lastSlot of [-1, 4, 1.5, "1", null]) {
		expect(() => validateMeta({ ...createMetaState(), settings: { ...ok, lastSlot } })).toThrow(
			SaveError,
		);
	}
});

test("a global file from schema 10 or 11 (no health bar toggles) still verifies and turns both bars on", async () => {
	const { hpBarHero: _h, hpBarEnemies: _e, ...current } = createSettings();
	const { heal: _kh, super: _ks, ...keys } = current.keys;
	const { heal: _ph, super: _ps, ...pad } = current.pad;
	const data = { settings: { ...current, keys, pad } };
	for (const schemaVersion of [10, 11]) {
		const text = JSON.stringify({
			schemaVersion,
			savedAt: "2026-10-31T10:00:00.000Z",
			app: "grim-cubes",
			appVersion: "0.1.0",
			checksum: await checksumOf(data),
			data,
		});
		const settings = await parseGlobal(text);
		expect(settings.hpBarHero).toBe(true);
		expect(settings.hpBarEnemies).toBe(true);
	}
	const off = { ...createSettings(), hpBarEnemies: false };
	expect((await parseGlobal(await serializeGlobal(off, "0.1.0"))).hpBarEnemies).toBe(false);
	await expect(
		serializeGlobal({ ...createSettings(), hpBarHero: 1 as unknown as boolean }, "0.1.0"),
	).rejects.toBeInstanceOf(SaveError);
});

/** A slot file as `version` wrote it: only the fields that schema knew, checksummed over exactly those. */
async function slotFileOf(version: number): Promise<string> {
	const m = meta();
	m.run = checkpoint();
	m.daily = [{ date: "2026-11-10", round: 9, seconds: 300, kills: 120 }];
	const data = JSON.parse(JSON.stringify(profileOf(m)));
	if (version < 15) delete data.stats.bestBossRound;
	if (version < 15) {
		// Schema 14 saved what the shop paid for the weapon and no equipment.
		data.run.weapon.paid = 60;
		delete data.run.equipment;
		delete data.run.eliteFragments;
		delete data.run.relics;
	}
	if (version < 14) {
		delete data.daily;
		delete data.run.seconds;
		delete data.run.daily;
	}
	if (version < 13) delete data.run.hero;
	if (version < 11) data.records = { normal: 12, grim: 0, nightmare: 0 };
	return JSON.stringify({
		schemaVersion: version,
		savedAt: "2026-10-31T10:00:00.000Z",
		app: "grim-cubes",
		appVersion: "0.1.0",
		checksum: await checksumOf(data),
		data,
	});
}

test("slot files from schemas 10 to 13 still verify and gain the Warrior, the clock and an empty daily table", async () => {
	for (const version of [10, 11, 12, 13]) {
		const text = await slotFileOf(version);
		const loaded = await parseSave(text);
		expect(loaded.run?.equipment, `schema ${version}`).toEqual([]);
		expect(loaded.run?.seed, `schema ${version}`).toBe(4242);
		expect(loaded.run?.hero, `schema ${version}`).toBe(DEFAULT_HERO);
		expect(loaded.run?.seconds, `schema ${version}`).toBe(0);
		expect(loaded.run?.daily, `schema ${version}`).toBeNull();
		expect(loaded.daily, `schema ${version}`).toEqual([]);
		await expect(parseSave(text.replace('"gold":123.5', '"gold":124.5'))).rejects.toThrow(
			"checksum mismatch",
		);
	}
});

test("a schema 14 slot file becomes a Warrior save: the run keeps its sword, the boss round comes from the record", async () => {
	const text = await slotFileOf(14);
	const loaded = await parseSave(text);
	expect(loaded.run?.hero).toBe("warrior");
	expect(loaded.run?.weapon).toEqual({ id: "sword", tier: 0 });
	// The record of 12 on the old 10/20/30 bosses means the round 10 boss fell.
	expect(loaded.stats.bestBossRound).toBe(10);
	// The shop changed too: nothing equipped yet, and the items bought in the old shop are gone.
	expect(loaded.run?.owned).toEqual({});
	expect(loaded.run?.round).toBe(7);
	expect(loaded.run?.gold).toBe(123.5);
	expect(loaded.run?.modifiers).toEqual([{ stat: "damage", op: "mult", value: 0.1 }]);
	expect(loaded.souls).toBeGreaterThanOrEqual(meta().souls);
	expect((await parseSave(await slotFileOf(15))).run?.owned).toEqual({ ring: 2 });
	expect(loaded.run?.equipment).toEqual([]);
	expect([loaded.run?.eliteFragments, loaded.run?.relics]).toEqual([0, 0]);
	expect(loaded.run?.daily).toBe("2026-11-11");
});

test("a schema 15 slot file keeps the equipment, the daily table and the daily run, and re-serializes to the same text", async () => {
	const text = await slotFileOf(15);
	const loaded = await parseSave(text);
	expect(loaded.run?.equipment).toEqual([6, 0, 3, 10, 0, 1]);
	expect([loaded.run?.eliteFragments, loaded.run?.relics]).toEqual([3, 1]);
	expect(loaded.daily).toEqual([{ date: "2026-11-10", round: 9, seconds: 300, kills: 120 }]);
	expect(loaded.run?.daily).toBe("2026-11-11");
	expect(loaded.run?.seconds).toBe(412);
	await expect(parseSave(text.replace('"gold":123.5', '"gold":124.5'))).rejects.toThrow(
		"checksum mismatch",
	);
});

test("a schema 15 slot file keeps its class and re-serializes to the same text", async () => {
	const text = await slotFileOf(15);
	const loaded = await parseSave(text);
	expect(loaded.run?.hero).toBe("ranged");
	expect(loaded.stats.bestBossRound).toBe(10);
	const again = JSON.parse(await serializeSave(loaded, "0.1.0")) as { data: unknown; checksum: string };
	expect(again.data).toEqual(JSON.parse(text).data);
	expect(again.checksum).toBe(JSON.parse(text).checksum);
});

test("the daily table is refused when it is long, repeats a day or has a bad date", async () => {
	const bad = async (daily: unknown): Promise<void> => {
		const m = meta() as unknown as Record<string, unknown>;
		m.daily = daily;
		await expect(serializeSave(m as unknown as ReturnType<typeof meta>, "0.1.0")).rejects.toBeInstanceOf(
			SaveError,
		);
	};
	const row = (date: string) => ({ date, round: 1, seconds: 1, kills: 1 });
	await bad(Array.from({ length: 31 }, (_, i) => row(`2026-10-${String(i + 1).padStart(2, "0")}`)));
	await bad([row("2026-11-11"), row("2026-11-11")]);
	await bad([row("11/11/2026")]);
	await bad([row("2026-13-45")]);
	await bad([{ ...row("2026-11-11"), round: -1 }]);
	await bad("nope");
});

test("the hero of a checkpoint must be a short id", async () => {
	const m = meta() as unknown as Record<string, unknown>;
	m.run = { ...checkpoint(), hero: "" };
	await expect(serializeSave(m as unknown as ReturnType<typeof meta>, "0.1.0")).rejects.toBeInstanceOf(
		SaveError,
	);
});

test("migrateClasses turns any old hero into the Warrior and derives the best boss round from the records", () => {
	const m = meta();
	m.run = { ...checkpoint(), hero: "penitent", weapon: { id: "smg", tier: 3 } };
	m.records = { easy: 0, normal: 21, grim: 0, nightmare: 0 };
	m.stats.bestBossRound = 0;
	const migrated = migrateClasses(m);
	expect(migrated.run?.hero).toBe("warrior");
	expect(migrated.run?.weapon).toEqual({ id: "sword", tier: 0 });
	expect(migrated.stats.bestBossRound).toBe(20);
	m.records.normal = 10;
	expect(migrateClasses(m).stats.bestBossRound).toBe(0);
	m.records.normal = 0;
	expect(migrateClasses(m).stats.bestBossRound).toBe(0);
});

test("keys saved before schema 15 gain heal and super on E and Q, or on the next free key when the player took them", () => {
	const { heal: _h, super: _s, ...older } = createKeyMap();
	const load = (keys: Record<string, string>) =>
		validateMeta({ ...createMetaState(), settings: { ...createSettings(), keys } }).settings.keys;
	expect(load(older)).toEqual(createKeyMap());
	const taken = load({ ...older, dash: "KeyE", reroll: "KeyQ" });
	expect(taken.dash).toBe("KeyE");
	expect(taken.heal).toBe("KeyF");
	expect(taken.super).toBe("KeyC");
	expect(() => load({ ...older, heal: "KeyE", super: "KeyE" })).toThrow(SaveError);
});

test("a global file from schema 14 (no heal or super keys) still verifies and gets them", async () => {
	const { heal: _kh, super: _ks, ...keys } = createKeyMap();
	const { heal: _ph, super: _ps, ...pad } = createPadMap();
	const data = { settings: { ...createSettings(), keys, pad } };
	const text = JSON.stringify({
		schemaVersion: 14,
		savedAt: "2026-11-11T10:00:00.000Z",
		app: "grim-cubes",
		appVersion: "0.6.0",
		checksum: await checksumOf(data),
		data,
	});
	const settings = await parseGlobal(text);
	expect(settings.keys).toEqual(createKeyMap());
	expect(settings.pad).toEqual(createPadMap());
	const tampered = text.replace('"reroll":"KeyR"', '"reroll":"KeyT"');
	await expect(parseGlobal(tampered)).rejects.toThrow("checksum mismatch");
});

test("the old stat tree costs 10,250 souls in all, and migrateOssuary gives back every node owned in full", () => {
	expect(Object.values(LEGACY_OSSUARY_COSTS).reduce((a, b) => a + b, 0)).toBe(10250);
	const m = meta();
	m.souls = 40;
	m.ossuary = {
		flesh_1: true,
		flesh_2: true,
		steel_1: true,
		ruin_6: false,
		gone_node: true,
		toString: true,
	};
	const migrated = migrateOssuary(m);
	expect(migrated.souls).toBe(40 + 50 + 100 + 50);
	expect(migrated.ossuary).toEqual({});
	const all = meta();
	all.ossuary = Object.fromEntries(Object.keys(LEGACY_OSSUARY_COSTS).map((id) => [id, true]));
	expect(migrateOssuary(all).souls).toBe(all.souls + 10250);
});

test("a schema 14 slot with bought nodes loads with those souls back and an empty tree", async () => {
	const text = await slotFileOf(14);
	const before = JSON.parse(text).data as { souls: number; ossuary: Record<string, boolean> };
	expect(before.ossuary).toEqual({ flesh_1: true });
	const loaded = await parseSave(text);
	expect(loaded.souls).toBe(before.souls + 50);
	expect(loaded.ossuary).toEqual({});
	await expect(parseSave(text.replace('"souls":285', '"souls":286'))).rejects.toThrow("checksum mismatch");
});

test("a schema 15 slot keeps its spell nodes and its souls untouched", async () => {
	const m = meta();
	m.ossuary = { warrior_shockwave_2: true };
	const loaded = await parseSave(await serializeSave(m, "0.7.0"));
	expect(loaded.souls).toBe(m.souls);
	expect(loaded.ossuary).toEqual({ warrior_shockwave_2: true });
});
