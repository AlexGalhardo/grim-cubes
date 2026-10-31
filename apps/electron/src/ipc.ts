import { ipcMain } from "electron";
import { isTrustedSender } from "./paths";
import { createSaveFiles } from "./saveFiles";

/** Registers the save channels the preload calls (`storage:read`, `storage:write`, `storage:backup`). */
export function registerStorageIpc(dir: string): void {
	const files = createSaveFiles(dir);
	const guard = (event: { senderFrame: { url: string } | null }): void => {
		if (!isTrustedSender(event.senderFrame?.url)) throw new Error("untrusted sender");
	};
	ipcMain.handle("storage:read", (event, key: unknown) => {
		guard(event);
		return files.read(key);
	});
	ipcMain.handle("storage:write", (event, key: unknown, value: unknown) => {
		guard(event);
		return files.write(key, value);
	});
	ipcMain.handle("storage:backup", (event, key: unknown) => {
		guard(event);
		return files.backup(key);
	});
}
