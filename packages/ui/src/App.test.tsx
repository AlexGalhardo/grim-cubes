import { createKeyMap, createPadMap, createStore } from "@gc/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App, type HudState } from "./App";
import { announcedSeconds } from "./components/MerchantPrompt/MerchantPrompt";
import { effectiveUiScale } from "./hooks/useViewport";

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
	rerollKey: "KeyR",
	inputDevice: "keyboard",
	padReroll: 2,
	caption: null,
	merchant: null,
	colorblind: false,
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
			keys: createKeyMap(),
			pad: createPadMap(),
			subtitles: true,
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
				setSubtitles: vi.fn(),
				setKey: vi.fn(() => ({ ok: true }) as const),
				resetKeys: vi.fn(),
				setPadButton: vi.fn(() => ({ ok: true }) as const),
				resetPad: vi.fn(),
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
	// The seal and the version sit under the dialog, not on it.
	expect(screen.queryByTestId("demo-seal")).toBeNull();
	expect(
		(screen.getByRole("button", { name: "Adicionar à lista de desejos" }) as HTMLButtonElement).disabled,
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

test("colour-blind mode puts data-theme cb on the HUD root and the shop shows a shape mark per tier", () => {
	const shop = {
		gold: 10,
		rerollPrice: 5,
		slots: [
			{
				kind: "item" as const,
				id: "a",
				name: "A",
				lines: [],
				price: 1,
				tier: 3,
				locked: false,
				sold: false,
				affordable: true,
			},
		],
	};
	render(
		<App
			store={createStore({ ...hud(1), colorblind: true, shop })}
			shopActions={{ buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() }}
		/>,
	);
	expect(screen.getByTestId("hud-root").getAttribute("data-theme")).toBe("cb");
	expect(screen.getByTestId("rarity-mark-0").getAttribute("data-tier")).toBe("3");
	cleanup();
	render(<App store={createStore(hud(1))} />);
	expect(screen.getByTestId("hud-root").getAttribute("data-theme")).toBeNull();
});

test("at 150% on 800x360 the scale is capped to 125% and the dialog scales with the root", () => {
	window.innerWidth = 800;
	window.innerHeight = 360;
	const shop = { gold: 10, rerollPrice: 5, slots: [] };
	render(
		<App
			store={createStore({ ...hud(1), uiScale: 150, shop })}
			shopActions={{ buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() }}
		/>,
	);
	const root = screen.getByTestId("hud-root");
	expect(root.style.getPropertyValue("--ui-scale")).toBe("1.25");
	// The dialog is a descendant of the root, so one zoom scales it too; it scrolls instead of being clipped.
	expect(root.contains(screen.getByRole("dialog"))).toBe(true);
	expect(screen.getByRole("dialog").className).toContain("overflow-y-auto");
});

test("the 150% scale is kept on tall screens and capped on screens 414 px tall or less", () => {
	expect(effectiveUiScale(150, 1080)).toBe(150);
	expect(effectiveUiScale(150, 415)).toBe(150);
	expect(effectiveUiScale(150, 414)).toBe(125);
	expect(effectiveUiScale(100, 360)).toBe(100);
	window.innerHeight = 1080;
	render(<App store={createStore({ ...hud(1), uiScale: 150 })} />);
	expect(screen.getByTestId("hud-root").style.getPropertyValue("--ui-scale")).toBe("1.5");
	cleanup();
	window.innerHeight = 414;
	render(<App store={createStore({ ...hud(1), uiScale: 150 })} />);
	expect(screen.getByTestId("hud-root").style.getPropertyValue("--ui-scale")).toBe("1.25");
});

test("the corner buttons, the version and the DEMO seal are not drawn while a dialog is open", () => {
	const shop = { gold: 10, rerollPrice: 5, slots: [] };
	const actions = { buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() };
	render(
		<App
			store={createStore({ ...hud(1), shop })}
			shopActions={actions}
			onOpenOptions={vi.fn()}
			onCycleSpeed={vi.fn()}
			version="0.3.0"
			demo
		/>,
	);
	expect(screen.getByRole("dialog")).toBeTruthy();
	for (const id of ["hud-corner", "speed-toggle", "options-open", "build-version", "demo-seal"]) {
		expect(screen.queryByTestId(id), id).toBeNull();
	}
	cleanup();
	render(
		<App
			store={createStore(hud(1))}
			onOpenOptions={vi.fn()}
			onCycleSpeed={vi.fn()}
			version="0.3.0"
			demo
		/>,
	);
	for (const id of ["hud-corner", "speed-toggle", "options-open", "build-version", "demo-seal"]) {
		expect(screen.getByTestId(id), id).toBeTruthy();
	}
	expect(screen.getByTestId("build-version").textContent).toBe("v0.3.0");
});

test("a boss subtitle shows as a polite status and disappears with the caption", () => {
	render(<App store={createStore({ ...hud(1), caption: "Mais uma alma para as minhas covas." })} />);
	const caption = screen.getByTestId("caption");
	expect(caption.textContent).toBe("Mais uma alma para as minhas covas.");
	expect(caption.getAttribute("role")).toBe("status");
	cleanup();
	render(<App store={createStore(hud(1))} />);
	expect(screen.queryByTestId("caption")).toBeNull();
});

test("the Merchant prompt points toward him, asks to walk while far and offers the talk action when near", () => {
	const onTalk = vi.fn();
	render(
		<App
			store={createStore({ ...hud(1), merchant: { angle: Math.PI / 2, near: false, secondsLeft: 12 } })}
			onMerchantTalk={onTalk}
		/>,
	);
	const prompt = screen.getByTestId("merchant-prompt") as HTMLButtonElement;
	expect(prompt.textContent).toContain("Vá até o Mercador");
	expect(prompt.disabled).toBe(true);
	expect(screen.getByTestId("merchant-arrow").style.transform).toBe(`rotate(${Math.PI / 2}rad)`);
	fireEvent.click(prompt);
	expect(onTalk).not.toHaveBeenCalled();
	cleanup();
	render(
		<App
			store={createStore({ ...hud(1), merchant: { angle: 0, near: true, secondsLeft: 3 } })}
			onMerchantTalk={onTalk}
		/>,
	);
	const near = screen.getByTestId("merchant-prompt") as HTMLButtonElement;
	expect(near.textContent).toContain("Fale com o Mercador [Enter]");
	fireEvent.click(near);
	expect(onTalk).toHaveBeenCalledTimes(1);
});

test("no Merchant prompt without a waiting Merchant", () => {
	render(<App store={createStore(hud(1))} onMerchantTalk={vi.fn()} />);
	expect(screen.queryByTestId("merchant-prompt")).toBeNull();
});

test("the Merchant prompt counts down and the screen reader hears it only every 5 seconds", () => {
	render(
		<App
			store={createStore({ ...hud(1), merchant: { angle: 0, near: false, secondsLeft: 12 } })}
			onMerchantTalk={vi.fn()}
		/>,
	);
	expect(screen.getByTestId("merchant-countdown").textContent).toBe("Loja em 12 s");
	expect(screen.getByTestId("merchant-announce").textContent).toBe("Loja em 15 s");
	expect(screen.getByTestId("merchant-announce").getAttribute("aria-live")).toBe("polite");
	expect(screen.getByTestId("merchant-countdown").getAttribute("aria-hidden")).toBe("true");
	expect([20, 19, 16, 15, 14, 1, 0].map(announcedSeconds)).toEqual([20, 20, 20, 15, 15, 5, 0]);
});

test("the reroll hint names the keyboard key, or the pad button once the pad was used last", () => {
	const cards = [{ id: "a", name: "A", double: false }];
	render(
		<App
			store={createStore({ ...hud(1), cards, cardRerolls: 1 })}
			onChooseCard={vi.fn()}
			onRerollCards={vi.fn()}
		/>,
	);
	expect(screen.getByTestId("levelup-reroll").textContent).toContain("[R]");
	cleanup();
	render(
		<App
			store={createStore({ ...hud(1), cards, cardRerolls: 1, inputDevice: "pad" })}
			onChooseCard={vi.fn()}
			onRerollCards={vi.fn()}
		/>,
	);
	expect(screen.getByTestId("levelup-reroll").textContent).toContain("[X]");
	cleanup();
	render(
		<App
			store={createStore({ ...hud(1), cards, cardRerolls: 1, rerollKey: "KeyT" })}
			onChooseCard={vi.fn()}
			onRerollCards={vi.fn()}
		/>,
	);
	expect(screen.getByTestId("levelup-reroll").textContent).toContain("[T]");
});
