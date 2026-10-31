export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_APP = "grim-cubes";
/** Upper bound on any counter read from a save; far above a real run, low enough to reject garbage. */
const MAX_COUNTER = 1_000_000_000;
/** A real save is a few KB; anything bigger is refused before it is parsed. */
export const MAX_SAVE_BYTES = 64 * 1024;
const MAX_LIST = 256;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type Difficulty = "normal" | "grim" | "nightmare";
export const DIFFICULTIES: readonly Difficulty[] = ["normal", "grim", "nightmare"];

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
	};
}

/**
 * Parses and verifies a save: JSON, envelope, schema version, checksum, then field validation.
 * Migrations from older versions would run here, in a chain, before validation (none exist yet).
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
	if (envelope.checksum !== (await checksumOf(data))) throw new SaveError("checksum mismatch");
	return data;
}
