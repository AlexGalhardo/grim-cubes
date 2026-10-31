import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Button } from "./Button";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

test("is a riveted plate with a primary variant and a taller base for the large size", () => {
	render(
		<>
			<Button testId="a">Ossuário</Button>
			<Button testId="b" variant="primary" size="lg">
				Jogar
			</Button>
		</>,
	);
	expect(screen.getByTestId("a").className).toContain("btn-plate");
	expect(screen.getByTestId("a").className).not.toContain("btn-plate-primary");
	expect(screen.getByTestId("b").className).toContain("btn-plate-primary");
	expect(screen.getByTestId("b").className).toContain("btn-plate-lg");
});

test("a confirm with no pointer holds the pressed look for a moment, a mouse click does not", () => {
	vi.useFakeTimers();
	const onClick = vi.fn();
	render(
		<Button testId="a" onClick={onClick}>
			Jogar
		</Button>,
	);
	const button = screen.getByTestId("a");
	expect(button.getAttribute("data-pressed")).toBe("false");
	fireEvent.click(button, { detail: 1 });
	expect(button.getAttribute("data-pressed")).toBe("false");
	fireEvent.click(button, { detail: 0 });
	expect(button.getAttribute("data-pressed")).toBe("true");
	act(() => {
		vi.advanceTimersByTime(120);
	});
	expect(button.getAttribute("data-pressed")).toBe("false");
	expect(onClick).toHaveBeenCalledTimes(2);
});

test("shows a visible focus ring and cannot be pressed while disabled", () => {
	const onClick = vi.fn();
	render(
		<Button testId="a" disabled onClick={onClick}>
			Jogar
		</Button>,
	);
	const button = screen.getByTestId("a") as HTMLButtonElement;
	expect(button.className).toContain("focus-visible:outline-ember");
	expect(button.disabled).toBe(true);
	fireEvent.click(button);
	expect(onClick).not.toHaveBeenCalled();
});
