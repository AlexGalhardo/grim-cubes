import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Heroes, type HeroesViewModel } from "./Heroes";

afterEach(cleanup);

const view: HeroesViewModel = {
	selected: "executioner",
	heroes: [
		{
			id: "executioner",
			name: "Carrasco",
			tint: null,
			weapon: "Espada Enferrujada",
			passiveName: "Placas Enferrujadas",
			passiveLines: ["+1 armadura"],
			locked: false,
			requirement: "",
		},
		{
			id: "riddled",
			name: "O Fuzilado",
			tint: "iron-light",
			weapon: "Pistola de Ferro",
			passiveName: "Olho do Pelotão",
			passiveLines: ["+10% crítico"],
			locked: false,
			requirement: "",
		},
		{
			id: "penitent",
			name: "A Penitente",
			tint: "flesh",
			weapon: "Submetralhadora",
			passiveName: "Carne Flagelada",
			passiveLines: ["+1 regeneração"],
			locked: true,
			requirement: "Mate 3 chefes",
		},
	],
};

test("each card shows the weapon, the passive and, when locked, the unlock condition", () => {
	render(<Heroes view={view} actions={{ choose: vi.fn(), cancel: vi.fn() }} />);
	const riddled = screen.getByTestId("hero-riddled");
	expect(riddled.textContent).toContain("Pistola de Ferro");
	expect(riddled.textContent).toContain("Olho do Pelotão");
	expect(riddled.textContent).toContain("+10% crítico");
	const locked = screen.getByTestId("hero-penitent") as HTMLButtonElement;
	expect(locked.disabled).toBe(true);
	expect(screen.getByTestId("hero-requirement-penitent").textContent).toContain("Mate 3 chefes");
	expect(screen.queryByTestId("hero-requirement-riddled")).toBeNull();
});

test("a recoloured hero tints its portrait with a theme token; the Carrasco does not", () => {
	render(<Heroes view={view} actions={{ choose: vi.fn(), cancel: vi.fn() }} />);
	const tinted = screen.getByTestId("hero-portrait-riddled").firstElementChild as HTMLElement | null;
	expect(tinted?.style.backgroundColor).toBe("var(--color-iron-light)");
	expect(screen.getByTestId("hero-portrait-executioner").firstElementChild).toBeNull();
});

test("choose passes the picked hero; a locked hero cannot be picked", () => {
	const choose = vi.fn();
	render(<Heroes view={view} actions={{ choose, cancel: vi.fn() }} />);
	fireEvent.click(screen.getByTestId("hero-penitent"));
	fireEvent.click(screen.getByTestId("heroes-start"));
	expect(choose).toHaveBeenLastCalledWith("executioner");
	fireEvent.click(screen.getByTestId("hero-riddled"));
	expect(screen.getByTestId("hero-riddled").getAttribute("aria-pressed")).toBe("true");
	fireEvent.click(screen.getByTestId("heroes-start"));
	expect(choose).toHaveBeenLastCalledWith("riddled");
});

test("Esc and Back cancel", () => {
	const actions = { choose: vi.fn(), cancel: vi.fn() };
	render(<Heroes view={view} actions={actions} />);
	fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(actions.cancel).toHaveBeenCalledTimes(2);
});
