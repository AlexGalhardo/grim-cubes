import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { BossBar, BossIntro } from "./BossBar";

afterEach(cleanup);

test("the boss bar shows the name, the HP and the phase marker", () => {
	render(<BossBar boss={{ name: "O Coveiro", hp: 900, maxHp: 1200, phase: 0 }} />);
	expect(screen.getAllByText("O Coveiro").length).toBeGreaterThan(0);
	const bar = screen.getByRole("progressbar", { name: "O Coveiro" });
	expect(bar.getAttribute("aria-valuenow")).toBe("900");
	expect(bar.getAttribute("aria-valuemax")).toBe("1200");
});

test("the intro banner announces the boss", () => {
	render(<BossIntro name="O Coveiro" />);
	expect(screen.getByRole("status").textContent).toBe("O Coveiro");
});
