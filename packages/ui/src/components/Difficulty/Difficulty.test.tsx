import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Difficulty, type DifficultyViewModel } from "./Difficulty";

afterEach(cleanup);

const view: DifficultyViewModel = {
	selected: "normal",
	options: [
		{ id: "normal", name: "Normal", summary: "Base", locked: false, requirement: "" },
		{ id: "grim", name: "Sombrio", summary: "HP e dano ×1,25", locked: false, requirement: "" },
		{
			id: "nightmare",
			name: "Pesadelo",
			summary: "×1,5",
			locked: true,
			requirement: "Recorde Sombrio ≥ 20",
		},
	],
};

test("a locked difficulty shows why and cannot be picked", () => {
	render(<Difficulty view={view} actions={{ start: vi.fn(), cancel: vi.fn() }} />);
	const locked = screen.getByTestId("difficulty-nightmare") as HTMLButtonElement;
	expect(locked.disabled).toBe(true);
	expect(locked.textContent).toContain("Recorde Sombrio ≥ 20");
});

test("start passes the picked difficulty and the typed seed", () => {
	const start = vi.fn();
	render(<Difficulty view={view} actions={{ start, cancel: vi.fn() }} />);
	fireEvent.click(screen.getByTestId("difficulty-grim"));
	fireEvent.change(screen.getByTestId("difficulty-seed"), { target: { value: "coveiro" } });
	fireEvent.click(screen.getByRole("button", { name: "Começar" }));
	expect(start).toHaveBeenCalledWith("grim", "coveiro", false);
});

test("start without a seed passes an empty text and cancel closes", () => {
	const actions = { start: vi.fn(), cancel: vi.fn() };
	render(<Difficulty view={view} actions={actions} />);
	fireEvent.click(screen.getByRole("button", { name: "Começar" }));
	expect(actions.start).toHaveBeenCalledWith("normal", "", false);
	fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
	expect(actions.cancel).toHaveBeenCalledTimes(1);
});

test("the tutorial checkbox is passed to start", () => {
	const start = vi.fn();
	render(<Difficulty view={view} actions={{ start, cancel: vi.fn() }} />);
	fireEvent.click(screen.getByTestId("difficulty-tutorial"));
	fireEvent.click(screen.getByRole("button", { name: "Começar" }));
	expect(start).toHaveBeenCalledWith("normal", "", true);
});
