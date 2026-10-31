export const STORAGE_KEYS = ["save", "save.bak", "save.corrupt", "options", "telemetry"] as const;
export type StorageKey = (typeof STORAGE_KEYS)[number];

/** Upper bound for one stored value; far above a real save, low enough to refuse garbage. */
export const MAX_VALUE_BYTES = 5 * 1024 * 1024;

export interface PlatformStorage {
	/** Resolves null when the key is absent or its stored value is not a valid string. */
	read(key: StorageKey): Promise<string | null>;
	write(key: StorageKey, value: string): Promise<void>;
}

export class NotImplementedError extends Error {
	constructor(what: string) {
		super(`${what} is not implemented`);
		this.name = "NotImplementedError";
	}
}

export function assertStorageKey(key: unknown): asserts key is StorageKey {
	if (!STORAGE_KEYS.includes(key as StorageKey))
		throw new RangeError(`invalid storage key: ${String(key)}`);
}
