import {
	createMetaState,
	createSettings,
	type Difficulty,
	isLegacySave,
	type MetaState,
	type Profile,
	parseGlobal,
	parseSave,
	profileOf,
	SaveError,
	type Settings,
	SLOT_COUNT,
	serializeGlobal,
	serializeSave,
	validateProfile,
	validateSettings,
} from "./save";

/** The slice of the platform storage the save needs; keys are plain strings so core stays platform-free. */
export interface SaveIO {
	read(key: string): Promise<string | null>;
	write(key: string, value: string): Promise<void>;
	/** Runs `fn` while holding a lock shared by every tab (Web Locks); without it, read-modify-write can interleave. */
	withLock?<T>(fn: () => Promise<T>): Promise<T>;
}

/** The settings shared by every slot (before schema 10 this key held the whole account). */
export const SAVE_KEY = "save";
export const SAVE_BACKUP_KEY = "save.bak";
export const SAVE_CORRUPT_KEY = "save.corrupt";
/** The corrupt text that `save.corrupt` held before the latest one. */
export const SAVE_CORRUPT_PREVIOUS_KEY = "save.corrupt.old";
export const slotKey = (slot: number): string => `slot${slot}`;
export const slotBackupKey = (slot: number): string => `slot${slot}.bak`;

/**
 * Why the session may not save as usual:
 * `newer` the save belongs to a later game version and is left untouched;
 * `recovered` the main save was unreadable and the backup was used;
 * `corrupt` both were unreadable (the bad text is kept under `save.corrupt`) and progress starts fresh;
 * `unavailable` storage could not be read at all, so nothing is written this session.
 */
export type SaveNotice = "newer" | "recovered" | "corrupt" | "unavailable";

export interface LoadedMeta {
	meta: MetaState;
	/** When true, `persistRun` must not be called: writing could destroy a save that is merely unreadable now. */
	readOnly: boolean;
	notice: SaveNotice | null;
}

/** What one finished run adds to the account. It is applied to whatever is stored at write time. */
export interface RunResult {
	souls: number;
	round: number;
	difficulty: Difficulty;
	kills: number;
	bossKills: number;
	elitesKilled: number;
}

/** Adds a run to `meta` in place: souls and stats accumulate, records keep the best round. */
export function applyRun(meta: MetaState, run: RunResult): void {
	meta.souls += run.souls;
	meta.records[run.difficulty] = Math.max(meta.records[run.difficulty], run.round);
	meta.stats.runs++;
	meta.stats.kills += run.kills;
	meta.stats.bossKills += run.bossKills;
	meta.stats.elitesKilled += run.elitesKilled;
	// The run is over, so its checkpoint goes with it.
	meta.run = null;
}

type Parsed<T> = { value: T } | { error: SaveError };

async function attempt<T>(parse: (text: string) => Promise<T>, text: string): Promise<Parsed<T>> {
	try {
		return { value: await parse(text) };
	} catch (error) {
		return { error: error instanceof SaveError ? error : new SaveError(String(error)) };
	}
}

/** Keeps the latest unreadable text and the one before it; identical text is not stored twice. */
async function keepCorrupt(io: SaveIO, text: string): Promise<void> {
	const latest = await io.read(SAVE_CORRUPT_KEY);
	if (latest === text) return;
	if (latest !== null) await io.write(SAVE_CORRUPT_PREVIOUS_KEY, latest);
	await io.write(SAVE_CORRUPT_KEY, text);
}

/** What one file (with its backup) holds: nothing, a readable value, a value taken from the backup, or trouble. */
type Stored<T> =
	| { kind: "empty" }
	| { kind: "ok"; value: T; text: string }
	| { kind: "recovered"; value: T; badMain: string | null }
	| { kind: "newer" }
	| { kind: "corrupt"; text: string };

