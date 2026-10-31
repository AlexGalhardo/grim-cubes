import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Results, type ResultsViewModel } from "./Results";

const view: ResultsViewModel = {
	round: 12,
	kills: 340,
	damage: 5120,
	cause: "Carcaça",
	build: ["Espada Enferrujada (T2)", "Placa Enferrujada ×2"],
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
	expect(screen.getByText("Placa Enferrujada ×2")).toBeTruthy();
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
