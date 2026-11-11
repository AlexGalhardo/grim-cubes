import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Results, type ResultsViewModel } from "./Results";

const view: ResultsViewModel = {
	round: 12,
	kills: 340,
	damage: 5120,
	cause: "Carcaça",
	causeKind: "elite",
	weapon: { id: "sword", name: "Espada Enferrujada", tier: 2 },
	items: [
		{ id: "plate", name: "Placa Enferrujada", tier: 1, count: 2 },
		{ id: "boots", name: "Botas", tier: 3, count: 1 },
	],
	seconds: 754,
	sources: [
		{ id: "weapon", label: "Arma", damage: 4000 },
		{ id: "bleed", label: "Sangramento", damage: 1000 },
	],
	nextUnlock: { name: "+5 HP máx", cost: 400 },
	souls: 285,
	totalSouls: 1285,
	record: 12,
	newRecord: true,
	seed: 42,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

test("shows the run summary, the build and the seed", () => {
	render(<Results view={view} onRestart={() => {}} />);
	expect(screen.getByTestId("results-round").textContent).toBe("12");
	expect(screen.getByTestId("results-kills").textContent).toBe("340");
	expect(screen.getByTestId("results-cause").textContent).toBe("Carcaça");
	expect(screen.getByTestId("results-seed").textContent).toBe("42");
	expect(screen.getByTestId("results-record").textContent).toContain("novo");
	expect(screen.getByTestId("results-time").textContent).toBe("12:34");
	expect(screen.getByTestId("results-weapon").textContent).toContain("Espada Enferrujada (T2)");
	expect(screen.getByTestId("results-build").textContent).toContain("Placa Enferrujada");
	expect(screen.getByTestId("results-build").textContent).toContain("2");
});

test("shows who killed the hero with an icon, the damage bars and the progress to the next unlock", () => {
	render(<Results view={view} onRestart={() => {}} />);
	expect(screen.getByTestId("results-cause-icon").textContent).toBe("☠");
	expect(screen.getByTestId("results-cause-icon").className).toContain("border-rarity-3");
	expect(screen.getByTestId("results-source-weapon").textContent).toContain("4000");
	const bar = screen.getByTestId("results-source-bleed").querySelector("span > span") as HTMLElement;
	expect(bar.style.width).toBe("25%");
	expect(screen.getByTestId("results-unlock").textContent).toContain("1285 / 400 almas");
	expect(screen.getByTestId("results-unlock").textContent).toContain("já pode ser comprado");
});

test("the three buttons share one grid row and one size", () => {
	render(<Results view={view} onRestart={() => {}} onOssuary={() => {}} onMenu={() => {}} />);
	const buttons = ["Ossuário", "Jogar de novo", "Voltar ao menu"].map((name) =>
		screen.getByRole("button", { name: new RegExp(name) }),
	);
	for (const button of buttons) {
		expect(button.className).toContain("min-h-12");
		expect(button.parentElement).toBe(buttons[0]?.parentElement);
	}
	expect(buttons[0]?.parentElement?.className).toContain("items-end");
});

test("the souls count up in steps and land exactly on the total", () => {
	render(<Results view={view} onRestart={() => {}} />);
	expect(screen.getByTestId("results-souls").textContent).toBe("0");
	act(() => {
		vi.advanceTimersByTime(75 * 5);
	});
	const mid = Number(screen.getByTestId("results-souls").textContent);
	expect(mid).toBeGreaterThan(0);
	expect(mid).toBeLessThan(285);
	act(() => {
		vi.advanceTimersByTime(75 * 30);
	});
	expect(screen.getByTestId("results-souls").textContent).toBe("285");
});

test("the button and Enter restart the run", () => {
	const onRestart = vi.fn();
	render(<Results view={view} onRestart={onRestart} />);
	fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
	fireEvent.keyDown(window, { key: "Enter" });
	expect(onRestart).toHaveBeenCalledTimes(2);
});

test("the wishlist button shows only when a handler is given", () => {
	const onWishlist = vi.fn();
	const { rerender } = render(<Results view={view} onRestart={() => {}} />);
	expect(screen.queryByTestId("results-wishlist")).toBeNull();
	rerender(<Results view={view} onRestart={() => {}} onWishlist={onWishlist} />);
	fireEvent.click(screen.getByTestId("results-wishlist"));
	expect(onWishlist).toHaveBeenCalledTimes(1);
});

test("a daily challenge run says whether it scored or was practice; a normal run says nothing", () => {
	const { rerender } = render(<Results view={view} onRestart={() => {}} />);
	expect(screen.queryByTestId("results-daily")).toBeNull();
	rerender(<Results view={{ ...view, daily: "scored" }} onRestart={() => {}} />);
	expect(screen.getByTestId("results-daily").textContent).toContain("pontuou");
	rerender(<Results view={{ ...view, daily: "practice" }} onRestart={() => {}} />);
	expect(screen.getByTestId("results-daily").textContent).toContain("treino");
});
