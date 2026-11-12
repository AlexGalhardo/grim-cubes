import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Shop, type ShopSlotView, type ShopViewModel } from "./Shop";

afterEach(cleanup);

const offer = (
	slot: string,
	name: string,
	level: number,
	overrides: Partial<ShopSlotView> = {},
): ShopSlotView => ({
	slot,
	name,
	level,
	lines: ["+3 armadura"],
	price: 23,
	tier: 1,
	locked: false,
	sold: false,
	affordable: true,
	...overrides,
});

const view: ShopViewModel = {
	gold: 50,
	rerollPrice: 11,
	slots: [
		offer("helmet", "Capacete", 1),
		offer("armor", "Armadura", 2, { lines: ["+10 HP máx"], price: 60, locked: true, affordable: false }),
		offer("pants", "Calças", 1),
		offer("boots", "Botas", 3, { sold: true }),
	],
};
const stats = [{ label: "Armadura", value: "0" }];

function actions() {
	return { buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() };
}

test("renders the offers, their attribute lines, gold and the stats", () => {
	render(<Shop view={view} stats={stats} actions={actions()} />);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByTestId("shop-slot-0").textContent).toContain("+3 armadura");
	expect(screen.getByTestId("shop-slot-0").textContent).toContain("Nível 1");
	expect(screen.getByTestId("shop-gold").textContent).toContain("50");
	expect(within(screen.getByTestId("shop-side")).getByText("Armadura")).toBeTruthy();
	expect(screen.getByTestId("shop-buy-3").textContent).toBe("Vendido");
});

test("buy, lock, reroll and next call their actions", () => {
	const a = actions();
	render(<Shop view={view} stats={stats} actions={a} />);
	fireEvent.click(screen.getByTestId("shop-buy-0"));
	fireEvent.click(screen.getByTestId("shop-lock-2"));
	fireEvent.click(screen.getByRole("button", { name: /Trocar peças/ }));
	fireEvent.click(screen.getByRole("button", { name: "Próximo round" }));
	expect(a.buy).toHaveBeenCalledWith(0);
	expect(a.toggleLock).toHaveBeenCalledWith(2);
	expect(a.reroll).toHaveBeenCalledTimes(1);
	expect(a.next).toHaveBeenCalledTimes(1);
});

test("number keys buy the offer, R rerolls and Enter continues", () => {
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
	expect((screen.getByRole("button", { name: /Trocar peças/ }) as HTMLButtonElement).disabled).toBe(true);
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

const hero = { level: 7, xp: 140, xpNeeded: 200, hp: 84, maxHp: 120, round: 3, bossRound: 10, souls: 18 };
const worn = [
	{ slot: "helmet", name: "Capacete", level: 4, tier: 2, lines: ["+8 armadura"] },
	{ slot: "armor", name: "Armadura", level: 0, tier: 1, lines: [] },
];

test("shows the hero, the equipment slots with their level and the Merchant line", () => {
	render(
		<Shop
			view={{ ...view, hero, equipped: worn, quote: "Ossos frescos." }}
			stats={stats}
			actions={actions()}
		/>,
	);
	expect(screen.getByTestId("shop-hero").textContent).toContain("84 / 120");
	expect(screen.getByTestId("shop-hero").textContent).toContain("Almas do perfil: 18");
	const helmet = screen.getByTestId("shop-equipped-helmet");
	expect(helmet.textContent).toContain("Nível 4");
	expect(helmet.textContent).toContain("+8 armadura");
	expect(screen.getByTestId("shop-equipped-armor").textContent).toContain("Vazio");
	expect(screen.getByText(/Ossos frescos/)).toBeTruthy();
	expect(screen.getAllByTestId("shop-gold")).toHaveLength(1);
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

test("an offer shows its own icon and attribute lines", () => {
	render(
		<Shop
			view={{
				...view,
				slots: [
					offer("ring", "Anel", 5, { lines: ["+15% dano", "+10% vel. de ataque"], icon: iconRef }),
				],
			}}
			stats={stats}
			actions={actions()}
		/>,
	);
	const ring = screen.getByTestId("shop-slot-0");
	expect(ring.textContent).toContain("+15% dano");
	expect(ring.textContent).toContain("+10% vel. de ataque");
	expect(within(ring).getAllByTestId("icon")).toHaveLength(1);
});

test("the delta is green when better and red when worse, and follows keyboard and pad focus", () => {
	const slot = (i: number): ShopSlotView => ({
		...(view.slots[i] as ShopSlotView),
		preview: {
			"statLine.armor": { after: "3", delta: "+3", better: true },
			"statLine.speed": { after: "5", delta: "−1", better: false },
		},
	});
	render(
		<Shop
			view={{ ...view, slots: [view.slots[0] as ShopSlotView, slot(2)] }}
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
