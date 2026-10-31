export const SAVE_SCHEMA_VERSION = 11;
/** Complete profiles a player can keep side by side (GDD 21.4); slot numbers are 1 to `SLOT_COUNT`. */
export const SLOT_COUNT = 3;
export const SAVE_APP = "grim-cubes";
/** Upper bound on any counter read from a save; far above a real run, low enough to reject garbage. */
const MAX_COUNTER = 1_000_000_000;
/** A real save is a few KB; anything bigger is refused before it is parsed. */
export const MAX_SAVE_BYTES = 64 * 1024;
const MAX_LIST = 256;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type Difficulty = "easy" | "normal" | "grim" | "nightmare";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "grim", "nightmare"];

import { createKeyMap, KEY_ACTIONS, type KeyMap, validKeyMap } from "./keys";
import { createPadMap, PAD_ACTIONS, type PadMap, validPadMap } from "./pad";
import { RNG_STREAMS } from "./rng";

export const LOCALES = ["pt-BR", "en"] as const;
export type SettingsLocale = (typeof LOCALES)[number];

export const COLORBLIND_MODES = ["off", "protanopia", "deuteranopia", "tritanopia"] as const;
export type ColorblindSetting = (typeof COLORBLIND_MODES)[number];
export const UI_SCALES = [90, 100, 125, 150] as const;
export type UiScale = (typeof UI_SCALES)[number];

/** Options screen choices (A-01-01). Volumes are whole percents; `preset` is "auto" or a `data/presets.json` id. */
export interface Settings {
	preset: string;
	volume: { master: number; music: number; sfx: number };
	/** Off removes the camera shake and the hit pulse, like prefers-reduced-motion. */
	screenShake: boolean;
	locale: SettingsLocale;
	/** Simulation speed for testing: 1, 2 or 3 steps of game time per real step. */
	gameSpeed: 1 | 2 | 3;
	/** Opt-in telemetry (A-06-04); off unless the player turns it on. */
	telemetry: boolean;
	/** Percent, -50 to 50 (visual accessibility, A-07-02). */
	brightness: number;
	/** Percent, 50 to 150. */
	contrast: number;
	colorblind: ColorblindSetting;
	/** Cuts white flashes, hit-stop and camera shake. */
	flashReduction: boolean;
	/** HUD scale in percent. */
	uiScale: UiScale;
	/** true = full gore, false = reduced (no decals or blood, grey cubes). */
	gore: boolean;
	/** Remapped keyboard controls (`KeyboardEvent.code`). */
	keys: KeyMap;
	/** Remapped gamepad buttons (indexes of the standard mapping). */
	pad: PadMap;
	/** Captions for the boss voice lines (on by default). */
	subtitles: boolean;
	/** Slot (1 to `SLOT_COUNT`) the player used last, or 0 for none: "Continuar" opens it. */
	lastSlot: number;
}

export function createSettings(): Settings {
	return {
		preset: "auto",
		volume: { master: 100, music: 70, sfx: 100 },
		screenShake: true,
		locale: "pt-BR",
		gameSpeed: 1,
		telemetry: false,
		brightness: 0,
		contrast: 100,
		colorblind: "off",
		flashReduction: false,
		uiScale: 100,
		gore: true,
		keys: createKeyMap(),
		pad: createPadMap(),
		subtitles: true,
		lastSlot: 0,
	};
}

/**
 * The run in progress, saved when a round is about to start (GDD 21.4). Enemies are not part of it: the round begins
 * clean. Everything the session needs to be rebuilt at that point, nothing derived.
 */
