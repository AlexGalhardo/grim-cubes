/** A button of the standard mapping. */
const BUTTON_COUNT = 17;
const AXIS_COUNT = 4;

interface VirtualButton {
	pressed: boolean;
	touched: boolean;
	value: number;
}

export interface DebugGamepad {
	/** Makes `navigator.getGamepads()` report the virtual pad (standard mapping) instead of the real ones. */
	connect(): void;
	disconnect(): void;
	/** Holds button `index` (standard mapping: 0 A, 1 B, 9 Start, 12 to 15 D-pad). */
	press(index: number): void;
	release(index: number): void;
	/** Press, hold for `ms` so a frame sees it, release. */
	tap(index: number, ms?: number): Promise<void>;
	/** Sets stick axis `index` (0 and 1 left stick, 2 and 3 right stick) to a value from -1 to 1. */
	setAxis(index: number, value: number): void;
	/** Releases every button and centres every axis. */
	reset(): void;
	state(): { connected: boolean; buttons: number[]; axes: number[] };
}

/**
 * A virtual gamepad for tests and debugging (B-04-02): the page cannot be driven by a real controller in CI, so this
 * replaces `navigator.getGamepads` while connected and lets a script hold buttons and move sticks. Only built into
 * `__DEBUG_API__` builds.
 */
export function createDebugGamepad(nav: { getGamepads?: () => (Gamepad | null)[] }): DebugGamepad {
	const buttons: VirtualButton[] = Array.from({ length: BUTTON_COUNT }, () => ({
		pressed: false,
		touched: false,
		value: 0,
	}));
	const axes = Array.from({ length: AXIS_COUNT }, () => 0);
	const pad = {
		id: "Debug Pad (STANDARD GAMEPAD)",
		index: 0,
		connected: true,
		mapping: "standard",
		axes,
		buttons,
	};
	const real = nav.getGamepads?.bind(nav);
	let connected = false;
	Object.defineProperty(nav, "getGamepads", {
		configurable: true,
		value: () => (connected ? [pad as unknown as Gamepad] : (real?.() ?? [])),
	});
	const set = (index: number, down: boolean): void => {
		const button = buttons[index];
		if (!button) throw new RangeError(`no button ${index}`);
		button.pressed = down;
		button.touched = down;
		button.value = down ? 1 : 0;
	};
	return {
		connect: () => {
			connected = true;
		},
		disconnect: () => {
			connected = false;
		},
		press: (index) => set(index, true),
		release: (index) => set(index, false),
		tap: async (index, ms = 80) => {
			set(index, true);
			await new Promise((resolve) => setTimeout(resolve, ms));
			set(index, false);
			await new Promise((resolve) => setTimeout(resolve, ms));
		},
		setAxis: (index, value) => {
			if (index < 0 || index >= AXIS_COUNT) throw new RangeError(`no axis ${index}`);
			axes[index] = Math.max(-1, Math.min(1, value));
		},
		reset: () => {
			for (let i = 0; i < BUTTON_COUNT; i++) set(i, false);
			axes.fill(0);
		},
		state: () => ({
			connected,
			buttons: buttons.flatMap((b, i) => (b.pressed ? [i] : [])),
			axes: [...axes],
		}),
	};
}
