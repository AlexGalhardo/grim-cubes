import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Menu, type MenuViewModel } from "./Menu";

afterEach(cleanup);

const view: MenuViewModel = {
	records: [
		{ id: "easy", name: "Fácil", round: 12 },
		{ id: "normal", name: "Normal", round: 0 },
	],
	continue: null,
};
const actions = () => ({ resume: vi.fn(), play: vi.fn(), ossuary: vi.fn(), options: vi.fn() });

test("New game is the large primary button and the others are smaller", () => {
	render(<Menu view={view} actions={actions()} />);
	const play = screen.getByTestId("menu-play");
	expect(play.className).toContain("btn-plate-primary");
	expect(play.className).toContain("min-h-12");
	expect(screen.getByRole("button", { name: "Ossuário" }).className).toContain("h-10");
});

test("with a save, Continue is the primary and New game steps down", () => {
	render(<Menu view={{ ...view, continue: { slotName: "Slot 1", runRound: 4 } }} actions={actions()} />);
	expect(screen.getByTestId("menu-continue").className).toContain("btn-plate-primary");
	expect(screen.getByTestId("menu-play").className).not.toContain("btn-plate-primary");
});

test("shows the record of each difficulty, or a dash when there is none", () => {
	render(<Menu view={view} actions={actions()} />);
	expect(screen.getByTestId("menu-record-easy").textContent).toBe("Round 12");
	expect(screen.getByTestId("menu-record-normal").textContent).toBe("—");
});

test("the DEMO seal shows only in the demo build", () => {
	const { rerender } = render(<Menu view={view} actions={actions()} />);
	expect(screen.queryByTestId("menu-demo")).toBeNull();
	rerender(<Menu view={view} actions={actions()} demo />);
	expect(screen.getByTestId("menu-demo").textContent).toBe("DEMO");
});

test("the embers are decorative and the reduced-motion rule stops them", async () => {
	render(<Menu view={view} actions={actions()} />);
	const embers = screen.getByTestId("menu-embers");
	expect(embers.getAttribute("aria-hidden")).toBe("true");
	expect(embers.children.length).toBeGreaterThan(0);
	expect(embers.children[0]?.className).toContain("animate-ember");
	const { readFileSync } = await import("node:fs");
	const css = readFileSync("packages/ui/src/theme.css", "utf8");
	expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*--animate-ember: none/);
});

test("the buttons call their actions", () => {
	const a = actions();
	render(<Menu view={view} actions={a} />);
	fireEvent.click(screen.getByTestId("menu-play"));
	fireEvent.click(screen.getByRole("button", { name: "Opções" }));
	expect(a.play).toHaveBeenCalledTimes(1);
	expect(a.options).toHaveBeenCalledTimes(1);
});