export interface RunCheckpoint {
	seed: number;
	difficulty: Difficulty;
	/** The round that is about to start. */
	round: number;
	gold: number;
	xp: number;
	level: number;
	hp: number;
	weapon: { id: string; tier: number; paid: number };
	/** Items owned, by id. */
	owned: Record<string, number>;
	/** Modifiers picked during the run (cards, items, chests), after the Ossuary ones. */
	modifiers: { stat: string; op: string; value: number }[];
	cardRerollsLeft: number;
	revivesSpent: number;
	/** Fragment value left from the last round, released as the next enemies spawn. */
	bag: number;
	/** State of every RNG stream, in `RNG_STREAMS` order. */
	rng: number[];
	/** Where the hero stood: the world origin shift and the position relative to it. */
	origin: { x: number; z: number };
	position: { x: number; z: number };
	kills: number;
	damageDealt: number;
	elitesKilled: number;
	bossRounds: number[];
}

/** Account progress of one slot (SDD 06 section 2); the settings live outside it. */
export interface Profile {
	souls: number;
	/** Best round reached per difficulty. */
	records: Record<Difficulty, number>;
	stats: { kills: number; runs: number; bossKills: number; elitesKilled: number };
	unlocks: string[];
	/** Ossuary nodes bought, by node id. */
	ossuary: Record<string, boolean>;
	flags: { isDemo: boolean; fullVersion: boolean };
	/** The run in progress, or null. */
	run: RunCheckpoint | null;
}

/** What the game works with: the open slot plus the settings shared by all slots. */
export interface MetaState extends Profile {
	settings: Settings;
}

export interface SaveEnvelope {
	schemaVersion: number;
	savedAt: string;
	app: string;
	appVersion: string;
	checksum: string;
	data: unknown;
}

export function createMetaState(): MetaState {
	return {
		souls: 0,
		records: { easy: 0, normal: 0, grim: 0, nightmare: 0 },
		stats: { kills: 0, runs: 0, bossKills: 0, elitesKilled: 0 },
		unlocks: [],
		ossuary: {},
		flags: { isDemo: false, fullVersion: false },
		run: null,
		settings: createSettings(),
	};
}

/** `newer`: written by a later version of the game, so it must be left untouched; `invalid`: unreadable or corrupt. */
export type SaveErrorCode = "newer" | "invalid";

export class SaveError extends Error {
	readonly code: SaveErrorCode;
	constructor(message: string, code: SaveErrorCode = "invalid") {
		super(message);
		this.name = "SaveError";
		this.code = code;
	}
}

