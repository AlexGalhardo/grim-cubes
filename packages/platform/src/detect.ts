export type Runtime = "web" | "electron" | "capacitor";

export interface PlatformInfo {
	runtime: Runtime;
	mobile: boolean;
	touch: boolean;
}

/** The slice of `globalThis` that detection reads; injectable for tests. */
export interface PlatformScope {
	navigator?: { userAgent: string; maxTouchPoints?: number };
	Capacitor?: { isNativePlatform(): boolean };
}

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

export function detectPlatform(scope: PlatformScope = globalThis): PlatformInfo {
	const userAgent = scope.navigator?.userAgent ?? "";
	const native = scope.Capacitor?.isNativePlatform() === true;
	const runtime: Runtime = native ? "capacitor" : /\bElectron\//.test(userAgent) ? "electron" : "web";
	return {
		runtime,
		mobile: native || MOBILE_UA.test(userAgent),
		touch: (scope.navigator?.maxTouchPoints ?? 0) > 0,
	};
}
