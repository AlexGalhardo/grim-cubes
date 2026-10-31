import { createMetaState, type MetaState, parseSave, SaveError, serializeSave } from "./save";

/** The slice of the platform storage the save needs; keys are plain strings so core stays platform-free. */
export interface SaveIO {
	read(key: string): Promise<string | null>;
	write(key: string, value: string): Promise<void>;
}

export const SAVE_KEY = "save";
export const SAVE_BACKUP_KEY = "save.bak";
export const SAVE_CORRUPT_KEY = "save.corrupt";

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
	/** When true, `persistMeta` must not be called: writing could destroy a save that is merely unreadable now. */
	readOnly: boolean;
	notice: SaveNotice | null;
}

async function tryParse(text: string): Promise<{ meta: MetaState } | { error: SaveError }> {
	try {
		return { meta: await parseSave(text) };
	} catch (error) {
		return { error: error instanceof SaveError ? error : new SaveError(String(error)) };
	}
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
	}

	// Keep the first unreadable text for support; never replace an earlier one.
	const unreadable = main ?? backup;
	try {
		if (unreadable !== null && (await io.read(SAVE_CORRUPT_KEY)) === null)
			await io.write(SAVE_CORRUPT_KEY, unreadable);
	} catch {
		return { meta: createMetaState(), readOnly: true, notice: "unavailable" };
	}
	return { meta: createMetaState(), readOnly: false, notice: "corrupt" };
}

/** Writes the save; the last readable version is copied to `save.bak` first. */
export async function persistMeta(io: SaveIO, meta: MetaState, appVersion: string): Promise<void> {
	const text = await serializeSave(meta, appVersion);
	const current = await io.read(SAVE_KEY);
	if (current !== null && "meta" in (await tryParse(current))) await io.write(SAVE_BACKUP_KEY, current);
	await io.write(SAVE_KEY, text);
}
