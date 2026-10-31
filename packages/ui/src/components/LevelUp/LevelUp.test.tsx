import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { LevelUp } from "./LevelUp";

afterEach(cleanup);

const cards = [
	{ id: "armor", name: "+3 armor", double: false },
	{ id: "damage", name: "+4% damage", double: false },
	{ id: "luck", name: "+4 luck", double: false },
];

test("shows the three cards with their key hints", () => {
	render(<LevelUp cards={cards} onChoose={() => {}} />);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByRole("heading", { name: "Novo nível" })).toBeTruthy();
	expect(screen.getByTestId("levelup-card-0").textContent).toContain("+3 armor");
	expect(screen.getByTestId("levelup-card-2").textContent).toContain("3");
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

test("the reroll button and the R key appear only with rerolls left", () => {
	const onReroll = vi.fn();
	const { rerender } = render(
		<LevelUp cards={cards} onChoose={() => {}} rerollsLeft={1} onReroll={onReroll} />,
	);
	fireEvent.click(screen.getByTestId("levelup-reroll"));
	fireEvent.keyDown(window, { code: "KeyR" });
	expect(onReroll).toHaveBeenCalledTimes(2);
	rerender(<LevelUp cards={cards} onChoose={() => {}} rerollsLeft={0} onReroll={onReroll} />);
	expect(screen.queryByTestId("levelup-reroll")).toBeNull();
});

test("on a low landscape screen the cards sit in one row and the dialog scrolls instead of cutting them", () => {
	render(<LevelUp cards={cards} onChoose={() => {}} />);
	const dialog = screen.getByRole("dialog");
	expect(dialog.className).toContain("overflow-y-auto");
	const row = screen.getByTestId("levelup-card-0").parentElement;
	expect(row?.className).toContain("low:flex-row");
	expect(screen.getByTestId("levelup-card-0").className).toContain("low:min-h-24");
});
