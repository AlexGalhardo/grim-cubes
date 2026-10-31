import { expect, test } from "vitest";
import { detectPlatform } from "./detect";

test("defaults to desktop web without a navigator", () => {
	expect(detectPlatform({})).toEqual({ runtime: "web", mobile: false, touch: false });
});

test("detects electron by user agent", () => {
	const info = detectPlatform({ navigator: { userAgent: "Mozilla/5.0 Electron/41.0.0 Chrome/140" } });
	expect(info.runtime).toBe("electron");
	expect(info.mobile).toBe(false);
});

test("detects capacitor and mobile touch", () => {
	const info = detectPlatform({
		navigator: { userAgent: "Mozilla/5.0 (Linux; Android 14)", maxTouchPoints: 5 },
		Capacitor: { isNativePlatform: () => true },
	});
	expect(info).toEqual({ runtime: "capacitor", mobile: true, touch: true });
});