async function readStored<T>(
	io: SaveIO,
	key: string,
	backupKey: string,
	parse: (text: string) => Promise<T>,
): Promise<Stored<T>> {
	const main = await io.read(key);
	const backup = await io.read(backupKey);
	if (main === null && backup === null) return { kind: "empty" };
	if (main !== null) {
		const parsed = await attempt(parse, main);
		if ("value" in parsed) return { kind: "ok", value: parsed.value, text: main };
		if (parsed.error.code === "newer") return { kind: "newer" };
	}
	if (backup !== null) {
		const parsed = await attempt(parse, backup);
		if ("value" in parsed) return { kind: "recovered", value: parsed.value, badMain: main };
		// A newer backup next to a broken main file is still a file from the future: leave everything alone.
		if (parsed.error.code === "newer") return { kind: "newer" };
	}
	return { kind: "corrupt", text: main ?? backup ?? "" };
}

/** The global file, or the single save of schemas 1 to 9, which carries the settings too. */
interface GlobalFile {
	settings: Settings;
	legacy: MetaState | null;
}

async function parseGlobalFile(text: string): Promise<GlobalFile> {
	if (!isLegacySave(text)) return { settings: await parseGlobal(text), legacy: null };
	const legacy = await parseSave(text);
	return { settings: legacy.settings, legacy };
}

/**
 * Moves the single save of schemas 1 to 9 into slot 1 and keeps its settings as the global ones. Slot 1 is written
 * first and never over an existing file, so a crash between the two writes is repaired by running this again.
 */
async function migrateLegacy(io: SaveIO, legacy: MetaState, appVersion: string): Promise<Settings> {
	if ((await io.read(slotKey(1))) === null && (await io.read(slotBackupKey(1))) === null) {
		await io.write(slotKey(1), await serializeSave(legacy, appVersion));
	}
	const settings = { ...legacy.settings, lastSlot: 1 };
	await io.write(SAVE_KEY, await serializeGlobal(settings, appVersion));
	return settings;
}

export interface LoadedGlobal {
	settings: Settings;
	readOnly: boolean;
	notice: SaveNotice | null;
}

/** Reads the shared settings (migrating the old single save into slot 1 the first time). */
export async function loadGlobal(io: SaveIO, appVersion: string): Promise<LoadedGlobal> {
	const fresh = (readOnly: boolean, notice: SaveNotice | null): LoadedGlobal => ({
		settings: createSettings(),
		readOnly,
		notice,
	});
	let stored: Stored<GlobalFile>;
	try {
		stored = await readStored(io, SAVE_KEY, SAVE_BACKUP_KEY, parseGlobalFile);
	} catch {
		return fresh(true, "unavailable");
	}
	if (stored.kind === "empty") return fresh(false, null);
	if (stored.kind === "newer") return fresh(true, "newer");
	if (stored.kind === "corrupt") {
		try {
			await keepCorrupt(io, stored.text);
		} catch {
			return fresh(true, "unavailable");
		}
		return fresh(false, "corrupt");
	}
	const notice = stored.kind === "recovered" ? "recovered" : null;
	if (stored.value.legacy === null) return { settings: stored.value.settings, readOnly: false, notice };
	try {
		return {
			settings: await migrateLegacy(io, stored.value.legacy, appVersion),
			readOnly: false,
			notice,
		};
	} catch {
		return { settings: stored.value.settings, readOnly: true, notice: "unavailable" };
	}
}

export interface LoadedSlot {
	profile: Profile;
	readOnly: boolean;
	notice: SaveNotice | null;
}

const parseProfile = async (text: string): Promise<Profile> => profileOf(await parseSave(text));