async function sha256(text: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
	return `sha256-${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Corruption check only, not anti-cheat: the checksum covers the serialized `data`. */
export const checksumOf = (data: unknown): Promise<string> => sha256(JSON.stringify(data));

/** The slot part of the account: everything but the settings. */
export function profileOf(meta: Profile): Profile {
	const { settings: _settings, ...profile } = meta as MetaState;
	return profile;
}

async function envelopeText(data: unknown, appVersion: string, now: Date): Promise<string> {
	const envelope: SaveEnvelope = {
		schemaVersion: SAVE_SCHEMA_VERSION,
		savedAt: now.toISOString(),
		app: SAVE_APP,
		appVersion,
		checksum: await checksumOf(data),
		data,
	};
	return JSON.stringify(envelope);
}

/** Text of one slot file (schema 10): the profile only, so the settings never depend on a slot. */
export async function serializeSave(
	meta: Profile,
	appVersion: string,
	now: Date = new Date(),
): Promise<string> {
	// Normalising first keeps key order identical to what parseSave rebuilds, so the checksum round-trips.
	return envelopeText(validateProfile(meta), appVersion, now);
}

/** Text of the global file (`save`, schema 10): the settings shared by every slot. */
export async function serializeGlobal(
	settings: Settings,
	appVersion: string,
	now: Date = new Date(),
): Promise<string> {
	return envelopeText({ settings: validateSettings(settings) }, appVersion, now);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

function counter(value: unknown, label: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_COUNTER) {
		throw new SaveError(`${label} must be an integer between 0 and ${MAX_COUNTER}`);
	}
	return value;
}

/** Absent before schema 6: the default keys. Present: every action a short code and no key shared. */
function validateKeys(raw: unknown): KeyMap {
	if (raw === undefined) return createKeyMap();
	if (!isRecord(raw)) throw new SaveError("settings.keys must be an object");
	const keys = createKeyMap();
	for (const action of KEY_ACTIONS) {
		const code = raw[action];
		if (typeof code !== "string") throw new SaveError(`settings.keys.${action} must be a key code`);
		keys[action] = code;
	}
	if (!validKeyMap(keys)) throw new SaveError("settings.keys has an invalid, reserved or shared key");
	return keys;
}

/** Absent before schema 7: the default buttons. Present: integers in range, none shared or on the D-pad. */
function validatePad(raw: unknown): PadMap {
	if (raw === undefined) return createPadMap();
	if (!isRecord(raw)) throw new SaveError("settings.pad must be an object");
	const pad = createPadMap();
	for (const action of PAD_ACTIONS) {
		// Reroll and speed are absent in schema 7 and 8 saves: their default buttons.
		const button = raw[action] === undefined ? pad[action] : raw[action];
		if (typeof button !== "number") throw new SaveError(`settings.pad.${action} must be a button number`);
		pad[action] = button;
	}
	if (!validPadMap(pad)) throw new SaveError("settings.pad has an invalid, reserved or shared button");
	return pad;
}

function percent(value: unknown, label: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
		throw new SaveError(`${label} must be an integer between 0 and 100`);
	}
	return value;
}

/** A save written before schema 2 has no settings: it gets the defaults. */
export function validateSettings(raw: unknown): Settings {
	if (raw === undefined) return createSettings();
	if (!isRecord(raw) || !isRecord(raw.volume)) throw new SaveError("settings must be an object");
	if (typeof raw.preset !== "string" || !/^[a-z][a-z0-9_]{0,31}$/.test(raw.preset))
		throw new SaveError("settings.preset must be a short id");
	if (typeof raw.screenShake !== "boolean") throw new SaveError("settings.screenShake must be a boolean");
	if (!LOCALES.includes(raw.locale as SettingsLocale)) throw new SaveError("settings.locale is unknown");
	// Absent in schema 2 saves: normal speed.
	const speed = raw.gameSpeed === undefined ? 1 : raw.gameSpeed;
	if (speed !== 1 && speed !== 2 && speed !== 3)
		throw new SaveError("settings.gameSpeed must be 1, 2 or 3");
	// Absent before schema 4: off.
	const telemetry = raw.telemetry === undefined ? false : raw.telemetry;
	if (typeof telemetry !== "boolean") throw new SaveError("settings.telemetry must be a boolean");
	// The visual options are absent before schema 5: untouched picture, full gore.
	const brightness = raw.brightness === undefined ? 0 : raw.brightness;
	const contrast = raw.contrast === undefined ? 100 : raw.contrast;
	if (
		typeof brightness !== "number" ||
		!Number.isInteger(brightness) ||
		brightness < -50 ||
		brightness > 50
	)
		throw new SaveError("settings.brightness must be an integer between -50 and 50");
	if (typeof contrast !== "number" || !Number.isInteger(contrast) || contrast < 50 || contrast > 150)
		throw new SaveError("settings.contrast must be an integer between 50 and 150");
	const colorblind = raw.colorblind === undefined ? "off" : raw.colorblind;
	if (!COLORBLIND_MODES.includes(colorblind as ColorblindSetting))
		throw new SaveError("settings.colorblind is unknown");
	const flashReduction = raw.flashReduction === undefined ? false : raw.flashReduction;
	const gore = raw.gore === undefined ? true : raw.gore;
	if (typeof flashReduction !== "boolean" || typeof gore !== "boolean")
		throw new SaveError("settings.flashReduction and settings.gore must be booleans");
	const uiScale = raw.uiScale === undefined ? 100 : raw.uiScale;
	if (!UI_SCALES.includes(uiScale as UiScale))
		throw new SaveError("settings.uiScale must be 90, 100, 125 or 150");
	const keys = validateKeys(raw.keys);
	const pad = validatePad(raw.pad);
	const subtitles = raw.subtitles === undefined ? true : raw.subtitles;
	if (typeof subtitles !== "boolean") throw new SaveError("settings.subtitles must be a boolean");
	// Absent before schema 10: no slot used yet.
	const lastSlot = raw.lastSlot === undefined ? 0 : raw.lastSlot;
	if (typeof lastSlot !== "number" || !Number.isInteger(lastSlot) || lastSlot < 0 || lastSlot > SLOT_COUNT)
		throw new SaveError(`settings.lastSlot must be an integer between 0 and ${SLOT_COUNT}`);
	return {
		preset: raw.preset,
		volume: {
			master: percent(raw.volume.master, "settings.volume.master"),
			music: percent(raw.volume.music, "settings.volume.music"),
			sfx: percent(raw.volume.sfx, "settings.volume.sfx"),
		},
		screenShake: raw.screenShake,
		locale: raw.locale as SettingsLocale,
		gameSpeed: speed,
		telemetry,
		brightness,
		contrast,
		colorblind: colorblind as ColorblindSetting,
		flashReduction,
		uiScale: uiScale as UiScale,
		gore,
		keys,
		pad,
		subtitles,
		lastSlot,
	};
}

const MAX_MODIFIERS = 512;
const RNG_STATE_COUNT = RNG_STREAMS.length;

const shortText = (value: unknown, label: string): string => {
	if (typeof value !== "string" || value.length === 0 || value.length > 64)
		throw new SaveError(`${label} must be a short string`);
	return value;
};

function finite(value: unknown, label: string, max = MAX_COUNTER): number {
	if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > max)
		throw new SaveError(`${label} must be a finite number`);
	return value;
}

/** A non-negative amount that may have a fraction (gold, experience, fragment value). */
function amount(value: unknown, label: string): number {
	const n = finite(value, label, MAX_COUNTER);
	if (n < 0) throw new SaveError(`${label} must not be negative`);
	return n;
}

function validateCheckpoint(raw: unknown): RunCheckpoint | null {
	if (raw === undefined || raw === null) return null;
	if (!isRecord(raw)) throw new SaveError("run must be an object");
	const { weapon, owned, modifiers, rng, origin, position, bossRounds } = raw;
	if (!isRecord(weapon) || !isRecord(owned) || !isRecord(origin) || !isRecord(position))
		throw new SaveError("run is incomplete");
	if (!DIFFICULTIES.includes(raw.difficulty as Difficulty))
		throw new SaveError("run.difficulty is unknown");
	if (!Array.isArray(modifiers) || modifiers.length > MAX_MODIFIERS)
		throw new SaveError("run.modifiers must be a short list");
	if (!Array.isArray(rng) || rng.length !== RNG_STATE_COUNT)
		throw new SaveError("run.rng must hold one state per stream");
	if (!Array.isArray(bossRounds) || bossRounds.length > MAX_LIST)
		throw new SaveError("run.bossRounds must be a short list");
	const items = Object.entries(owned);
	if (items.length > MAX_LIST) throw new SaveError("run.owned has too many entries");
	const ownedClean: Record<string, number> = {};
	for (const [id, count] of items) {
		if (FORBIDDEN_KEYS.has(id)) throw new SaveError("run.owned contains a reserved key");
		ownedClean[shortText(id, "run.owned id")] = counter(count, "run.owned count");
	}
	const round = counter(raw.round, "run.round");
	if (round < 1) throw new SaveError("run.round must start at 1");
	return {
		seed: counter(raw.seed, "run.seed") % 4294967296,
		difficulty: raw.difficulty as Difficulty,
		round,
		gold: amount(raw.gold, "run.gold"),
		xp: amount(raw.xp, "run.xp"),
		level: Math.max(1, counter(raw.level, "run.level")),
		hp: finite(raw.hp, "run.hp", 1_000_000),
		weapon: {
			id: shortText(weapon.id, "run.weapon.id"),
			tier: counter(weapon.tier, "run.weapon.tier"),
			paid: counter(weapon.paid, "run.weapon.paid"),
		},
		owned: ownedClean,
		modifiers: modifiers.map((m: unknown) => {
			if (!isRecord(m)) throw new SaveError("run.modifiers entries must be objects");
			return {
				stat: shortText(m.stat, "modifier.stat"),
				op: shortText(m.op, "modifier.op"),
				value: finite(m.value, "modifier.value", 1_000_000),
			};
		}),
		cardRerollsLeft: counter(raw.cardRerollsLeft, "run.cardRerollsLeft"),
		revivesSpent: counter(raw.revivesSpent, "run.revivesSpent"),
		bag: amount(raw.bag, "run.bag"),
		rng: rng.map((state: unknown) => {
			if (typeof state !== "number" || !Number.isInteger(state) || Math.abs(state) > 2 ** 32)
				throw new SaveError("run.rng entries must be 32-bit integers");
			return state;
		}),
		origin: { x: finite(origin.x, "run.origin.x"), z: finite(origin.z, "run.origin.z") },
		position: { x: finite(position.x, "run.position.x"), z: finite(position.z, "run.position.z") },
		kills: counter(raw.kills, "run.kills"),
		damageDealt: amount(raw.damageDealt, "run.damageDealt"),
		elitesKilled: counter(raw.elitesKilled, "run.elitesKilled"),
		bossRounds: bossRounds.map((r: unknown) => counter(r, "run.bossRounds entry")),
	};
}

/** Validates untrusted save data field by field and returns a clean copy; unknown keys are dropped. */
export function validateMeta(raw: unknown): MetaState {
	return { ...validateProfile(raw), settings: validateSettings(isRecord(raw) ? raw.settings : undefined) };
}

/** `validateMeta` without the settings: what one slot file holds. */
export function validateProfile(raw: unknown): Profile {
	if (!isRecord(raw)) throw new SaveError("data must be an object");
	const records = raw.records;
	const stats = raw.stats;
	const flags = raw.flags;
	if (!isRecord(records) || !isRecord(stats) || !isRecord(flags))
		throw new SaveError("records, stats and flags are required");
	const unlocks = raw.unlocks;
	if (
		!Array.isArray(unlocks) ||
		unlocks.length > MAX_LIST ||
		unlocks.some((u) => typeof u !== "string" || u.length > 64)
	) {
		throw new SaveError("unlocks must be a list of short strings");
	}
	const ossuary = raw.ossuary;
	if (!isRecord(ossuary)) throw new SaveError("ossuary must be an object");
	const entries = Object.entries(ossuary);
	if (entries.length > MAX_LIST) throw new SaveError("ossuary has too many entries");
	const nodes: Record<string, boolean> = {};
	for (const [id, owned] of entries) {
		if (FORBIDDEN_KEYS.has(id)) throw new SaveError("ossuary contains a reserved key");
		if (typeof owned !== "boolean" || id.length > 64)
			throw new SaveError("ossuary entries must be booleans");
		nodes[id] = owned;
	}
	if (typeof flags.isDemo !== "boolean" || typeof flags.fullVersion !== "boolean") {
		throw new SaveError("flags must be booleans");
	}
	return {
		souls: counter(raw.souls, "souls"),
		records: {
			// Absent before schema 11: no best round on Easy yet.
			easy: records.easy === undefined ? 0 : counter(records.easy, "records.easy"),
			normal: counter(records.normal, "records.normal"),
			grim: counter(records.grim, "records.grim"),
			nightmare: counter(records.nightmare, "records.nightmare"),
		},
		stats: {
			kills: counter(stats.kills, "stats.kills"),
			runs: counter(stats.runs, "stats.runs"),
			bossKills: counter(stats.bossKills, "stats.bossKills"),
			elitesKilled: counter(stats.elitesKilled, "stats.elitesKilled"),
		},
		unlocks: [...unlocks] as string[],
		ossuary: nodes,
		flags: { isDemo: flags.isDemo, fullVersion: flags.fullVersion },
		run: validateCheckpoint(raw.run),
	};
}

/** Settings keys each schema wrote, in the order it wrote them: schema 1 had none, 5 added the visual options. */
const SETTINGS_KEYS: Readonly<Record<number, readonly (keyof Settings)[]>> = {
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

/** Schemas before 11 had no Easy record: their checksum covers `records` without it. */
function withoutEasy<T extends { records: Record<string, number> }>(profile: T): T {
	const { easy: _easy, ...records } = profile.records;
	return { ...profile, records };
}

/**
 * The data as an older schema's checksum saw it (schemas 1 to 9 stored the whole account in one file): no
 * checkpoint, only the settings keys that schema knew, and no `lastSlot`.
 */
function coveredBy(version: number, data: MetaState): unknown {
	const { run: _run, settings: full, ...rest } = data;
	const profile = withoutEasy(rest);
	if (version < 2) return profile;
	const keys = SETTINGS_KEYS[version];
	if (!keys) throw new RangeError(`no settings key list for schema ${version}`);
	const settings: Record<string, unknown> = {};
	for (const key of keys) settings[key] = full[key];
	// Schemas 7 and 8 stored only the dash and pause buttons (9 added reroll and speed).
	if ("pad" in settings && version < 9) settings.pad = { dash: full.pad.dash, pause: full.pad.pause };
	return { ...profile, settings };
}

interface Envelope {
	schemaVersion: number;
	checksum: unknown;
	data: unknown;
}

/** JSON, envelope shape, app, size and schema range: what every save file shares. */
function openEnvelope(text: string): Envelope {
	if (text.length > MAX_SAVE_BYTES) throw new SaveError("save is too large");
	let envelope: unknown;
	try {
		envelope = JSON.parse(text);
	} catch {
		throw new SaveError("save is not valid JSON");
	}
	if (!isRecord(envelope)) throw new SaveError("save envelope must be an object");
	if (envelope.app !== SAVE_APP) throw new SaveError("save belongs to another app");
	if (typeof envelope.schemaVersion !== "number" || !Number.isInteger(envelope.schemaVersion)) {
		throw new SaveError("schemaVersion must be an integer");
	}
	if (envelope.schemaVersion > SAVE_SCHEMA_VERSION)
		throw new SaveError("save was written by a newer version", "newer");
	if (envelope.schemaVersion < 1) throw new SaveError("unsupported schemaVersion");
	return { schemaVersion: envelope.schemaVersion, checksum: envelope.checksum, data: envelope.data };
}

async function verified(envelope: Envelope, covered: unknown): Promise<void> {
	if (envelope.checksum !== (await sha256(JSON.stringify(covered))))
		throw new SaveError("checksum mismatch");
}

/**
 * Parses a slot file: JSON, envelope, schema version, checksum, then field validation. A schema 10 file holds the
 * profile only, so its `settings` are the defaults (the caller overlays the global ones). A file from schemas 1 to 9
 * is the old single save: the whole account, settings included, loaded with the defaults of what it lacked (see
 * `coveredBy`); `legacySchema` tells which kind it was.
 */
export async function parseSave(text: string): Promise<MetaState> {
	const envelope = openEnvelope(text);
	if (envelope.schemaVersion >= 10) {
		const profile = validateProfile(envelope.data);
		await verified(envelope, envelope.schemaVersion < 11 ? withoutEasy(profile) : profile);
		return { ...profile, settings: createSettings() };
	}
	const data = validateMeta(envelope.data);
	await verified(envelope, coveredBy(envelope.schemaVersion, data));
	return data;
}

/** True when `text` is a schema 1 to 9 file, the single save from before the slots. Unreadable text is false. */
export function isLegacySave(text: string): boolean {
	try {
		return openEnvelope(text).schemaVersion < 10;
	} catch {
		return false;
	}
}

/** Parses the global file (`save`, schema 10): the settings shared by the slots. */
export async function parseGlobal(text: string): Promise<Settings> {
	const envelope = openEnvelope(text);
	if (envelope.schemaVersion < 10 || !isRecord(envelope.data))
		throw new SaveError("not a global settings file");
	const settings = validateSettings(envelope.data.settings);
	await verified(envelope, { settings });
	return settings;
}
