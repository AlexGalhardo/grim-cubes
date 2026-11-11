import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

test("shows the Merchant portrait", () => {
	render(<Shop view={view} stats={[]} actions={actions()} />);
	expect(screen.getByTestId("shop-portrait").className).toContain("merchant.webp");
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
					i === 0
						? {
								...slot,
								preview: { "statLine.armor": { after: "3", delta: "+3", better: true } },
							}
						: slot,
				),
			}}
			stats={[{ id: "statLine.armor", label: "Armadura", value: "0" }]}
			actions={actions()}
		/>,
	);
	// The first offer has the focus on open, so its preview shows for keyboard and pad players too.
	expect(screen.getByTestId("stat-preview").textContent).toContain("0 → 3");
	expect(screen.getByTestId("shop-delta-statLine.armor").textContent).toBe("(+3)");
	fireEvent.mouseEnter(screen.getByTestId("shop-slot-1"));
	expect(screen.queryByTestId("stat-preview")).toBeNull();
	fireEvent.mouseEnter(screen.getByTestId("shop-slot-0"));
	expect(screen.getByTestId("stat-preview").textContent).toContain("0 → 3");
});

const iconRef = { url: "a.png", x: 0, y: 0, w: 32, h: 32, atlasWidth: 64, atlasHeight: 64 };

test("a weapon offer shows its own icon, damage and attacks per second; an item offer shows its effect", () => {
	const offers: ShopViewModel = {
		...view,
		slots: [
			{
				...view.slots[1],
				kind: "weapon",
				lines: ["Dano 10", "2 ataques/s"],
				icon: iconRef,
			},
			{ ...view.slots[0], kind: "item", lines: ["+3 armadura", "Dash: recarga −1 s"], icon: iconRef },
		] as ShopViewModel["slots"],
	};
	render(<Shop view={offers} stats={stats} actions={actions()} />);
	const weapon = screen.getByTestId("shop-slot-0");
	expect(weapon.textContent).toContain("Dano 10");
	expect(weapon.textContent).toContain("2 ataques/s");
	const item = screen.getByTestId("shop-slot-1");
	expect(item.textContent).toContain("+3 armadura");
	expect(item.textContent).toContain("Dash: recarga −1 s");
	expect(screen.getAllByTestId("icon")).toHaveLength(2);
	expect(screen.getByTestId("shop-grid").textContent).not.toContain("⚔");
});

test("the delta is green when better and red when worse, and follows keyboard and pad focus", () => {
	const slot = (i: number): ShopViewModel["slots"][number] => ({
		...(view.slots[i] as ShopViewModel["slots"][number]),
		preview: {
			"statLine.armor": { after: "3", delta: "+3", better: true },
			"statLine.speed": { after: "5", delta: "−1", better: false },
		},
	});
	render(
		<Shop
			view={{ ...view, slots: [view.slots[0] as ShopViewModel["slots"][number], slot(2)] }}
			stats={[
				{ id: "statLine.armor", label: "Armadura", value: "0" },
				{ id: "statLine.speed", label: "Velocidade", value: "6" },
			]}
			actions={actions()}
		/>,
	);
	expect(screen.queryByTestId("shop-delta-statLine.armor")).toBeNull();
	// Tab and the D-pad both move the DOM focus; the preview follows it.
	fireEvent.focus(screen.getByTestId("shop-buy-1"));
	expect(screen.getByTestId("shop-delta-statLine.armor").textContent).toBe("(+3)");
	expect(screen.getByTestId("shop-delta-statLine.armor").className).toContain("text-heal");
	expect(screen.getByTestId("shop-delta-statLine.speed").textContent).toBe("(−1)");
	expect(screen.getByTestId("shop-delta-statLine.speed").className).toContain("text-danger");
	fireEvent.blur(screen.getByTestId("shop-buy-1"));
	expect(screen.queryByTestId("shop-delta-statLine.armor")).toBeNull();
});

const hero = { level: 7, xp: 140, xpNeeded: 200, hp: 84, maxHp: 120, round: 3, bossRound: 10, souls: 18 };
const ownedItem = (n: number): { id: string; name: string; tier: number; count: number } => ({
	id: `item${n}`,
	name: `Item ${n}`,
	tier: 1,
	count: 1,
});

test("the gold shows once, the profile souls have their own label and the weapon holds its upgrade", () => {
	const buy = actions();
	render(
		<Shop
			view={{ ...view, hero, weapon: { name: "Espada", tier: 1, lines: ["Dano 12"] } }}
			stats={stats}
			actions={buy}
		/>,
	);
	expect(screen.getAllByTestId("shop-gold")).toHaveLength(1);
	expect(screen.getByTestId("shop-hero").textContent).toContain("Almas do perfil: 18");
	const upgrade = within(screen.getByTestId("shop-weapon")).getByTestId("shop-slot-2");
	expect(upgrade.textContent).toContain("Melhoria");
	expect(within(screen.getByTestId("shop-grid")).queryByTestId("shop-slot-2")).toBeNull();
	fireEvent.click(within(upgrade).getByTestId("shop-buy-2"));
	expect(buy.buy).toHaveBeenCalledWith(2);
});

test("the items grid is the owned items plus one empty row, not 16 slots", () => {
	const cells = (count: number): number => {
		render(
			<Shop
				view={{ ...view, hero, items: Array.from({ length: count }, (_, n) => ownedItem(n)) }}
				stats={stats}
				actions={actions()}
			/>,
		);
		const total = screen.getByTestId("shop-items").querySelectorAll("li").length;
		cleanup();
		return total;
	};
	expect(cells(0)).toBe(8);
	expect(cells(3)).toBe(16);
	expect(cells(8)).toBe(16);
	expect(cells(9)).toBe(24);
});

test("an item offer shows its tags with the progress after buying and marks the tier it reaches", () => {
	const tagged: ShopViewModel = {
		...view,
		synergies: [{ id: "iron", name: "Ferro", count: 1, reached: 0, nextAt: 2 }],
		slots: [
			{
				...(view.slots[0] as ShopViewModel["slots"][number]),
				tags: [
					{ id: "iron", name: "Ferro", after: 2, nextAt: 4, activates: true },
					{ id: "grave", name: "Cova", after: 1, nextAt: 2, activates: false },
				],
			},
			...view.slots.slice(1),
		],
	};
	render(<Shop view={tagged} stats={stats} actions={actions()} />);
	const chips = within(within(screen.getByTestId("shop-slot-0")).getByTestId("shop-tags")).getAllByRole(
		"listitem",
	);
	expect(chips.map((c) => c.querySelector("[aria-hidden]")?.textContent?.trim())).toEqual([
		"Ferro 2/4 ▲",
		"Cova 1/2",
	]);
	expect(chips.map((c) => c.getAttribute("data-activates"))).toEqual(["true", "false"]);
	expect(within(screen.getByTestId("shop-synergies")).getByText("Ferro 1/2")).toBeTruthy();
	expect(within(screen.getByTestId("shop-slot-1")).queryByTestId("shop-tags")).toBeNull();
});
