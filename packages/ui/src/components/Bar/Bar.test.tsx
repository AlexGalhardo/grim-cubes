import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Bar } from "./Bar";

afterEach(cleanup);

test("the hero bar below 25% gets the blood frame and a pulsing fill, and the number stays", () => {
	render(<Bar value={20} max={100} label="HP" />);
	const bar = screen.getByRole("progressbar");
	expect(bar.getAttribute("data-low")).toBe("true");
	expect(bar.className).toContain("border-blood-light");
	expect(bar.querySelector(".animate-low")).not.toBeNull();
	expect(bar.textContent).toBe("20/100");
});

test("a healthy bar keeps the iron frame and does not pulse", () => {
	render(<Bar value={80} max={100} label="HP" />);
	const bar = screen.getByRole("progressbar");
	expect(bar.getAttribute("data-low")).toBe("false");
	expect(bar.className).toContain("border-iron-dark");
	expect(bar.querySelector(".animate-low")).toBeNull();
});

test("only the hero bar goes low: the XP and boss bars never do", () => {
	render(<Bar value={1} max={100} variant="xp" label="XP" thin />);
	render(<Bar value={1} max={100} variant="boss" label="Boss" />);
	for (const bar of screen.getAllByRole("progressbar")) expect(bar.getAttribute("data-low")).toBe("false");
});

test("the thin variant has no number but keeps the values for assistive tech", () => {
	render(<Bar value={3} max={8} variant="xp" label="XP" thin />);
	const bar = screen.getByRole("progressbar");
	expect(bar.textContent).toBe("");
	expect(bar.getAttribute("aria-valuenow")).toBe("3");
});
