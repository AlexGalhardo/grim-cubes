import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { formatClock, Hud, type HudView, MAX_VISIBLE_ITEMS } from "./Hud";
import type { HudItem } from "./hudTypes";

afterEach(cleanup);

const item = (id: string, count = 1, tier = 1): HudItem => ({ id, name: `Item ${id}`, tier, count });

const view = (over: Partial<HudView> = {}): HudView => ({
	hp: 87,
	maxHp: 100,
	round: 3,
	level: 4,
	xp: 3,
	xpNeeded: 8,
	gold: 120,
	secondsLeft: 45,
	souls: 30,
	kills: 12,
	weapon: { id: "sword", name: "Rusted Sword", tier: 2 },
	items: [],
	boss: null,
	speed: 1,
	...over,
});

test("formats the clock as m:ss", () => {
	expect(formatClock(45)).toBe("0:45");
	expect(formatClock(125)).toBe("2:05");
	expect(formatClock(-3)).toBe("0:00");
});

test("every cluster of the four corners is on screen", () => {
	render(<Hud hud={view({ items: [item("a")] })} />);
	for (const id of [
		"hud-vitals",
		"hud-hp",
		"hud-xp",
		"hud-round",
		"hud-timer",
		"hud-wallet",
		"hud-gold",
		"hud-souls",
		"hud-kills",
		"hud-loadout",
		"hud-weapon",
		"hud-items",
	]) {
		expect(screen.getByTestId(id), id).toBeTruthy();
	}
	expect(screen.getByTestId("hud-timer").textContent).toBe("0:45");
	expect(screen.getByTestId("hud-gold").textContent).toContain("120");
	expect(screen.getByTestId("hud-souls").textContent).toContain("30");
	expect(screen.getByTestId("hud-kills").textContent).toContain("12");
	expect(screen.getByTestId("hud-level").textContent).toContain("4");
});

test("the HP bar shows the number and the XP bar is a thin strip with the values in aria", () => {
	render(<Hud hud={view()} />);
	const hp = within(screen.getByTestId("hud-hp")).getByRole("progressbar");
	expect(hp.textContent).toBe("87/100");
	const xp = within(screen.getByTestId("hud-xp")).getByRole("progressbar");
	expect(xp.textContent).toBe("");
	expect(xp.getAttribute("aria-valuenow")).toBe("3");
	expect(xp.getAttribute("aria-valuemax")).toBe("8");
});

test("the weapon frame lights as many pips as its tier", () => {
	render(<Hud hud={view()} />);
	const pips = screen.getByTestId("hud-weapon").querySelectorAll("[data-lit]");
	expect([...pips].map((p) => p.getAttribute("data-lit"))).toEqual(["true", "true", "false", "false"]);
});

test("the item strip groups with a count badge, shows ten and a +N chip for the rest", () => {
	const items = Array.from({ length: MAX_VISIBLE_ITEMS + 3 }, (_, i) => item(`i${i}`, i === 0 ? 3 : 1));
	render(<Hud hud={view({ items })} />);
	const strip = screen.getByTestId("hud-items");
	expect(within(strip).getAllByRole("listitem")).toHaveLength(MAX_VISIBLE_ITEMS + 1);
	expect(screen.getByTestId("hud-item-count").textContent).toBe("3");
	expect(screen.getByTestId("hud-items-more").textContent).toContain("+3");
});

test("an empty item set draws no strip", () => {
	render(<Hud hud={view()} />);
	expect(screen.queryByTestId("hud-items")).toBeNull();
});

test("the whole round plate is absent outside a timed round, and the clock gives way to the boss bar", () => {
	const { rerender } = render(<Hud hud={view({ secondsLeft: 0 })} />);
	expect(screen.queryByTestId("hud-timer")).toBeNull();
	expect(screen.queryByTestId("hud-round")).toBeNull();
	rerender(<Hud hud={view({ secondsLeft: 12 })} />);
	expect(screen.getByTestId("hud-round")).toBeTruthy();
	expect(screen.getByTestId("hud-timer").className).not.toContain("invisible");
	rerender(<Hud hud={view({ secondsLeft: 0 })} />);
	rerender(
		<Hud
			hud={view({ boss: { name: "B", hp: 1, maxHp: 1, phase: 0, phaseMarkers: [0.5], enrage: 0 } })}
		/>,
	);
	expect(screen.queryByTestId("hud-timer")).toBeNull();
	expect(screen.queryByTestId("hud-round")).toBeNull();
});

