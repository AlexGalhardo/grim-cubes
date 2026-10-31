import {
	assertStorageKey,
	MAX_VALUE_BYTES,
	NotImplementedError,
	type PlatformStorage,
	type StorageKey,
} from "./types";

/**
 * What the Electron preload exposes as `window.gcDesktop.storage`: each call crosses to the main process, which
 * validates the key again and keeps the files in `<userData>/saves/` (ADR-0009).
 */
export interface ElectronStorageBridge {
	read(key: StorageKey): Promise<string | null>;
	write(key: StorageKey, value: string): Promise<void>;
	/** Copies the file of `key` to its backup (`<key>.bak`), atomically. */
	backup(key: StorageKey): Promise<void>;
}

export interface ElectronStorage extends PlatformStorage {
	backup(key: StorageKey): Promise<void>;
}

/** The save as files in the app's data folder; without the preload bridge (a plain browser) every call fails loudly. */
export function createElectronStorage(bridge?: ElectronStorageBridge): ElectronStorage {
	const missing = async (): Promise<never> => {
		throw new NotImplementedError("electron storage without the preload bridge");
	};
	if (!bridge) return { read: missing, write: missing, backup: missing };
	return {
		async read(key): Promise<string | null> {
			assertStorageKey(key);
			const value = await bridge.read(key);
			// The file is untrusted input like IndexedDB: anything but a bounded string is treated as absent.
			return typeof value === "string" && value.length <= MAX_VALUE_BYTES ? value : null;
		},
		async write(key, value): Promise<void> {
			assertStorageKey(key);
			if (typeof value !== "string" || value.length > MAX_VALUE_BYTES) {
				throw new RangeError("storage value must be a string within the size limit");
			}
			await bridge.write(key, value);
		},
		async backup(key): Promise<void> {
			assertStorageKey(key);
			await bridge.backup(key);
		},
	};
}