/** Reads one slot; a slot never written is an empty profile. */
export async function loadSlot(io: SaveIO, slot: number): Promise<LoadedSlot> {
	const fresh = (readOnly: boolean, notice: SaveNotice | null): LoadedSlot => ({
		profile: profileOf(createMetaState()),
		readOnly,
		notice,
	});
	let stored: Stored<Profile>;
	try {
		stored = await readStored(io, slotKey(slot), slotBackupKey(slot), parseProfile);
	} catch {
		return fresh(true, "unavailable");
	}
	if (stored.kind === "empty") return fresh(false, null);
	if (stored.kind === "newer") return fresh(true, "newer");
	if (stored.kind === "corrupt") {
		try {
			await keepCorrupt(io, stored.text);
		} catch {
			return fresh(true, "unavailable");
		}
		return fresh(false, "corrupt");
	}
	return {
		profile: stored.value,
		readOnly: false,
		notice: stored.kind === "recovered" ? "recovered" : null,
	};
}

const NOTICE_RANK: readonly (SaveNotice | null)[] = [null, "recovered", "corrupt", "unavailable", "newer"];
const worse = (a: SaveNotice | null, b: SaveNotice | null): SaveNotice | null =>
	NOTICE_RANK.indexOf(a) >= NOTICE_RANK.indexOf(b) ? a : b;

/** Loads the shared settings and one slot as the game uses them: the slot's profile with the global settings. */
export async function loadMeta(io: SaveIO, slot: number, appVersion: string): Promise<LoadedMeta> {
	const global = await loadGlobal(io, appVersion);
	const loaded = await loadSlot(io, slot);
	return {
		meta: { ...loaded.profile, settings: global.settings },
		readOnly: global.readOnly || loaded.readOnly,
		notice: worse(global.notice, loaded.notice),
	};
}

/** A slot as the selection screen shows it. */
export interface SlotSummary {
	slot: number;
	/** `empty`: never played or erased; `unreadable`: the file and its backup are damaged (left untouched). */
	state: "empty" | "used" | "unreadable";
	/** When the slot was last written (ISO), or null. */
	savedAt: string | null;
	souls: number;
	/** Best round over every difficulty. */
	bestRound: number;
	/** Round the saved run resumes at, or null when no run is in progress. */
	runRound: number | null;
}

/** True for a profile that has never been played: nothing earned, bought or recorded. */
export function isEmptyProfile(profile: Profile): boolean {
	return (
		profile.souls === 0 &&
		profile.stats.runs === 0 &&
		profile.unlocks.length === 0 &&
		Object.keys(profile.ossuary).length === 0 &&
		profile.run === null
	);
}

async function savedAtOf(io: SaveIO, slot: number): Promise<string | null> {
	const text = await io.read(slotKey(slot));
	if (text === null) return null;
	try {
		const at = (JSON.parse(text) as { savedAt?: unknown }).savedAt;
		return typeof at === "string" ? at : null;
	} catch {
		return null;
	}
}

/** The three slots for the selection screen. A slot that cannot be read is reported, never altered. */
export async function readSlots(io: SaveIO): Promise<SlotSummary[]> {
	const out: SlotSummary[] = [];
	for (let slot = 1; slot <= SLOT_COUNT; slot++) {
		const empty: SlotSummary = {
			slot,
			state: "empty",
			savedAt: null,
			souls: 0,
			bestRound: 0,
			runRound: null,
		};
		try {
			const stored = await readStored(io, slotKey(slot), slotBackupKey(slot), parseProfile);
			if (stored.kind === "empty") out.push(empty);
			else if (stored.kind === "newer" || stored.kind === "corrupt")
				out.push({ ...empty, state: "unreadable" });
			else if (isEmptyProfile(stored.value)) out.push(empty);
			else {
				const p = stored.value;
				out.push({
					slot,
					state: "used",
					savedAt: await savedAtOf(io, slot),
					souls: p.souls,
					bestRound: Math.max(
						p.records.easy,
						p.records.normal,
						p.records.grim,
						p.records.nightmare,
					),
					runRound: p.run?.round ?? null,
				});
			}
		} catch {
			out.push({ ...empty, state: "unreadable" });
		}
	}
	return out;
}

