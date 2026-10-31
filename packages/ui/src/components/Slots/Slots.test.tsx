import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Slots, type SlotView } from "./Slots";

afterEach(cleanup);

const view: SlotView[] = [
	{
		slot: 1,
		name: "Slot 1",
		state: "used",
		lastPlayed: "31/10/2026 12:00",
		bestRound: 12,
		souls: 285,
		runRound: 5,
	},
	{ slot: 2, name: "Slot 2", state: "empty", lastPlayed: "", bestRound: 0, souls: 0, runRound: null },
	{ slot: 3, name: "Slot 3", state: "unreadable", lastPlayed: "", bestRound: 0, souls: 0, runRound: null },
];

const actions = () => ({ choose: vi.fn(), erase: vi.fn(), cancel: vi.fn() });

test("each slot shows its name, last played time, best round, souls and the run in progress", () => {
	render(<Slots view={{ slots: view }} actions={actions()} />);
	const used = screen.getByTestId("slot-1").textContent ?? "";
	expect(used).toContain("Slot 1");
	expect(used).toContain("31/10/2026 12:00");
	expect(used).toContain("12");
	expect(used).toContain("285");
	expect(used).toContain("round 5");
	expect(screen.getByTestId("slot-2").textContent).toContain("vazio");
	expect(screen.getByTestId("slot-3").textContent).toContain("Não foi possível ler");
	// Only slots with something in them can be erased.
	expect(screen.getAllByRole("button", { name: /^Apagar Slot/ })).toHaveLength(2);
});

test("an empty slot starts at once; an occupied one asks before erasing and defaults to keeping", () => {
	const a = actions();
	render(<Slots view={{ slots: view }} actions={a} />);
	fireEvent.click(screen.getByTestId("slot-2"));
	expect(a.choose).toHaveBeenCalledWith(2, false);

	fireEvent.click(screen.getByTestId("slot-1"));
	expect(a.choose).toHaveBeenCalledTimes(1);
	expect(screen.getByTestId("slots-confirm").textContent).toContain("Slot 1");
	expect(document.activeElement).toBe(screen.getByTestId("slots-keep"));
	fireEvent.click(screen.getByTestId("slots-keep"));
	expect(screen.queryByTestId("slots-confirm")).toBeNull();
	expect(a.choose).toHaveBeenCalledTimes(1);

	fireEvent.click(screen.getByTestId("slot-1"));
	fireEvent.click(screen.getByRole("button", { name: "Apagar e começar" }));
	expect(a.choose).toHaveBeenLastCalledWith(1, true);
});

test("Apagar asks too and Esc backs out of the question before leaving the screen", () => {
	const a = actions();
	render(<Slots view={{ slots: view }} actions={a} />);
	fireEvent.click(screen.getByRole("button", { name: "Apagar Slot 1" }));
	expect(screen.getByTestId("slots-confirm")).toBeTruthy();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(screen.queryByTestId("slots-confirm")).toBeNull();
	expect(a.cancel).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Apagar Slot 3" }));
	fireEvent.click(screen.getByRole("button", { name: "Apagar" }));
	expect(a.erase).toHaveBeenCalledWith(3);
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(a.cancel).toHaveBeenCalledTimes(1);
});
