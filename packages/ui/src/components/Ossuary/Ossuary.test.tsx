import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Ossuary, type OssuaryViewModel } from "./Ossuary";

afterEach(cleanup);

const node = (
	spell: string,
	level: number,
	state: "owned" | "available" | "locked" | "demo",
	cost: number,
	affordable = true,
) => ({ id: `${spell}_${level}`, level, lines: [`Nível ${level}`, "+15% de dano"], cost, state, affordable });

const view: OssuaryViewModel = {
	souls: 60,
	refund: 20,
	classes: [
		{ id: "warrior", name: "Warrior" },
		{ id: "mage", name: "Mago" },
	],
	selectedClass: "warrior",
	branches: [
		{
			id: "warrior_shockwave",
			name: "Onda de Choque",
			kind: "auto",
			theme: "Automática",
			level: 2,
			nodes: [
				node("warrior_shockwave", 2, "owned", 20),
				node("warrior_shockwave", 3, "available", 35, false),
				node("warrior_shockwave", 4, "locked", 55, false),
			],
		},
		{
			id: "warrior_mend",
			name: "Fôlego de Guerra",
			kind: "heal",
			level: 1,
			nodes: [node("warrior_mend", 2, "available", 20)],
		},
	],
};

function actions() {
	return { buy: vi.fn(), reset: vi.fn(), close: vi.fn(), selectClass: vi.fn() };
}

test("shows souls, the spell columns with their level and the square states", () => {
	render(<Ossuary view={view} actions={actions()} />);
	expect(screen.getByTestId("ossuary-souls").textContent).toContain("60");
	expect(screen.getByTestId("ossuary-level-warrior_shockwave").textContent).toBe("Nível 2");
	expect(screen.getByTestId("ossuary-node-warrior_shockwave_2").getAttribute("data-state")).toBe("owned");
	expect(screen.getByTestId("ossuary-node-warrior_shockwave_4").getAttribute("data-state")).toBe("locked");
	expect((screen.getByTestId("ossuary-node-warrior_shockwave_4") as HTMLButtonElement).disabled).toBe(true);
});

test("bought, buyable and locked differ without colour: words, frame shape and marks", () => {
	render(<Ossuary view={view} actions={actions()} />);
	const owned = screen.getByTestId("ossuary-node-warrior_shockwave_2");
	const buyable = screen.getByTestId("ossuary-node-warrior_mend_2");
	const locked = screen.getByTestId("ossuary-node-warrior_shockwave_4");
	expect(owned.textContent).toContain("✓");
	expect(owned.textContent).toContain("Comprado");
	expect(buyable.textContent).toContain("☠ 20");
	expect(buyable.textContent).not.toContain("▣");
	expect(locked.textContent).toContain("▣");
	expect(locked.textContent).toContain("Bloqueado");
	expect(locked.className).toContain("border-dashed");
	expect(owned.className).not.toContain("border-dashed");
	expect(buyable.className).not.toContain("border-dashed");
	for (const square of [owned, buyable, locked]) expect(square.className).not.toContain("opacity-");
});

test("only available squares can be bought", () => {
	const a = actions();
	render(<Ossuary view={view} actions={a} />);
	fireEvent.click(screen.getByTestId("ossuary-node-warrior_shockwave_2"));
	fireEvent.click(screen.getByTestId("ossuary-node-warrior_shockwave_4"));
	expect(a.buy).not.toHaveBeenCalled();
	fireEvent.click(screen.getByTestId("ossuary-node-warrior_shockwave_3"));
	expect(a.buy).toHaveBeenCalledWith("warrior_shockwave_3");
});

test("a tab per class: the selected one is marked and another one can be picked", () => {
	const a = actions();
	render(<Ossuary view={view} actions={a} />);
	const tabs = screen.getAllByRole("tab");
	expect(tabs.map((tab) => [tab.textContent, tab.getAttribute("aria-selected")])).toEqual([
		["Warrior", "true"],
		["Mago", "false"],
	]);
	fireEvent.click(screen.getByTestId("ossuary-class-mage"));
	expect(a.selectClass).toHaveBeenCalledWith("mage");
});

test("every column of the class shows at once, with the reset warning", () => {
	render(<Ossuary view={view} actions={actions()} />);
	for (const branch of view.branches)
		expect(screen.getByTestId(`ossuary-branch-${branch.id}`)).toBeTruthy();
	expect(screen.getByText(/Devolve/)).toBeTruthy();
});

test("reset and close call their actions; reset is off with nothing to refund", () => {
	const a = actions();
	const { rerender } = render(<Ossuary view={view} actions={a} />);
	fireEvent.click(screen.getByRole("button", { name: /Resetar/ }));
	fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
	expect(a.reset).toHaveBeenCalledTimes(1);
	expect(a.close).toHaveBeenCalledTimes(1);
	rerender(<Ossuary view={{ ...view, refund: 0 }} actions={a} />);
	expect((screen.getByRole("button", { name: /Resetar/ }) as HTMLButtonElement).disabled).toBe(true);
});
