import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SpellBar, type SpellsView } from "./SpellBar";

afterEach(cleanup);

const view = (over: Partial<SpellsView> = {}): SpellsView => ({
	healName: "Fôlego de Guerra",
	superName: "Redemoinho de Aço",
	healFill: 1,
	healReady: true,
	superFill: 0.42,
	superReady: false,
	superActive: false,
	superKills: 42,
	superNeeded: 100,
	healKey: "KeyE",
	superKey: "KeyQ",
	padHeal: 1,
	padSuper: 3,
	...over,
});

test("shows both buttons with their hints, and the super charge as kills over the kills needed", () => {
	render(<SpellBar view={view()} healHint="E" superHint="Q" touch={false} onHold={() => {}} />);
	expect(screen.getByTestId("spell-heal").getAttribute("aria-label")).toBe("Fôlego de Guerra, E");
	expect(screen.getByTestId("spell-super").getAttribute("aria-label")).toBe("Redemoinho de Aço, Q");
	const bar = screen.getByTestId("super-charge");
	expect(bar.getAttribute("aria-valuenow")).toBe("42");
	expect(bar.getAttribute("aria-valuemax")).toBe("100");
	expect(screen.getByTestId("spell-bar").textContent).toContain("42/100");
	expect(screen.getByTestId("spell-heal").getAttribute("data-ready")).toBe("true");
	expect(screen.getByTestId("spell-super").getAttribute("data-ready")).toBe("false");
});

test("the next charge reads 105 after a cast, and a running super says so", () => {
	const { rerender } = render(
		<SpellBar
			view={view({ superKills: 3, superNeeded: 105 })}
			healHint="E"
			superHint="Q"
			touch
			onHold={() => {}}
		/>,
	);
	expect(screen.getByTestId("spell-bar").textContent).toContain("3/105");
	rerender(
		<SpellBar
			view={view({ superActive: true, superReady: false })}
			healHint="E"
			superHint="Q"
			touch
			onHold={() => {}}
		/>,
	);
	expect(screen.getByTestId("spell-bar").textContent).toContain("Ativa");
});

test("each button reports held and released on its own, for touch and mouse", () => {
	const onHold = vi.fn();
	render(<SpellBar view={view()} healHint="E" superHint="Q" touch onHold={onHold} />);
	fireEvent.pointerDown(screen.getByTestId("spell-heal"));
	fireEvent.pointerUp(screen.getByTestId("spell-heal"));
	fireEvent.pointerDown(screen.getByTestId("spell-super"));
	fireEvent.pointerCancel(screen.getByTestId("spell-super"));
	expect(onHold.mock.calls).toEqual([
		["heal", true],
		["heal", false],
		["super", true],
		["super", false],
	]);
});

test("on touch the bar sits left of the dash button, on desktop at the bottom centre", () => {
	const { rerender } = render(
		<SpellBar view={view()} healHint="E" superHint="Q" touch onHold={() => {}} />,
	);
	expect(screen.getByTestId("spell-bar").className).toContain("right-28");
	rerender(<SpellBar view={view()} healHint="E" superHint="Q" touch={false} onHold={() => {}} />);
	expect(screen.getByTestId("spell-bar").className).toContain("left-1/2");
});
