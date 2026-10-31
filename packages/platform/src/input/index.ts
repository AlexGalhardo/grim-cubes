import { clampUnit, createInputState, type InputState, type VirtualStick } from "@gc/core";
import { type GamepadLike, type PadBindings, readGamepad } from "./gamepad";
import { createKeyboardSource, type KeyBindings, type KeyboardSource } from "./keyboard";

export interface InputSourcesOptions {
	target: EventTarget;
	/** Usually `() => navigator.getGamepads()`; injectable for tests. */
	getGamepads?: () => ArrayLike<GamepadLike | null>;
	stick?: VirtualStick;
	bindings?: KeyBindings;
	padBindings?: PadBindings;
}

export interface InputSources {
	/** Polls every source once and merges them into `state`; the strongest movement wins. */
	poll(state: InputState): void;
	readonly keyboard: KeyboardSource;
	/** Applies a new gamepad button remap at once. */
	setPadBindings(bindings: PadBindings): void;
	dispose(): void;
}

export function createInputSources(options: InputSourcesOptions): InputSources {
	const keyboard = createKeyboardSource(options.target, options.bindings);
	const key = createInputState();
	const pad = createInputState();
	let padBindings = options.padBindings;

	return {
		keyboard,
		setPadBindings(next): void {
			padBindings = next;
		},
		poll(state: InputState): void {
			keyboard.poll(key);
			let moveX = key.moveX;
			let moveZ = key.moveZ;
			let dash = key.dash;
			let pause = key.pause;

			const pads = options.getGamepads?.();
			for (let i = 0; pads && i < pads.length; i++) {
				const connected = pads[i];
				if (!connected) continue;
				readGamepad(connected, pad, undefined, padBindings);
				if (Math.hypot(pad.moveX, pad.moveZ) > Math.hypot(moveX, moveZ)) {
					moveX = pad.moveX;
					moveZ = pad.moveZ;
				}
				dash ||= pad.dash;
				pause ||= pad.pause;
			}

			const stick = options.stick;
			if (stick?.active && Math.hypot(stick.x, stick.z) > Math.hypot(moveX, moveZ)) {
				moveX = stick.x;
				moveZ = stick.z;
			}

			state.moveX = moveX;
			state.moveZ = moveZ;
			clampUnit(state);
			state.dash = dash;
			state.pause = pause;
		},
		dispose: keyboard.dispose,
	};
}

export type { GamepadLike, PadBindings } from "./gamepad";
export { applyDeadZone, DEAD_ZONE, DEFAULT_PAD_BINDINGS, readGamepad } from "./gamepad";
export type { KeyBindings, KeyboardSource } from "./keyboard";
export { createKeyboardSource, DEFAULT_BINDINGS } from "./keyboard";
