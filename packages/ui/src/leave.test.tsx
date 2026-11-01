import { createKeyMap, createPadMap, type KeyCheck, type PadCheck } from "@gc/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DemoEnd } from "./components/DemoEnd/DemoEnd";
import { Menu } from "./components/Menu/Menu";
import { Options, type OptionsActions, type OptionsViewModel } from "./components/Options/Options";
import { Results, type ResultsViewModel } from "./components/Results/Results";

afterEach(cleanup);

const menuView = { records: [], continue: null };
const menuActions = (quit?: () => void) => ({
	resume: vi.fn(),
	play: vi.fn(),
	ossuary: vi.fn(),
	options: vi.fn(),
	...(quit ? { quit } : {}),
});

test("the title menu has no quit button unless the desktop build offers one", () => {
	render(<Menu view={menuView} actions={menuActions()} />);
	expect(screen.queryByTestId("menu-quit")).toBeNull();
});

test("Sair do jogo is the last button, asks first, defaults to staying and quits only on the second answer", () => {
	const quit = vi.fn();
	render(<Menu view={menuView} actions={menuActions(quit)} />);
	const buttons = screen.getAllByRole("button").map((b) => b.textContent);
	expect(buttons.at(-1)).toBe("Sair do jogo");
	fireEvent.click(screen.getByTestId("menu-quit"));
	expect(screen.getByTestId("menu-quit-confirm").textContent).toContain("Sair do Grim Cubes?");
	expect(document.activeElement).toBe(screen.getByTestId("menu-quit-confirm-stay"));
	expect(quit).not.toHaveBeenCalled();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(screen.queryByTestId("menu-quit-confirm")).toBeNull();
	expect(document.activeElement).toBe(screen.getByTestId("menu-play"));
	fireEvent.click(screen.getByTestId("menu-quit"));
	fireEvent.click(screen.getByTestId("menu-quit-confirm-leave"));
	expect(quit).toHaveBeenCalledTimes(1);
});

const results: ResultsViewModel = {
	round: 7,
	kills: 10,
	damage: 100,
	cause: "Husk",
	build: ["Espada"],
	souls: 12,
	totalSouls: 40,
	record: 7,
	newRecord: false,
	seed: 42,
};

test("the results screen goes back to the menu after a confirmation, and Enter does not restart under the question", () => {
	const onMenu = vi.fn();
	const onRestart = vi.fn();
	render(<Results view={results} onRestart={onRestart} onMenu={onMenu} />);
	fireEvent.click(screen.getByTestId("results-menu"));
	expect(screen.getByTestId("leave-confirm").textContent).toContain("Voltar ao menu inicial?");
	fireEvent.keyDown(window, { key: "Enter" });
	expect(onRestart).not.toHaveBeenCalled();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(screen.queryByTestId("leave-confirm")).toBeNull();
	fireEvent.click(screen.getByTestId("results-menu"));
	fireEvent.click(screen.getByTestId("leave-confirm-leave"));
	expect(onMenu).toHaveBeenCalledTimes(1);
});

test("the results screen has no menu button when the host offers none", () => {
	render(<Results view={results} onRestart={vi.fn()} />);
	expect(screen.queryByTestId("results-menu")).toBeNull();
});

test("the demo end goes back to the menu after a confirmation", () => {
	const onMenu = vi.fn();
	render(<DemoEnd onRestart={vi.fn()} onMenu={onMenu} />);
	expect(screen.getByRole("dialog", { name: /./ })).toBeTruthy();
	fireEvent.click(screen.getByTestId("demo-end-menu"));
	expect(onMenu).not.toHaveBeenCalled();
	fireEvent.click(screen.getByTestId("leave-confirm-leave"));
	expect(onMenu).toHaveBeenCalledTimes(1);
});

const optionsView: OptionsViewModel = {
	preset: "auto",
	presets: [],
	volume: { master: 100, music: 70, sfx: 100 },
	screenShake: true,
	gameSpeed: 1,
	telemetry: false,
	brightness: 0,
	contrast: 100,
	colorblind: "off",
	flashReduction: false,
	uiScale: 100,
	gore: true,
	keys: createKeyMap(),
	pad: createPadMap(),
	subtitles: true,
	locale: "pt-BR",
	locales: [{ id: "pt-BR", name: "Português" }],
};
const optionsActions = (toMenu?: () => void): OptionsActions => ({
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
	setSubtitles: vi.fn(),
	setKey: vi.fn(() => ({ ok: true }) as KeyCheck),
	resetKeys: vi.fn(),
	setPadButton: vi.fn(() => ({ ok: true }) as PadCheck),
	resetPad: vi.fn(),
	setLocale: vi.fn(),
	close: vi.fn(),
	...(toMenu ? { toMenu } : {}),
});

test("Options offer the way back to the menu only during a run, name the round the run keeps, and ask first", () => {
	const toMenu = vi.fn();
	const a = optionsActions(toMenu);
	render(<Options view={optionsView} actions={a} />);
	expect(screen.queryByTestId("options-to-menu")).toBeNull();
	cleanup();
	render(<Options view={{ ...optionsView, leave: { round: 9 } }} actions={a} />);
	fireEvent.click(screen.getByTestId("options-to-menu"));
	expect(screen.getByTestId("leave-confirm").textContent).toContain("round 9");
	expect(toMenu).not.toHaveBeenCalled();
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(a.close).not.toHaveBeenCalled();
	expect(screen.getByTestId("options-to-menu")).toBeTruthy();
	fireEvent.click(screen.getByTestId("options-to-menu"));
	fireEvent.click(screen.getByTestId("leave-confirm-leave"));
	expect(toMenu).toHaveBeenCalledTimes(1);
});

test("the quit question is navigable with the D-pad and A answers it", async () => {
	const { controlsOf, createPadHarness, walkWithDpad } = await import("./nav/padHarness");
	const harness = createPadHarness();
	try {
		const quit = vi.fn();
		render(<Menu view={menuView} actions={menuActions(quit)} />);
		fireEvent.click(screen.getByTestId("menu-quit"));
		const dialog = screen.getByRole("dialog");
		harness.idle();
		const controls = controlsOf(dialog);
		expect(controls).toHaveLength(2);
		expect(walkWithDpad(harness, dialog)).toEqual(controls);
		// Down from "Ficar" lands on "Sair"; A confirms.
		(document.activeElement as HTMLElement | null)?.blur();
		controls[1]?.focus();
		harness.tap(0);
		expect(quit).toHaveBeenCalledTimes(1);
	} finally {
		harness.restore();
	}
});
