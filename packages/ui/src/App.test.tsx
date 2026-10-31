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
				setLocale: vi.fn(),
				close: vi.fn(),
			}}
		/>,
	);
	expect(screen.queryByTestId("speed-toggle")).toBeNull();
});
