import { join } from "node:path";
import { expect, test } from "vitest";
import { resolveAppPath } from "./paths";

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
