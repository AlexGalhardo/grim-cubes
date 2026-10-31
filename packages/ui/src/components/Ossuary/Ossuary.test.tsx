import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Ossuary, type OssuaryViewModel } from "./Ossuary";

afterEach(cleanup);

const view: OssuaryViewModel = {
	souls: 60,
	refund: 50,
	branches: [
		{
			id: "flesh",
			name: "Carne",
			nodes: [
				{ id: "flesh_1", lines: ["+10 HP máx"], cost: 50, state: "owned", affordable: true },
				{ id: "flesh_2", lines: ["+1 regen"], cost: 100, state: "available", affordable: false },
				{ id: "flesh_3", lines: ["+3 armadura"], cost: 200, state: "locked", affordable: false },
			],
		},
		{
			id: "steel",
			name: "Aço",
			nodes: [{ id: "steel_1", lines: ["+5% dano"], cost: 50, state: "available", affordable: true }],
		},
	],
};

function actions() {
	return { buy: vi.fn(), reset: vi.fn(), close: vi.fn() };
}

test("shows souls, branch names and node states", () => {
	render(<Ossuary view={view} actions={actions()} />);
	expect(screen.getByTestId("ossuary-souls").textContent).toContain("60");
	expect(screen.getByTestId("ossuary-node-flesh_1").getAttribute("data-state")).toBe("owned");
	expect(screen.getByTestId("ossuary-node-flesh_3").getAttribute("data-state")).toBe("locked");
	expect((screen.getByTestId("ossuary-node-flesh_3") as HTMLButtonElement).disabled).toBe(true);
});

test("only available nodes can be bought", () => {
	const a = actions();
	render(<Ossuary view={view} actions={a} />);
	fireEvent.click(screen.getByTestId("ossuary-node-flesh_1"));
	fireEvent.click(screen.getByTestId("ossuary-node-flesh_3"));
	expect(a.buy).not.toHaveBeenCalled();
	fireEvent.click(screen.getByTestId("ossuary-node-flesh_2"));
	expect(a.buy).toHaveBeenCalledWith("flesh_2");
});

test("every branch shows at once, linked node to node, with the reset warning", () => {
	render(<Ossuary view={view} actions={actions()} />);
	for (const branch of view.branches)
		expect(screen.getByTestId(`ossuary-branch-${branch.id}`)).toBeTruthy();
	expect(screen.queryByRole("tab")).toBeNull();
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
