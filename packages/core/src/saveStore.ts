import {
	createMetaState,
	type Difficulty,
	type MetaState,
	parseSave,
	SaveError,
	serializeSave,
} from "./save";

/** The slice of the platform storage the save needs; keys are plain strings so core stays platform-free. */
export interface SaveIO {
	read(key: string): Promise<string | null>;
	write(key: string, value: string): Promise<void>;
	/** Runs `fn` while holding a lock shared by every tab (Web Locks); without it, read-modify-write can interleave. */
	withLock?<T>(fn: () => Promise<T>): Promise<T>;
}

export const SAVE_KEY = "save";
export const SAVE_BACKUP_KEY = "save.bak";
export const SAVE_CORRUPT_KEY = "save.corrupt";
/** The corrupt text that `save.corrupt` held before the latest one. */
export const SAVE_CORRUPT_PREVIOUS_KEY = "save.corrupt.old";

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
}

async function tryParse(text: string): Promise<{ meta: MetaState } | { error: SaveError }> {
	try {
		return { meta: await parseSave(text) };
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

/** Reads `save`, falls back to `save.bak`, and never overwrites anything it could not read. */
export async function loadMeta(io: SaveIO): Promise<LoadedMeta> {
	let main: string | null;
	let backup: string | null;
	try {
		main = await io.read(SAVE_KEY);
		backup = await io.read(SAVE_BACKUP_KEY);
	} catch {
		return { meta: createMetaState(), readOnly: true, notice: "unavailable" };
	}

	if (main === null && backup === null) return { meta: createMetaState(), readOnly: false, notice: null };

	if (main !== null) {
		const parsed = await tryParse(main);
		if ("meta" in parsed) return { meta: parsed.meta, readOnly: false, notice: null };
		if (parsed.error.code === "newer")
			return { meta: createMetaState(), readOnly: true, notice: "newer" };
	}

	if (backup !== null) {
		const parsed = await tryParse(backup);
		if ("meta" in parsed) return { meta: parsed.meta, readOnly: false, notice: "recovered" };
		// A newer backup next to a broken main save is still a save from the future: leave everything alone.
		if (parsed.error.code === "newer")
			return { meta: createMetaState(), readOnly: true, notice: "newer" };
	}

	const unreadable = main ?? backup;
	try {
		if (unreadable !== null) await keepCorrupt(io, unreadable);
	} catch {
		return { meta: createMetaState(), readOnly: true, notice: "unavailable" };
	}
	return { meta: createMetaState(), readOnly: false, notice: "corrupt" };
}

/**
 * Adds a finished run to the stored save and returns the merged account. The stored save is read again right
 * before writing, so a second tab's progress is kept (last writer no longer wins). The last readable version is
 * copied to `save.bak` first. Throws, writing nothing, if the stored save is unreadable or from a newer version.
 */
export function persistRun(io: SaveIO, run: RunResult, appVersion: string): Promise<MetaState> {
	return io.withLock ? io.withLock(() => mergeRun(io, run, appVersion)) : mergeRun(io, run, appVersion);
}

async function mergeRun(io: SaveIO, run: RunResult, appVersion: string): Promise<MetaState> {
	const current = await io.read(SAVE_KEY);
	let merged = createMetaState();
	if (current !== null) {
		const parsed = await tryParse(current);
		if ("meta" in parsed) {
			merged = parsed.meta;
			await io.write(SAVE_BACKUP_KEY, current);
		} else if (parsed.error.code === "newer") {
			throw parsed.error;
		} else {
			// Unreadable main save: keep the text aside, continue from the backup when there is a readable one.
			await keepCorrupt(io, current);
			const backup = await io.read(SAVE_BACKUP_KEY);
			const fromBackup = backup === null ? null : await tryParse(backup);
			if (fromBackup && "error" in fromBackup && fromBackup.error.code === "newer")
				throw fromBackup.error;
			if (fromBackup && "meta" in fromBackup) merged = fromBackup.meta;
		}
	}
	applyRun(merged, run);
	await io.write(SAVE_KEY, await serializeSave(merged, appVersion));
	return merged;
}
