import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Daily, type DailyViewModel } from "./Daily";

afterEach(cleanup);

const row = (date: string, round: number) => ({ date, round, time: `${round}:05`, kills: round * 10 });

const open: DailyViewModel = {
	date: "2026-11-11",
	heroName: "O Fuzilado",
	weapon: "Pistola de Ferro",
	today: null,
	rows: [row("2026-11-10", 9)],
};

test("shows today's hero, that the attempt is free and the table of past days", () => {
	render(<Daily view={open} actions={{ start: vi.fn(), cancel: vi.fn() }} />);
	expect(screen.getByTestId("daily-date").textContent).toContain("2026-11-11");
	expect(screen.getByRole("dialog").textContent).toContain("O Fuzilado");
	expect(screen.getByTestId("daily-status").textContent).toContain("livre");
	expect(screen.getByTestId("daily-table").textContent).toContain("2026-11-10");
});

test("once today scored, the status shows the result and says the next tries are practice", () => {
	const view = { ...open, today: row("2026-11-11", 12), rows: [row("2026-11-11", 12), ...open.rows] };
	render(<Daily view={view} actions={{ start: vi.fn(), cancel: vi.fn() }} />);
	expect(screen.getByTestId("daily-status").textContent).toContain("round 12 em 12:05");
	expect(screen.getByRole("dialog").textContent).toContain("treino");
});

test("an empty history says so instead of drawing an empty table", () => {
	render(<Daily view={{ ...open, rows: [] }} actions={{ start: vi.fn(), cancel: vi.fn() }} />);
	expect(screen.queryByTestId("daily-table")).toBeNull();
	expect(screen.getByRole("dialog").textContent).toContain("Nenhuma tentativa");
});

test("Play starts the challenge; Back and Esc cancel", () => {
	const actions = { start: vi.fn(), cancel: vi.fn() };
	render(<Daily view={open} actions={actions} />);
	fireEvent.click(screen.getByTestId("daily-start"));
	fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(actions.start).toHaveBeenCalledTimes(1);
	expect(actions.cancel).toHaveBeenCalledTimes(2);
});
