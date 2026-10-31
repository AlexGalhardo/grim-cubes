export const SAVE_SCHEMA_VERSION = 8;
export const SAVE_APP = "grim-cubes";
/** Upper bound on any counter read from a save; far above a real run, low enough to reject garbage. */
const MAX_COUNTER = 1_000_000_000;
/** A real save is a few KB; anything bigger is refused before it is parsed. */
export const MAX_SAVE_BYTES = 64 * 1024;
const MAX_LIST = 256;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type Difficulty = "normal" | "grim" | "nightmare";
export const DIFFICULTIES: readonly Difficulty[] = ["normal", "grim", "nightmare"];

import { createKeyMap, KEY_ACTIONS, type KeyMap, validKeyMap } from "./keys";
import { createPadMap, PAD_ACTIONS, type PadMap, validPadMap } from "./pad";

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
	};
}

/** Account-level progress that survives runs (SDD 06 section 2). */
export interface MetaState {
	souls: number;
	/** Best round reached per difficulty. */
	records: Record<Difficulty, number>;
	stats: { kills: number; runs: number; bossKills: number; elitesKilled: number };
	unlocks: string[];
	/** Ossuary nodes bought, by node id. */
	ossuary: Record<string, boolean>;
	flags: { isDemo: boolean; fullVersion: boolean };
	settings: Settings;
}

export interface SaveEnvelope {
	schemaVersion: number;
	savedAt: string;
	app: string;
	appVersion: string;
	checksum: string;
	data: MetaState;
}

export function createMetaState(): MetaState {
	return {
		souls: 0,
		records: { normal: 0, grim: 0, nightmare: 0 },
		stats: { kills: 0, runs: 0, bossKills: 0, elitesKilled: 0 },
		unlocks: [],
		ossuary: {},
		flags: { isDemo: false, fullVersion: false },
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
export const checksumOf = (data: MetaState): Promise<string> => sha256(JSON.stringify(data));

export async function serializeSave(
	meta: MetaState,
	appVersion: string,
	now: Date = new Date(),
): Promise<string> {
	// Normalising first keeps key order identical to what parseSave rebuilds, so the checksum round-trips.
	const data = validateMeta(meta);
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
		const button = raw[action];
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
function validateSettings(raw: unknown): Settings {
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
	};
}

/** Validates untrusted save data field by field and returns a clean copy; unknown keys are dropped. */
export function validateMeta(raw: unknown): MetaState {
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
		settings: validateSettings(raw.settings),
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
};

/** The data as an older schema's checksum saw it: only the settings keys that schema knew. */
function coveredBy(version: number, data: MetaState): unknown {
	if (version < 2) return (({ settings: _settings, ...rest }) => rest)(data);
	const keys = SETTINGS_KEYS[version];
	if (!keys) return data;
	const settings: Record<string, unknown> = {};
	for (const key of keys) settings[key] = data.settings[key];
	return { ...data, settings };
}

/**
 * Parses and verifies a save: JSON, envelope, schema version, checksum, then field validation.
 * Older schemas load with the defaults of the settings they lacked (see `coveredBy`); later migrations would chain here.
 */
export async function parseSave(text: string): Promise<MetaState> {
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
	const data = validateMeta(envelope.data);
	// An older checksum covers the data as it was then: schema 1 without `settings`, schema 2 without `gameSpeed`, schema 3 without `telemetry`.
	const covered = coveredBy(envelope.schemaVersion, data);
	if (envelope.checksum !== (await sha256(JSON.stringify(covered))))
		throw new SaveError("checksum mismatch");
	return data;
}
