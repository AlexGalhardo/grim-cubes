import { clampUnit, type InputState } from "@gc/core";

export interface KeyBindings {
	up: readonly string[];
	down: readonly string[];
	left: readonly string[];
	right: readonly string[];
	dash: readonly string[];
	pause: readonly string[];
}

/** `KeyboardEvent.code` values, so the layout (AZERTY, Dvorak) does not matter. */
export const DEFAULT_BINDINGS: KeyBindings = {
	up: ["KeyW", "ArrowUp"],
	down: ["KeyS", "ArrowDown"],
	left: ["KeyA", "ArrowLeft"],
	right: ["KeyD", "ArrowRight"],
	dash: ["Space"],
	pause: ["Escape", "KeyP"],
};

export interface KeyboardSource {
	/** Overwrites the movement, dash and pause fields of `out` from the keys currently held. */
	poll(out: InputState): void;
	setBindings(bindings: KeyBindings): void;
	dispose(): void;
}

interface KeyLike extends Event {
	code?: string;
}

export function createKeyboardSource(
	target: EventTarget,
	initial: KeyBindings = DEFAULT_BINDINGS,
): KeyboardSource {
	const held = new Set<string>();
	let bindings = initial;
	const down = (e: Event): void => {
		const code = (e as KeyLike).code;
		if (code) held.add(code);
	};
	const up = (e: Event): void => {
		const code = (e as KeyLike).code;
		if (code) held.delete(code);
	};
	const clear = (): void => held.clear();
	target.addEventListener("keydown", down);
	target.addEventListener("keyup", up);
	target.addEventListener("blur", clear);

	const any = (codes: readonly string[]): boolean => {
		for (let i = 0; i < codes.length; i++) if (held.has(codes[i] as string)) return true;
		return false;
	};

	return {
		poll(out: InputState): void {
			out.moveX = (any(bindings.right) ? 1 : 0) - (any(bindings.left) ? 1 : 0);
			out.moveZ = (any(bindings.up) ? 1 : 0) - (any(bindings.down) ? 1 : 0);
			clampUnit(out);
			out.dash = any(bindings.dash);
			out.pause = any(bindings.pause);
		},
		setBindings(next: KeyBindings): void {
			bindings = next;
		},
		dispose(): void {
			target.removeEventListener("keydown", down);
			target.removeEventListener("keyup", up);
			target.removeEventListener("blur", clear);
			held.clear();
		},
	};
}
