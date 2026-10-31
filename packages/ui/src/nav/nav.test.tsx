import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createPadNav, type PadLike } from "./padNav";
import { useDialogNav } from "./useDialogNav";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const pad = (pressed: number[] = [], axes: number[] = [0, 0]): PadLike => ({
	axes,
	buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) })),
});

test("A and B fire on the press edge only", () => {
	const nav = createPadNav();
	expect(nav.poll(pad([0]), 0)).toBe("confirm");
	expect(nav.poll(pad([0]), 16)).toBeNull();
	expect(nav.poll(pad(), 32)).toBeNull();
	expect(nav.poll(pad([1]), 48)).toBe("cancel");
	expect(nav.poll(pad([1]), 64)).toBeNull();
});

test("a held direction moves once, waits, then repeats", () => {
	const nav = createPadNav();
	expect(nav.poll(pad([13]), 0)).toBe("next");
	expect(nav.poll(pad([13]), 100)).toBeNull();
	expect(nav.poll(pad([13]), 400)).toBe("next");
	expect(nav.poll(pad([13]), 450)).toBeNull();
	expect(nav.poll(pad([13]), 550)).toBe("next");
	expect(nav.poll(pad([]), 560)).toBeNull();
	expect(nav.poll(pad([12]), 570)).toBe("prev");
	expect(nav.poll(pad([], [0, -0.9]), 1000)).toBe("prev");
	expect(nav.poll(pad([], [0.3, 0.3]), 1100)).toBeNull();
	expect(nav.poll(null, 1200)).toBeNull();
});

function Screen({ onCancel, getPad }: { onCancel?: () => void; getPad?: () => PadLike | null }) {
	const ref = useDialogNav<HTMLDivElement>({ onCancel, getPad });
	return (
		<div ref={ref} role="dialog">
			<button type="button">one</button>
			<button type="button">two</button>
			<input type="range" aria-label="volume" />
			<button type="button" disabled>
				off
			</button>
			<button type="button">three</button>
		</div>
	);
}

test("focus starts on the first control, arrows move it, Tab wraps and Esc cancels", () => {
	const onCancel = vi.fn();
	render(<Screen onCancel={onCancel} />);
	const [one, two, three] = ["one", "two", "three"].map((name) => screen.getByRole("button", { name }));
	expect(document.activeElement).toBe(one);
	fireEvent.keyDown(one as HTMLElement, { key: "ArrowDown" });
	expect(document.activeElement).toBe(two);
	fireEvent.keyDown(two as HTMLElement, { key: "ArrowDown" });
	expect(document.activeElement).toBe(screen.getByLabelText("volume"));
	// A slider keeps its arrows.
	fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowRight" });
	expect(document.activeElement).toBe(screen.getByLabelText("volume"));
	fireEvent.keyDown(screen.getByLabelText("volume"), { key: "ArrowUp" });
	three?.focus();
	fireEvent.keyDown(three as HTMLElement, { key: "Tab" });
	expect(document.activeElement).toBe(one);
	fireEvent.keyDown(one as HTMLElement, { key: "Tab", shiftKey: true });
	expect(document.activeElement).toBe(three);
	fireEvent.keyDown(three as HTMLElement, { key: "Escape" });
	expect(onCancel).toHaveBeenCalledTimes(1);
});

test("a screen without onCancel ignores Esc and focus returns to the opener on close", () => {
	const opener = document.createElement("button");
	document.body.append(opener);
	opener.focus();
	const { unmount } = render(<Screen />);
	fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
	expect(screen.getByRole("dialog")).toBeTruthy();
	unmount();
	expect(document.activeElement).toBe(opener);
	opener.remove();
});

test("on a gamepad, the D-pad moves focus, A clicks and B cancels", () => {
	const frames: FrameRequestCallback[] = [];
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
	vi.stubGlobal("cancelAnimationFrame", () => undefined);
	let state = pad();
	const onCancel = vi.fn();
	const clicked = vi.fn();
	render(
		<div>
			<Screen onCancel={onCancel} getPad={() => state} />
		</div>,
	);
	screen.getByRole("button", { name: "two" }).addEventListener("click", clicked);
	const tick = (now: number): void => {
		const next = frames.splice(0);
		for (const cb of next) cb(now);
	};
	state = pad([13]);
	tick(0);
	expect(document.activeElement).toBe(screen.getByRole("button", { name: "two" }));
	state = pad([0]);
	tick(100);
	expect(clicked).toHaveBeenCalledTimes(1);
	state = pad([1]);
	tick(200);
	expect(onCancel).toHaveBeenCalledTimes(1);
});
