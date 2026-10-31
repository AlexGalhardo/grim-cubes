import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { resolveAppPath, USER_DATA_FOLDER, userDataDir } from "./paths";

const root = join("C:", "game", "dist");

test("the root serves index.html and assets resolve under dist", () => {
	expect(resolveAppPath("/", root)).toBe(join(root, "index.html"));
	expect(resolveAppPath("/assets/audio/mus_menu.mp3", root)).toBe(
		join(root, "assets", "audio", "mus_menu.mp3"),
	);
	expect(resolveAppPath("/assets/a%20b.png", root)).toBe(join(root, "assets", "a b.png"));
});

test("a path that climbs out of dist is refused", () => {
	expect(resolveAppPath("/../secret.txt", root)).toBeNull();
	expect(resolveAppPath("/assets/../../secret.txt", root)).toBeNull();
	expect(resolveAppPath("/%2e%2e/secret.txt", root)).toBeNull();
});

test("a malformed percent escape is refused instead of throwing", () => {
	expect(resolveAppPath("/assets/%E0%A4%A", root)).toBeNull();
	expect(resolveAppPath("/%", root)).toBeNull();
});

test("the user data folder is pinned under the roaming app data, whatever the package is called", () => {
	expect(USER_DATA_FOLDER).toBe("grim-cubes");
	expect(userDataDir(join("C:", "Users", "x", "AppData", "Roaming"))).toBe(
		join("C:", "Users", "x", "AppData", "Roaming", "grim-cubes"),
	);
	// The main process pins it before the app is ready, and the Steam checklist names the same folder.
	const main = readFileSync("apps/electron/src/main.ts", "utf8");
	const pin = main.indexOf('app.setPath("userData", userDataDir(app.getPath("appData")))');
	expect(pin).toBeGreaterThan(-1);
	expect(pin).toBeLessThan(main.indexOf("app.whenReady()"));
	expect(pin).toBeLessThan(main.indexOf("registerStorageIpc("));
	const checklist = readFileSync("docs/release/steam-launch-checklist.md", "utf8");
	expect(checklist).toContain("%APPDATA%\\grim-cubes\\saves");
});
