import { join, normalize, sep } from "node:path";

/** Maps an `app://game/<path>` pathname to a file under `root`; null when it would leave the folder. */
export function resolveAppPath(urlPath: string, root: string): string | null {
	let relative: string;
	try {
		relative = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
	} catch {
		// A malformed escape such as "%E0%A4%A" is not a file of ours.
		return null;
	}
	const file = normalize(join(root, relative));
	return file === root || file.startsWith(root + sep) ? file : null;
}

/** Only the game's own page may use the storage channels: `app://game/...`, never another frame or origin. */
export function isTrustedSender(url: string | undefined): boolean {
	return typeof url === "string" && url.startsWith("app://game/");
}

/** Folder under the roaming app data (`%APPDATA%`) that holds the save, whatever the package or product is called. */
export const USER_DATA_FOLDER = "grim-cubes";

/** `%APPDATA%\grim-cubes`: pinned so renaming the package or `productName` never moves (and loses) the save. */
export function userDataDir(appData: string): string {
	return join(appData, USER_DATA_FOLDER);
}

/** The only external page the page may ask the shell to open: the game's Steam store page (https, `/app/<id>`). */
export function isSteamStoreUrl(url: unknown): url is string {
	if (typeof url !== "string") return false;
	try {
		const parsed = new URL(url);
		return (
			parsed.protocol === "https:" &&
			parsed.hostname === "store.steampowered.com" &&
			/^\/app\/\d+(\/|$)/.test(parsed.pathname)
		);
	} catch {
		return false;
	}
}
