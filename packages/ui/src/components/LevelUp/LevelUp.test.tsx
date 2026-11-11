import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createPadHarness } from "../../nav/padHarness";
import { type CardView, LevelUp } from "./LevelUp";

afterEach(cleanup);

const card = (id: string, name: string, over: Partial<CardView> = {}): CardView => ({
	id,
	name,
	double: false,
	rarity: 1,
	lines: [],
	changes: [],
	...over,
});
const cards = [
	card("armor", "Plate", { lines: ["+3 armor"] }),
	card("damage", "Fury", {
		lines: ["+4% damage"],
		rarity: 3,
		changes: [
			{
				id: "statLine.damage",
				stat: "Damage",
				current: "12%",
				next: "16%",
				delta: "+4%",
				better: true,
			},
		],
	}),
	card("luck", "Black Luck", { lines: ["+4 luck"] }),
];

test("shows the three cards with name, effect, rarity, value now and after, and the key hint", () => {
	render(<LevelUp cards={cards} onChoose={() => {}} />);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByRole("heading", { name: "Novo nível" })).toBeTruthy();
	const fury = screen.getByTestId("levelup-card-1");
	expect(fury.textContent).toContain("Fury");
	expect(fury.textContent).toContain("+4% damage");
	expect(fury.textContent).toContain("Épico");
	expect(screen.getByTestId("levelup-change-1-statLine.damage").textContent).toBe("Damage12% → 16%");
	expect(screen.getByTestId("levelup-card-0").textContent).toContain("Normal");
	expect(screen.getByTestId("levelup-card-2").textContent).toContain("3");
	expect(screen.getByTestId("levelup-card-1").className).toContain("border-rarity-3");
	expect(screen.getByTestId("levelup-rarity-mark-1").getAttribute("data-tier")).toBe("3");
});

test("clicking a card chooses it", () => {
	const onChoose = vi.fn();
	render(<LevelUp cards={cards} onChoose={onChoose} />);
	fireEvent.click(screen.getByTestId("levelup-card-1"));
	expect(onChoose).toHaveBeenCalledWith(1);
});

test("keys 1-3 choose and other keys are ignored", () => {
	const onChoose = vi.fn();
	render(<LevelUp cards={cards} onChoose={onChoose} />);
	fireEvent.keyDown(window, { key: "1" });
	fireEvent.keyDown(window, { key: "3" });
	fireEvent.keyDown(window, { key: "4" });
	fireEvent.keyDown(window, { key: "a" });
	expect(onChoose.mock.calls).toEqual([[0], [2]]);
});

test("a custom title replaces the default heading", () => {
	render(<LevelUp cards={cards} onChoose={() => {}} title="Baú Lendário" />);
	expect(screen.getByRole("heading", { name: "Baú Lendário" })).toBeTruthy();
});

test("the reroll button is always visible with its key hint and disabled without rerolls", () => {
	const onReroll = vi.fn();
	const { rerender } = render(
		<LevelUp cards={cards} onChoose={() => {}} rerollsLeft={1} onReroll={onReroll} />,
	);
	fireEvent.click(screen.getByTestId("levelup-reroll"));
	fireEvent.keyDown(window, { code: "KeyR" });
	expect(onReroll).toHaveBeenCalledTimes(2);
	rerender(<LevelUp cards={cards} onChoose={() => {}} rerollsLeft={0} onReroll={onReroll} />);
	const button = screen.getByTestId("levelup-reroll") as HTMLButtonElement;
	expect(button.disabled).toBe(true);
	expect(button.textContent).toContain("[R]");
	rerender(
		<LevelUp cards={cards} onChoose={() => {}} rerollsLeft={1} onReroll={onReroll} rerollHint="X" />,
	);
	expect(screen.getByTestId("levelup-reroll").textContent).toContain("[X]");
});