test("the corner buttons keep their test ids and call back", () => {
	const onPause = vi.fn();
	const onCycleSpeed = vi.fn();
	const onOpenOptions = vi.fn();
	render(<Hud hud={view()} onPause={onPause} onCycleSpeed={onCycleSpeed} onOpenOptions={onOpenOptions} />);
	const corner = screen.getByTestId("hud-corner");
	for (const id of ["pause-open", "speed-toggle", "options-open"]) {
		const button = screen.getByTestId(id);
		expect(corner.contains(button)).toBe(true);
		expect(button.getAttribute("aria-label")).toBeTruthy();
		fireEvent.click(button);
	}
	expect([onPause, onCycleSpeed, onOpenOptions].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
});

test("no corner buttons while a dialog is open", () => {
	render(<Hud hud={view()} showButtons={false} onPause={vi.fn()} />);
	expect(screen.queryByTestId("hud-corner")).toBeNull();
});

test("on touch the weapon sits beside the vitals and the item strip is left to the shop and pause", () => {
	render(<Hud hud={view({ items: [item("a")] })} touch />);
	expect(screen.getByTestId("hud-weapon")).toBeTruthy();
	expect(screen.queryByTestId("hud-items")).toBeNull();
	expect(screen.getByTestId("hud-loadout").parentElement?.contains(screen.getByTestId("hud-vitals"))).toBe(
		true,
	);
});

test("touch targets and compact sizes: buttons are 48 px, the vitals shrink below the desktop breakpoint", () => {
	render(<Hud hud={view()} touch onPause={vi.fn()} onCycleSpeed={vi.fn()} onOpenOptions={vi.fn()} />);
	for (const id of ["pause-open", "speed-toggle", "options-open"]) {
		const className = screen.getByTestId(id).className;
		expect(className, id).toContain("size-12");
		expect(className, id).toContain("pointer-coarse:size-12");
	}
	expect(screen.getByTestId("hud-portrait").className).toContain("size-10");
	expect(within(screen.getByTestId("hud-hp")).getByRole("progressbar").className).toContain("h-4");
	expect(within(screen.getByTestId("hud-xp")).getByRole("progressbar").className).toContain("h-1.5");
	expect(screen.getByTestId("hud-timer").className).toContain("text-2xl");
});

test("on touch the wallet keeps gold and souls and drops the kills counter at the compact sizes", () => {
	render(<Hud hud={view()} touch />);
	expect(screen.getByTestId("hud-kills").className).toContain("hidden");
	expect(screen.getByTestId("hud-kills").className).toContain("desktop:flex");
});

test("the timer turns blood-light and pulses only in the last five seconds", () => {
	const { rerender } = render(<Hud hud={view({ secondsLeft: 6 })} />);
	const timer = (): HTMLElement => screen.getByTestId("hud-timer");
	expect(timer().getAttribute("data-urgent")).toBe("false");
	expect(timer().className).not.toContain("animate-low");
	rerender(<Hud hud={view({ secondsLeft: 5 })} />);
	expect(timer().getAttribute("data-urgent")).toBe("true");
	expect(timer().className).toContain("text-blood-light");
	expect(timer().className).toContain("animate-low");
	rerender(<Hud hud={view({ secondsLeft: 0 })} />);
	expect(screen.queryByTestId("hud-timer")).toBeNull();
});

test("the boss bar takes the top-centre place of the clock", () => {
	render(
		<Hud
			hud={view({ boss: { name: "B", hp: 5, maxHp: 10, phase: 0, phaseMarkers: [0.5], enrage: 0 } })}
		/>,
	);
	expect(screen.getByTestId("boss-bar")).toBeTruthy();
	expect(screen.queryByTestId("hud-timer")).toBeNull();
});

test("the synergy strip lists each tag with its progress and lights the ones with a tier", () => {
	const synergies = [
		{ id: "iron", name: "Ferro", count: 2, reached: 1, nextAt: 4 },
		{ id: "bone", name: "Osso", count: 1, reached: 0, nextAt: 2 },
		{ id: "ember", name: "Brasa", count: 6, reached: 3, nextAt: null },
	];
	render(<Hud hud={view({ synergies })} />);
	const rows = within(screen.getByTestId("hud-synergies")).getAllByRole("listitem");
	expect(rows.map((r) => r.querySelector("[aria-hidden]")?.textContent)).toEqual([
		"Ferro 2/4",
		"Osso 1/2",
		"Brasa 6",
	]);
	expect(rows.map((r) => r.getAttribute("data-reached"))).toEqual(["1", "0", "3"]);
});

test("no synergy strip without a tagged item, and none on touch screens", () => {
	const { rerender } = render(<Hud hud={view()} />);
	expect(screen.queryByTestId("hud-synergies")).toBeNull();
	rerender(
		<Hud
			hud={view({ synergies: [{ id: "iron", name: "Ferro", count: 1, reached: 0, nextAt: 2 }] })}
			touch
		/>,
	);
	expect(screen.queryByTestId("hud-synergies")).toBeNull();
});

test("on touch a boss bar sits in the space between the vitals and the wallet, so it keeps clear of both", () => {
	const boss = { name: "B", hp: 5, maxHp: 10, phase: 0, phaseMarkers: [0.5], enrage: 0 };
	const root = (): HTMLElement =>
		screen.getByTestId("boss-bar").parentElement?.parentElement as HTMLElement;
	const { rerender } = render(<Hud hud={view({ boss })} touch />);
	expect(root().className).toContain("grid-cols-[auto_1fr_auto]");
	rerender(<Hud hud={view({ boss })} />);
	expect(root().className).toContain("grid-cols-[1fr_auto_1fr]");
	rerender(<Hud hud={view()} touch />);
	expect(screen.getByTestId("hud-round").closest(".grid")?.className).toContain("grid-cols-[1fr_auto_1fr]");
});
