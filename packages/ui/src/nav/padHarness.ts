import { vi } from "vitest";
import { focusables } from "./useDialogNav";

/**
 * A fake gamepad and animation-frame loop for tests of the dialogs' pad navigation: `press` holds buttons for one
 * frame, `tap` presses and releases them, so a dialog sees clean edges. Call `restore` when done.
 */
export function createPadHarness(
	id = "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)",
) {
	const frames: FrameRequestCallback[] = [];
	const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
	const pad = { id, connected: true, axes: [0, 0], buttons };
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal("cancelAnimationFrame", () => undefined);
	const original = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
	Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
	let now = 0;
	const frame = (): void => {
		now += 16;
		for (const cb of frames.splice(0)) cb(now);
	};
	const hold = (...down: number[]): void => {
		for (const [i, button] of buttons.entries()) button.pressed = down.includes(i);
	};
	return {
		/** One rendered frame with `down` held. */
		press(...down: number[]): void {
			hold(...down);
			frame();
		},
		/** A press and a release: one clean edge. */
		tap(...down: number[]): void {
			hold(...down);
			frame();
			hold();
			frame();
		},
		/** One neutral frame: the screen records the pad state. */
		idle(): void {
			hold();
			frame();
		},
		restore(): void {
			vi.unstubAllGlobals();
			if (original) Object.defineProperty(navigator, "getGamepads", original);
			else Reflect.deleteProperty(navigator, "getGamepads");
		},
	};
}

/** Every control of the dialog, in the order the D-pad visits them. */
export function controlsOf(dialog: HTMLElement): HTMLElement[] {
	return focusables(dialog);
}

/**
 * Walks the focus around the dialog with D-pad down (button 13) and returns the controls in the order they got focus,
 * stopping when it wraps back to the first. A screen is pad-navigable when this visits every control.
 */
export function walkWithDpad(pad: ReturnType<typeof createPadHarness>, dialog: HTMLElement): HTMLElement[] {
	const total = controlsOf(dialog).length;
	const visited: HTMLElement[] = [];
	const first = document.activeElement as HTMLElement;
	visited.push(first);
	for (let i = 0; i < total + 1; i++) {
		pad.tap(13);
		const now = document.activeElement as HTMLElement;
		if (now === first && visited.length > 1) break;
		visited.push(now);
	}
	return visited;
}
