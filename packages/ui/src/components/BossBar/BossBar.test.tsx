import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { BossBar, BossIntro } from "./BossBar";

afterEach(cleanup);

test("the boss bar shows the name, the HP and the phase marker", () => {
	render(
		<BossBar
			boss={{ name: "O Coveiro", hp: 900, maxHp: 1200, phase: 0, phaseMarkers: [0.5], enrage: 0 }}
		/>,
	);
	expect(screen.getAllByText("O Coveiro").length).toBeGreaterThan(0);
	const bar = screen.getByRole("progressbar", { name: "O Coveiro" });
	expect(bar.getAttribute("aria-valuenow")).toBe("900");
	expect(bar.getAttribute("aria-valuemax")).toBe("1200");
});

test("the intro banner announces the boss", () => {
	render(<BossIntro name="O Coveiro" />);
	expect(screen.getByRole("status").textContent).toBe("O Coveiro");
});

test("the boss bar draws a tick and a pip for each phase, lighting the pips reached", () => {
	const boss = { name: "O Coveiro", hp: 600, maxHp: 1200, phase: 0, phaseMarkers: [0.5], enrage: 0 };
	const { rerender } = render(<BossBar boss={boss} />);
	expect(screen.getAllByTestId("boss-phase-marker")).toHaveLength(1);
	const lit = (): string[] =>
		[...screen.getByTestId("boss-phase-pips").querySelectorAll("[data-lit]")].map(
			(p) => p.getAttribute("data-lit") ?? "",
		);
	expect(lit()).toEqual(["true", "false"]);
	rerender(<BossBar boss={{ ...boss, phase: 1 }} />);
	expect(lit()).toEqual(["true", "true"]);
});

test("an enraged boss gets the pulsing blood frame and a label, a calm one does not", () => {
	const boss = { name: "O Coveiro", hp: 600, maxHp: 1200, phase: 0, phaseMarkers: [0.5], enrage: 0 };
	const { rerender } = render(<BossBar boss={boss} />);
	expect(screen.getByTestId("boss-bar").getAttribute("data-enraged")).toBe("false");
	expect(screen.queryByTestId("boss-enrage")).toBeNull();
	rerender(<BossBar boss={{ ...boss, enrage: 2 }} />);
	const frame = screen.getByTestId("boss-bar");
	expect(frame.getAttribute("data-enraged")).toBe("true");
	expect(frame.className).toContain("border-blood-light");
	expect(frame.className).toContain("animate-low");
	expect(screen.getByTestId("boss-enrage")).toBeTruthy();
});
