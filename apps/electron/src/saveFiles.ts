import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MAX_VALUE_BYTES, STORAGE_KEYS, type StorageKey } from "@gc/platform";

const KEYS: readonly string[] = STORAGE_KEYS;

/** The only way a key becomes a file name: it must be one of the storage keys, so no path ever comes from the page. */
export function fileFor(dir: string, key: unknown): string {
	if (typeof key !== "string" || !KEYS.includes(key))
		throw new RangeError(`invalid storage key: ${String(key)}`);
	return join(dir, `${key}.json`);
}

const BACKUP_OF: Readonly<Partial<Record<StorageKey, StorageKey>>> = { save: "save.bak" };

/**
 * The save envelope as files under `dir` (`<userData>/saves/`), ADR-0009. Writes go to `<file>.tmp` and are renamed
 * over the target, so a crash leaves the old file or the new one, never half of it.
 */
export function createSaveFiles(dir: string): {
	read(key: unknown): Promise<string | null>;
	write(key: unknown, value: unknown): Promise<void>;
	backup(key: unknown): Promise<void>;
} {
	// Writes to the same file wait for each other, so two quick saves do not share one tmp file.
	const queues = new Map<string, Promise<unknown>>();
	const exclusive = <T>(file: string, job: () => Promise<T>): Promise<T> => {
		const next = (queues.get(file) ?? Promise.resolve()).then(job, job);
		queues.set(
			file,
			next.catch(() => undefined),
		);
		return next;
	};

	async function atomicWrite(file: string, text: string): Promise<void> {
		await mkdir(dir, { recursive: true });
		const tmp = `${file}.tmp`;
		try {
			await writeFile(tmp, text, "utf8");
			await rename(tmp, file);
		} catch (error) {
			await rm(tmp, { force: true });
			throw error;
		}
	}

	return {
		async read(key): Promise<string | null> {
			const file = fileFor(dir, key);
			try {
				const text = await readFile(file, "utf8");
				return text.length <= MAX_VALUE_BYTES ? text : null;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},
		async write(key, value): Promise<void> {
			const file = fileFor(dir, key);
			if (typeof value !== "string" || value.length > MAX_VALUE_BYTES) {
				throw new RangeError("storage value must be a string within the size limit");
			}
			await exclusive(file, () => atomicWrite(file, value));
		},
		async backup(key): Promise<void> {
			const source = fileFor(dir, key);
			const backupKey = BACKUP_OF[key as StorageKey];
			if (!backupKey) throw new RangeError(`${String(key)} has no backup`);
			const target = fileFor(dir, backupKey);
			await exclusive(target, async () => {
				await mkdir(dir, { recursive: true });
				const tmp = `${target}.tmp`;
				try {
					await copyFile(source, tmp);
					await rename(tmp, target);
				} catch (error) {
					await rm(tmp, { force: true });
					if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
					throw error;
				}
			});
		},
	};
}
