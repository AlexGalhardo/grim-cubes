import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Shop, type ShopViewModel } from "./Shop";

afterEach(cleanup);

const view: ShopViewModel = {
	gold: 50,
	rerollPrice: 11,
	slots: [
		{
			kind: "item",
			id: "rusted_plate",
			name: "Placa Enferrujada",
			lines: ["+3 armadura"],
			price: 23,
			tier: 1,
			locked: false,
			sold: false,
			affordable: true,
		},
		{
			kind: "weapon",
			id: "pistol",
			name: "Pistola de Ferro",
			lines: [],
			price: 60,
			tier: 1,
			locked: true,
			sold: false,
			affordable: false,
		},
		{
			kind: "upgrade",
			id: "sword",
			name: "Espada Enferrujada +",
			lines: [],
			price: 25,
			tier: 1,
			locked: false,
			sold: false,
			affordable: true,
		},
		{
			kind: "item",
			id: "grave_dirt",
			name: "Terra de Cova",
			lines: ["+10 HP máx"],
			price: 23,
			tier: 1,
			locked: false,
			sold: true,
			affordable: true,
		},
	],
};
const stats = [{ label: "Armadura", value: "0" }];

function actions() {
	return { buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() };
}

test("renders the four offers, their effect lines, gold and the stats", () => {
	render(<Shop view={view} stats={stats} actions={actions()} />);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByTestId("shop-slot-0").textContent).toContain("+3 armadura");
	expect(screen.getByTestId("shop-gold").textContent).toContain("50");
	expect(screen.getByText("Armadura")).toBeTruthy();
	expect(screen.getByTestId("shop-buy-3").textContent).toBe("Vendido");
});

test("buy, lock, reroll and next call their actions", () => {
	const a = actions();
	render(<Shop view={view} stats={stats} actions={a} />);
	fireEvent.click(screen.getByTestId("shop-buy-0"));
	fireEvent.click(screen.getByTestId("shop-lock-2"));
	fireEvent.click(screen.getByRole("button", { name: /Trocar itens/ }));
	fireEvent.click(screen.getByRole("button", { name: "Próximo round" }));
	expect(a.buy).toHaveBeenCalledWith(0);
	expect(a.toggleLock).toHaveBeenCalledWith(2);
	expect(a.reroll).toHaveBeenCalledTimes(1);
	expect(a.next).toHaveBeenCalledTimes(1);
});

test("keys 1-4 buy, R rerolls and Enter continues", () => {
	const a = actions();
	render(<Shop view={view} stats={stats} actions={a} />);
	fireEvent.keyDown(window, { key: "2" });
	fireEvent.keyDown(window, { key: "5" });
	fireEvent.keyDown(window, { code: "KeyR" });
	fireEvent.keyDown(window, { key: "Enter" });
	expect(a.buy.mock.calls).toEqual([[1]]);
	expect(a.reroll).toHaveBeenCalledTimes(1);
	expect(a.next).toHaveBeenCalledTimes(1);
});

test("the reroll button is disabled when the hero cannot pay", () => {
	render(<Shop view={{ ...view, gold: 5 }} stats={stats} actions={actions()} />);
	expect((screen.getByRole("button", { name: /Trocar itens/ }) as HTMLButtonElement).disabled).toBe(true);
});

test("starts the portrait on mount and stops it on unmount", () => {
	const start = vi.fn();
	const stop = vi.fn();
	const portrait = vi.fn(() => ({ start, stop }));
	const { unmount } = render(<Shop view={view} stats={[]} actions={actions()} portrait={portrait} />);
	expect(portrait).toHaveBeenCalledWith(screen.getByTestId("shop-portrait"));
	expect(start).toHaveBeenCalledTimes(1);
	expect(stop).not.toHaveBeenCalled();
	unmount();
	expect(stop).toHaveBeenCalledTimes(1);
});

test("has no portrait canvas without a factory", () => {
	render(<Shop view={view} stats={[]} actions={actions()} />);
	expect(screen.queryByTestId("shop-portrait")).toBeNull();
});

function stubShortScreen(short: boolean): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: short && query.includes("max-height"),
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}

test("the offers sit in two columns on short and tall screens", () => {
	for (const short of [true, false]) {
		stubShortScreen(short);
		render(<Shop view={view} stats={stats} actions={actions()} />);
		expect(screen.getByTestId("shop-grid").className).toContain("grid-cols-2");
		expect(screen.getByTestId("shop-side")).toBeTruthy();
		vi.unstubAllGlobals();
		cleanup();
	}
});

test("shows the hero, the weapon and the owned items with their counts", () => {
	render(
		<Shop
			view={{
				...view,
				hero: {
					level: 7,
					xp: 140,
					xpNeeded: 200,
					hp: 84,
					maxHp: 120,
					round: 3,
					bossRound: 10,
					souls: 18,
				},
				weapon: { name: "Espada Enferrujada", tier: 2, lines: ["Dano 12"] },
				items: [{ id: "rusted_plate", name: "Placa Enferrujada", tier: 1, count: 3 }],
				quote: "Ossos frescos.",
			}}
			stats={stats}
			actions={actions()}
		/>,
	);
	expect(screen.getByTestId("shop-hero").textContent).toContain("84 / 120");
	expect(screen.getByTestId("shop-weapon").textContent).toContain("Dano 12");
	expect(screen.getByTestId("shop-items").textContent).toContain("3");
	expect(screen.getByText(/Ossos frescos/)).toBeTruthy();
});

test("hovering an offer previews the stats it changes", () => {
	render(
		<Shop
			view={{
				...view,
				slots: view.slots.map((slot, i) =>
					i === 0 ? { ...slot, preview: { "statLine.armor": "3" } } : slot,
				),
			}}
			stats={[{ id: "statLine.armor", label: "Armadura", value: "0" }]}
			actions={actions()}
		/>,
	);
	// The first offer has the focus on open, so its preview shows for keyboard and pad players too.
	expect(screen.getByTestId("stat-preview").textContent).toContain("0 → 3");
	fireEvent.mouseEnter(screen.getByTestId("shop-slot-1"));
	expect(screen.queryByTestId("stat-preview")).toBeNull();
	fireEvent.mouseEnter(screen.getByTestId("shop-slot-0"));
	expect(screen.getByTestId("stat-preview").textContent).toContain("0 → 3");
});
