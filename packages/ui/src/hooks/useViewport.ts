import { useSyncExternalStore } from "react";

/** Landscape phones and the 800x360 target: dialogs switch to their compact layout at or below this height. */
export const SHORT_SCREEN_PX = 420;
/** At or below this height the UI scale is capped (a 150% UI does not fit a 414 px screen). */
export const LOW_HEIGHT_PX = 414;
export const LOW_HEIGHT_MAX_SCALE = 125;

const SHORT_QUERY = `(max-height: ${SHORT_SCREEN_PX}px)`;

function subscribeShort(onChange: () => void): () => void {
	if (typeof window.matchMedia !== "function") return () => undefined;
	const query = window.matchMedia(SHORT_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

const shortSnapshot = (): boolean =>
	typeof window.matchMedia === "function" && window.matchMedia(SHORT_QUERY).matches;

/** Same threshold as the `desktop` breakpoint of theme.css, where the icons of offers and cards grow. */
const DESKTOP_QUERY = "(min-width: 1024px)";
export const isDesktopWidth = (): boolean =>
	typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches;

/** True on a short landscape screen: the dialogs use cards and offers that fit in a row. */
export function useShortScreen(): boolean {
	return useSyncExternalStore(subscribeShort, shortSnapshot, () => false);
}

function subscribeResize(onChange: () => void): () => void {
	window.addEventListener("resize", onChange);
	return () => window.removeEventListener("resize", onChange);
}

export const useViewportHeight = (): number =>
	useSyncExternalStore(
		subscribeResize,
		() => window.innerHeight,
		() => 1080,
	);

/** From this height up (2560x1440) the UI grows by 25%, so it keeps its 1080p proportions (Art Bible 17). */
export const XL_HEIGHT_PX = 1440;
export const XL_SCALE = 1.25;

/**
 * The scale actually applied: the chosen percent, capped to 125 on screens 414 px tall or less and enlarged by 25%
 * on screens 1440 px tall or more.
 */
export function effectiveUiScale(percent: number, viewportHeight: number): number {
	if (viewportHeight <= LOW_HEIGHT_PX) return Math.min(percent, LOW_HEIGHT_MAX_SCALE);
	return viewportHeight >= XL_HEIGHT_PX ? percent * XL_SCALE : percent;
}
