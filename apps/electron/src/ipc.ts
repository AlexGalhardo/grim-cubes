import { app, ipcMain, shell } from "electron";
import { isSteamStoreUrl, isTrustedSender } from "./paths";
import { createSaveFiles } from "./saveFiles";

/** Registers `app:quit`, the title menu's "Sair do jogo": the same sender check as the save channels, then `app.quit()`. */
export function registerQuitIpc(): void {
	ipcMain.handle("app:quit", (event) => {
		if (!isTrustedSender(event.senderFrame?.url)) throw new Error("untrusted sender");
		app.quit();
	});
}

/** Registers `app:openExternal`, the "Wishlist na Steam" button: same sender check, and only the Steam store page opens, in the system browser. */
export function registerExternalIpc(): void {
	ipcMain.handle("app:openExternal", (event, url: unknown) => {
		if (!isTrustedSender(event.senderFrame?.url)) throw new Error("untrusted sender");
		if (!isSteamStoreUrl(url)) throw new Error("url not allowed");
		// The normalised href, so the shell gets exactly what was validated (no stray whitespace or escapes).
		return shell.openExternal(new URL(url).href);
	});
}

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
