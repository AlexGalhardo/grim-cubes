import { createStore } from "@gc/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App, type HudState } from "./App";

afterEach(cleanup);

const hud = (speed: number): HudState => ({
	hp: 10,
	maxHp: 10,
	round: 1,
	level: 1,
	xp: 0,
	xpNeeded: 5,
	gold: 0,
	cards: [],
	chest: [],
	shop: null,
	stats: [],
	results: null,
	notice: null,
	boss: null,
	options: null,
	ossuary: null,
	difficulty: null,
	dash: null,
	cardRerolls: 0,
	bossIntro: null,
	tip: null,
	vignette: 0,
	demoEnd: false,
	uiScale: 100,
	menu: null,
	speed,
});

const TARGETS = [
	[1920, 1080],
	[2560, 1440],
	[896, 414],
	[800, 360],
] as const;

test.each(TARGETS)("at %ix%i the speed and options buttons share the corner and the speed shows", (w, h) => {
	window.innerWidth = w;
	window.innerHeight = h;
	const onCycleSpeed = vi.fn();
	render(<App store={createStore(hud(2))} onOpenOptions={vi.fn()} onCycleSpeed={onCycleSpeed} />);
	const corner = screen.getByTestId("hud-corner");
	const speed = screen.getByTestId("speed-toggle");
	const options = screen.getByTestId("options-open");
	expect(corner.contains(speed) && corner.contains(options)).toBe(true);
	expect(speed.textContent).toBe("2x");
	fireEvent.click(speed);
	expect(onCycleSpeed).toHaveBeenCalledTimes(1);
});

test("the button shows the current speed and hides while the options screen is open", () => {
	render(<App store={createStore(hud(3))} onCycleSpeed={vi.fn()} />);
	expect(screen.getByTestId("speed-toggle").textContent).toBe("3x");
	cleanup();
	const open = {
		...hud(1),
		options: {
			preset: "auto",
			presets: [],
			volume: { master: 1, music: 1, sfx: 1 },
			screenShake: true,
			gameSpeed: 1,
			telemetry: false,
			brightness: 0,
			contrast: 100,
			colorblind: "off",
			flashReduction: false,
			uiScale: 100,
			gore: true,
			locale: "pt-BR",
			locales: [],
		},
	};
	render(
		<App
			store={createStore(open)}
			onCycleSpeed={vi.fn()}
			optionsActions={{
				setPreset: vi.fn(),
				setVolume: vi.fn(),
				setScreenShake: vi.fn(),
				setGameSpeed: vi.fn(),
				setTelemetry: vi.fn(),
				setBrightness: vi.fn(),
				setContrast: vi.fn(),
				setColorblind: vi.fn(),
				setFlashReduction: vi.fn(),
				setUiScale: vi.fn(),
				setGore: vi.fn(),
				setLocale: vi.fn(),
				close: vi.fn(),
			}}
		/>,
	);
	expect(screen.queryByTestId("speed-toggle")).toBeNull();
});

test("the demo end screen blocks the results, its store buttons are disabled and play again restarts", () => {
	const onRestart = vi.fn();
	const results = {
		round: 10,
		kills: 1,
		damage: 1,
		cause: "x",
		souls: 1,
		totalSouls: 1,
		record: 10,
		newRecord: false,
		stats: [],
	};
	render(
		<App
			store={createStore({ ...hud(1), demoEnd: true, results } as unknown as HudState)}
			onRestart={onRestart}
			demo
		/>,
	);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByTestId("demo-seal").textContent).toBe("DEMO");
	expect(
		(screen.getByRole("button", { name: "Lista de desejos na Steam" }) as HTMLButtonElement).disabled,
	).toBe(true);
	expect(
		(screen.getByRole("button", { name: "Jogar o jogo completo" }) as HTMLButtonElement).disabled,
	).toBe(true);
	expect(screen.queryByRole("button", { name: "Jogar de novo" })).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
	expect(onRestart).toHaveBeenCalledTimes(1);
});

test("without demoEnd no demo screen and no seal outside the demo build", () => {
	render(<App store={createStore(hud(1))} onRestart={vi.fn()} />);
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(screen.queryByTestId("demo-seal")).toBeNull();
});

const menuView = {
	records: [
		{ id: "normal", name: "Normal", round: 12 },
		{ id: "grim", name: "Sombrio", round: 0 },
	],
};
const menuActions = () => ({ play: vi.fn(), ossuary: vi.fn(), options: vi.fn() });

test("the title screen lists the records and its buttons call the actions", () => {
	const actions = menuActions();
	render(
		<App store={createStore({ ...hud(1), menu: menuView })} menuActions={actions} version="0.4.0" demo />,
	);
	expect(screen.getByRole("dialog")).toBeTruthy();
	expect(screen.getByTestId("menu-records").textContent).toContain("Round 12");
	expect(screen.getByTestId("menu-records").textContent).toContain("Sombrio");
	expect(screen.getByText("v0.4.0")).toBeTruthy();
	fireEvent.click(screen.getByTestId("menu-play"));
	fireEvent.click(screen.getByRole("button", { name: "Ossuário" }));
	fireEvent.click(screen.getByRole("button", { name: "Opções" }));
	expect(actions.play).toHaveBeenCalledTimes(1);
	expect(actions.ossuary).toHaveBeenCalledTimes(1);
	expect(actions.options).toHaveBeenCalledTimes(1);
});

test("the title screen steps aside for the difficulty screen", () => {
	const difficulty = {
		selected: "normal",
		options: [{ id: "normal", name: "Normal", summary: "", locked: false, requirement: "" }],
	};
	render(
		<App
			store={createStore({ ...hud(1), menu: menuView, difficulty })}
			menuActions={menuActions()}
			difficultyActions={{ start: vi.fn(), cancel: vi.fn() }}
		/>,
	);
	expect(screen.queryByTestId("menu-play")).toBeNull();
	expect(screen.getAllByRole("dialog")).toHaveLength(1);
});

test("the HUD scale goes to the root as a CSS variable", () => {
	render(<App store={createStore({ ...hud(1), uiScale: 125 })} />);
	const root = screen.getByTestId("hud-root");
	expect(root.style.getPropertyValue("--ui-scale")).toBe("1.25");
});