const withLock = <T>(io: SaveIO, fn: () => Promise<T>): Promise<T> => (io.withLock ? io.withLock(fn) : fn());

/**
 * Applies `mutate` to the stored slot and settings and returns the merged account. Both are read again right before
 * writing (under `io.withLock` when there is one), so progress from a second tab is kept. Only the file that changed
 * is written, after copying its last readable version to its backup. `mutate` may throw to refuse the change;
 * nothing is written then. Throws, writing nothing, if a file is from a newer version.
 */
export function updateMeta(
	io: SaveIO,
	slot: number,
	mutate: (meta: MetaState) => void,
	appVersion: string,
): Promise<MetaState> {
	return withLock(io, () => mergeInto(io, slot, mutate, appVersion));
}

/** Adds a finished run to the stored slot (see `updateMeta`). */
export function persistRun(io: SaveIO, slot: number, run: RunResult, appVersion: string): Promise<MetaState> {
	return updateMeta(io, slot, (meta) => applyRun(meta, run), appVersion);
}

/** Wipes a slot, backup included, so it reads as empty. The shared settings are not touched. */
export function eraseSlot(io: SaveIO, slot: number, appVersion: string): Promise<void> {
	return withLock(io, async () => {
		const stored = await readStored(io, slotKey(slot), slotBackupKey(slot), parseProfile);
		if (stored.kind === "newer") throw new SaveError("slot was written by a newer version", "newer");
		if (stored.kind === "corrupt") await keepCorrupt(io, stored.text);
		const text = await serializeSave(createMetaState(), appVersion);
		await io.write(slotBackupKey(slot), text);
		await io.write(slotKey(slot), text);
	});
}

async function mergeInto(
	io: SaveIO,
	slot: number,
	mutate: (meta: MetaState) => void,
	appVersion: string,
): Promise<MetaState> {
	let globalStored = await readStored(io, SAVE_KEY, SAVE_BACKUP_KEY, parseGlobalFile);
	if ((globalStored.kind === "ok" || globalStored.kind === "recovered") && globalStored.value.legacy) {
		await migrateLegacy(io, globalStored.value.legacy, appVersion);
		globalStored = await readStored(io, SAVE_KEY, SAVE_BACKUP_KEY, parseGlobalFile);
	}
	const slotStored = await readStored(io, slotKey(slot), slotBackupKey(slot), parseProfile);
	for (const stored of [globalStored, slotStored]) {
		if (stored.kind === "newer") throw new SaveError("save was written by a newer version", "newer");
		// Unreadable with no usable backup: keep the text aside and continue from a fresh file.
		if (stored.kind === "corrupt") await keepCorrupt(io, stored.text);
		if (stored.kind === "recovered" && stored.badMain !== null) await keepCorrupt(io, stored.badMain);
	}
	const settings =
		globalStored.kind === "ok" || globalStored.kind === "recovered"
			? globalStored.value.settings
			: createSettings();
	const profile =
		slotStored.kind === "ok" || slotStored.kind === "recovered"
			? slotStored.value
			: profileOf(createMetaState());
	const merged: MetaState = { ...structuredClone(profile), settings: structuredClone(settings) };
	mutate(merged);

	const nextProfile = validateProfile(merged);
	if (slotStored.kind !== "ok" || JSON.stringify(nextProfile) !== JSON.stringify(profile)) {
		if (slotStored.kind === "ok") await io.write(slotBackupKey(slot), slotStored.text);
		await io.write(slotKey(slot), await serializeSave(nextProfile, appVersion));
	}
	const nextSettings = validateSettings(merged.settings);
	if (globalStored.kind !== "ok" || JSON.stringify(nextSettings) !== JSON.stringify(settings)) {
		if (globalStored.kind === "ok") await io.write(SAVE_BACKUP_KEY, globalStored.text);
		await io.write(SAVE_KEY, await serializeGlobal(nextSettings, appVersion));
	}
	return { ...nextProfile, settings: nextSettings };
}
