import { type PlatformStorage, STORAGE_KEYS, type StorageKey } from "./types";

/**
 * Copies what `from` holds into `to` for every key `to` does not have yet, and returns the keys it copied. Used once
 * when the Electron app starts with files instead of IndexedDB: the save the browser storage already holds moves over
 * without touching a file that exists. `from` is left as it was (the source of truth is the file from then on).
 */
export async function migrateStorage(from: PlatformStorage, to: PlatformStorage): Promise<StorageKey[]> {
	const copied: StorageKey[] = [];
	for (const key of STORAGE_KEYS) {
		if ((await to.read(key)) !== null) continue;
		const value = await from.read(key);
		if (value === null) continue;
		await to.write(key, value);
		copied.push(key);
	}
	return copied;
}
