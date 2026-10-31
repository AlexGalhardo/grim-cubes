import { clampUnit, createPadMap, type InputState, padBindingsFor } from "@gc/core";

/** The slice of the Gamepad API that mapping reads. */
export interface GamepadLike {
	/** `Gamepad.id`: the controller's name and, in Chrome, its USB vendor and product. */
	id?: string;
	axes: readonly number[];
	buttons: readonly { pressed: boolean }[];
}

export const DEAD_ZONE = 0.2;

/** Buttons that dash and pause (`padBindingsFor` of the Options remap); the defaults are A or RB, and Start. */
export interface PadBindings {
	dash: readonly number[];
	pause: readonly number[];
}

export const DEFAULT_PAD_BINDINGS: PadBindings = padBindingsFor(createPadMap());

const BUTTON_DPAD_UP = 12;
const BUTTON_DPAD_DOWN = 13;
const BUTTON_DPAD_LEFT = 14;
const BUTTON_DPAD_RIGHT = 15;

/** Radial dead zone, rescaled so the output still reaches 1 at full tilt. */
export function applyDeadZone(x: number, y: number, deadZone: number, out: { x: number; y: number }): void {
	const length = Math.hypot(x, y);
	if (length <= deadZone) {
		out.x = 0;
		out.y = 0;
		return;
	}
	const scale = Math.min((length - deadZone) / (1 - deadZone), 1) / length;
	out.x = x * scale;
	out.y = y * scale;
}

const scratch = { x: 0, y: 0 };

const pressed = (pad: GamepadLike, i: number): boolean => pad.buttons[i]?.pressed === true;

/** Reads the left stick and D-pad into `out`. Stick up (axis y = -1) becomes +z. */
export function readGamepad(
	pad: GamepadLike,
	out: InputState,
	deadZone = DEAD_ZONE,
	bindings: PadBindings = DEFAULT_PAD_BINDINGS,
): void {
	applyDeadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, deadZone, scratch);
	out.moveX = scratch.x;
	out.moveZ = 0 - scratch.y;
	const dpad =
		pressed(pad, BUTTON_DPAD_LEFT) ||
		pressed(pad, BUTTON_DPAD_RIGHT) ||
		pressed(pad, BUTTON_DPAD_UP) ||
		pressed(pad, BUTTON_DPAD_DOWN);
	if (dpad) {
		out.moveX = (pressed(pad, BUTTON_DPAD_RIGHT) ? 1 : 0) - (pressed(pad, BUTTON_DPAD_LEFT) ? 1 : 0);
		out.moveZ = (pressed(pad, BUTTON_DPAD_UP) ? 1 : 0) - (pressed(pad, BUTTON_DPAD_DOWN) ? 1 : 0);
		clampUnit(out);
	}
	out.dash = bindings.dash.some((button) => pressed(pad, button));
	out.pause = bindings.pause.some((button) => pressed(pad, button));
}
