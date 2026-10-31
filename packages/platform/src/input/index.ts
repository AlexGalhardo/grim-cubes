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
	/** True while `button` (standard mapping index) is down on any connected gamepad. */
	padButton(button: number): boolean;
	/** True while any gamepad button is down or a stick is pushed: the player is using the pad. */
	padActive(): boolean;
	dispose(): void;
}

export function createInputSources(options: InputSourcesOptions): InputSources {
	const keyboard = createKeyboardSource(options.target, options.bindings);
	const key = createInputState();
	const pad = createInputState();
	let padBindings = options.padBindings;
	// `getGamepads()` allocates: read it once per `poll` and let the helpers below use that snapshot.
	let pads: ArrayLike<GamepadLike | null> | undefined;

	return {
		keyboard,
		setPadBindings(next): void {
			padBindings = next;
		},
		padButton(button): boolean {
			for (let i = 0; pads && i < pads.length; i++) {
				if (pads[i]?.buttons[button]?.pressed === true) return true;
			}
			return false;
		},
		padActive(): boolean {
			for (let i = 0; pads && i < pads.length; i++) {
				const connected = pads[i];
				if (!connected) continue;
				if (connected.buttons.some((b) => b.pressed)) return true;
				if (Math.hypot(connected.axes[0] ?? 0, connected.axes[1] ?? 0) > 0.5) return true;
			}
			return false;
		},
		poll(state: InputState): void {
			keyboard.poll(key);
			let moveX = key.moveX;
			let moveZ = key.moveZ;
			let dash = key.dash;
			let pause = key.pause;

			pads = options.getGamepads?.();
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
