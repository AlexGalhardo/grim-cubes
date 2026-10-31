import { type RefObject, useEffect, useRef } from "react";
import { createButtonEdge, createPadNav, type PadLike } from "./padNav";

const FOCUSABLE =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
}

/** Moves focus `delta` steps through the dialog's controls, wrapping around. */
export function moveFocus(root: HTMLElement, delta: number): void {
	const list = focusables(root);
	if (list.length === 0) return;
	const at = list.indexOf(document.activeElement as HTMLElement);
	const next = at < 0 ? (delta > 0 ? 0 : list.length - 1) : (at + delta + list.length) % list.length;
	list[next]?.focus();
}

/** Arrow keys keep their own meaning on sliders, dropdowns and text boxes. */
function ownsArrows(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.tagName === "SELECT" || target.tagName === "TEXTAREA") return true;
	if (target.tagName !== "INPUT") return false;
	const type = (target as HTMLInputElement).type;
	return type === "range" || type === "text";
}

const ARROWS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

export interface DialogNavOptions {
	/** Esc and the pad's B button. Omit for a screen that cannot be dismissed. */
	onCancel?: (() => void) | undefined;
	/** The screen's reroll (level-up, shop): the remapped keyboard key is handled by the screen itself. */
	onReroll?: (() => void) | undefined;
	/** Gamepad button of the reroll (standard mapping index); 2 (X) by default. */
	rerollButton?: number | undefined;
	/** Injected in tests; defaults to the first connected `navigator.getGamepads()` entry. */
	getPad?: (() => PadLike | null | undefined) | undefined;
}

/**
 * Keyboard and gamepad navigation for a modal screen (A-07-02): focus lands on the first control (or the one marked
 * `data-autofocus`) and returns to where it was on close; Tab stays inside; arrows move focus; Esc cancels; on a
 * pad, A clicks the focused control, B cancels and the D-pad or stick moves focus. Attach the returned ref to the
 * `role="dialog"` element.
 */
export function useDialogNav<T extends HTMLElement>(options: DialogNavOptions = {}): RefObject<T | null> {
	const ref = useRef<T>(null);
	const latest = useRef(options);
	latest.current = options;

	useEffect(() => {
		const root = ref.current;
		if (!root) return;
		const before = document.activeElement as HTMLElement | null;
		(root.querySelector<HTMLElement>("[data-autofocus]") ?? focusables(root)[0])?.focus();

		const onKey = (event: KeyboardEvent): void => {
			const step = ARROWS[event.key];
			if (event.key === "Escape" && latest.current.onCancel) {
				event.preventDefault();
				latest.current.onCancel();
			} else if (event.key === "Tab") {
				const list = focusables(root);
				const first = list[0];
				const last = list[list.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last?.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
			} else if (step !== undefined && !ownsArrows(event.target)) {
				event.preventDefault();
				moveFocus(root, step);
			}
		};
		root.addEventListener("keydown", onKey);

		const pad = createPadNav();
		const reroll = createButtonEdge();
		const getPad = (): PadLike | null | undefined => {
			if (latest.current.getPad) return latest.current.getPad();
			const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
			for (const candidate of pads) if (candidate?.connected) return candidate;
			return null;
		};
		let frame = 0;
		const tick = (now: number): void => {
			frame = requestAnimationFrame(tick);
			// Only the topmost screen listens, so a screen under another never reacts.
			const dialogs = document.querySelectorAll('[role="dialog"]');
			if (dialogs[dialogs.length - 1] !== root) return;
			const current = getPad();
			if (reroll.poll(current, latest.current.rerollButton ?? 2)) latest.current.onReroll?.();
			const action = pad.poll(current, now);
			if (action === "next") moveFocus(root, 1);
			else if (action === "prev") moveFocus(root, -1);
			else if (action === "cancel") latest.current.onCancel?.();
			else if (action === "confirm") {
				const active = document.activeElement;
				if (active instanceof HTMLElement && root.contains(active)) active.click();
			}
		};
		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			root.removeEventListener("keydown", onKey);
			if (before?.isConnected) before.focus();
		};
	}, []);

	return ref;
}
