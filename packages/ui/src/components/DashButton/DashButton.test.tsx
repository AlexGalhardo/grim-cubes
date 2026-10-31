import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DashButton } from "./DashButton";

afterEach(cleanup);

test("holding reports down on press and up on release or cancel", () => {
	const onHold = vi.fn();
	render(<DashButton view={{ charges: 1, max: 1, recharge: 1 }} onHold={onHold} />);
	const button = screen.getByTestId("dash-button");
	fireEvent.pointerDown(button);
	fireEvent.pointerUp(button);
	fireEvent.pointerDown(button);
	fireEvent.pointerCancel(button);
	expect(onHold.mock.calls.map((c) => c[0])).toEqual([true, false, true, false]);
});

test("shows charges only with more than one and the recharge progress", () => {
	const { rerender } = render(
		<DashButton view={{ charges: 0, max: 2, recharge: 0.5 }} onHold={() => {}} />,
	);
	const button = screen.getByTestId("dash-button");
	expect(button.textContent).toBe("0/2");
	expect(button.getAttribute("data-charges")).toBe("0");
	expect(button.querySelector<HTMLElement>("span:last-child")?.style.transform).toBe("scaleX(0.5)");
	rerender(<DashButton view={{ charges: 1, max: 1, recharge: 1 }} onHold={() => {}} />);
	expect(button.textContent).toBe("Dash");
});
