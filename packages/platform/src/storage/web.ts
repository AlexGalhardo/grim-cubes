import { assertStorageKey, MAX_VALUE_BYTES, type PlatformStorage, type StorageKey } from "./types";

const STORE = "kv";

function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function open(factory: IDBFactory, name: string): Promise<IDBDatabase> {
	const req = factory.open(name, 1);
	req.onupgradeneeded = () => req.result.createObjectStore(STORE);
	return request(req);
}

export function createWebStorage(factory: IDBFactory = indexedDB, dbName = "grim-cubes"): PlatformStorage {
	let db: Promise<IDBDatabase> | null = null;
	const store = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => {
		db ??= open(factory, dbName);
		return (await db).transaction(STORE, mode).objectStore(STORE);
	};

	return {
		async read(key: StorageKey): Promise<string | null> {
			assertStorageKey(key);
			const value: unknown = await request((await store("readonly")).get(key));
			// The origin's IndexedDB is untrusted input: anything but a bounded string is treated as absent.
			return typeof value === "string" && value.length <= MAX_VALUE_BYTES ? value : null;
		},
		async write(key: StorageKey, value: string): Promise<void> {
			assertStorageKey(key);
			if (typeof value !== "string" || value.length > MAX_VALUE_BYTES) {
				throw new RangeError("storage value must be a string within the size limit");
			}
			await request((await store("readwrite")).put(value, key));
		},
	};
}