test("arrows move the focus between the cards and Enter picks the focused one", () => {
	const onChoose = vi.fn();
	render(<LevelUp cards={cards} onChoose={onChoose} />);
	expect(document.activeElement).toBe(screen.getByTestId("levelup-card-0"));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
	expect(document.activeElement).toBe(screen.getByTestId("levelup-card-1"));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
	expect(document.activeElement).toBe(screen.getByTestId("levelup-card-2"));
	// Enter on a focused button is the browser's click; jsdom needs it spelled out.
	fireEvent.click(document.activeElement as HTMLElement);
	expect(onChoose).toHaveBeenCalledWith(2);
});

test("a gamepad walks the cards with the D-pad and A picks the focused one", () => {
	const harness = createPadHarness();
	const onChoose = vi.fn();
	render(<LevelUp cards={cards} onChoose={onChoose} />);
	harness.idle();
	harness.tap(15);
	expect(document.activeElement).toBe(screen.getByTestId("levelup-card-1"));
	harness.tap(0);
	expect(onChoose).toHaveBeenCalledWith(1);
	harness.restore();
});

test("a tap on a card picks it", () => {
	const onChoose = vi.fn();
	render(<LevelUp cards={cards} onChoose={onChoose} />);
	fireEvent.pointerDown(screen.getByTestId("levelup-card-2"), { pointerType: "touch" });
	fireEvent.click(screen.getByTestId("levelup-card-2"));
	expect(onChoose).toHaveBeenCalledWith(2);
});

function stubScreen({ short, wide }: { short: boolean; wide: boolean }): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("max-height") ? short : wide,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}));
}

const iconRef = { url: "a.png", x: 0, y: 0, w: 32, h: 32, atlasWidth: 64, atlasHeight: 64 };

test("on a short landscape screen the dialog scrolls instead of clipping and the icons are 48 px", () => {
	stubScreen({ short: true, wide: false });
	render(<LevelUp cards={cards.map((c) => ({ ...c, icon: iconRef }))} onChoose={() => {}} />);
	const dialog = screen.getByRole("dialog");
	expect(dialog.className).toContain("overflow-y-auto");
	expect(screen.getAllByTestId("icon")[0]?.style.width).toBe("48px");
	vi.unstubAllGlobals();
});

test("on a desktop screen the icons are 64 px", () => {
	stubScreen({ short: false, wide: true });
	render(<LevelUp cards={cards.map((c) => ({ ...c, icon: iconRef }))} onChoose={() => {}} />);
	expect(screen.getAllByTestId("icon")[0]?.style.width).toBe("64px");
	vi.unstubAllGlobals();
});

const heroStats = [
	{ id: "statLine.armor", label: "Armor", value: "3" },
	{ id: "statLine.damage", label: "Damage", value: "12%" },
];

test("a desktop screen lists the current stats on the left and previews the focused card", () => {
	stubScreen({ short: false, wide: true });
	render(<LevelUp cards={cards} stats={heroStats} onChoose={() => {}} />);
	const panel = screen.getByTestId("levelup-stats");
	expect(panel.textContent).toContain("Armor");
	expect(panel.textContent).toContain("12%");
	expect(panel.textContent).not.toContain("→");
	fireEvent.focus(screen.getByTestId("levelup-card-1"));
	expect(panel.textContent).toContain("12% → 16%");
	expect(screen.getByTestId("shop-delta-statLine.damage").textContent).toBe("(+4%)");
	expect(screen.getAllByTestId("stat-preview")).toHaveLength(1);
	fireEvent.blur(screen.getByTestId("levelup-card-1"));
	expect(panel.textContent).not.toContain("→");
	vi.unstubAllGlobals();
});

test("the stats panel is absent on the mobile targets so the cards are not cut", () => {
	stubScreen({ short: true, wide: false });
	render(<LevelUp cards={cards} stats={heroStats} onChoose={() => {}} />);
	expect(screen.queryByTestId("levelup-stats")).toBeNull();
	expect(screen.getAllByTestId(/^levelup-card-/)).toHaveLength(3);
	vi.unstubAllGlobals();
});
