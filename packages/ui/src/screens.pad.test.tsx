import { readFileSync } from "node:fs";
import { createKeyMap, createPadMap } from "@gc/core";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { DemoEnd } from "./components/DemoEnd/DemoEnd";
import { Difficulty } from "./components/Difficulty/Difficulty";
import { LevelUp } from "./components/LevelUp/LevelUp";
import { Menu } from "./components/Menu/Menu";
import { Options } from "./components/Options/Options";
import { Ossuary } from "./components/Ossuary/Ossuary";
import { Results } from "./components/Results/Results";
import { Shop } from "./components/Shop/Shop";
import { controlsOf, createPadHarness, walkWithDpad } from "./nav/padHarness";

let harness: ReturnType<typeof createPadHarness> | null = null;

afterEach(() => {
	cleanup();
	harness?.restore();
	harness = null;
});

/**
 * B-04-02: every screen can be used with the controller alone. The D-pad walks the focus through every control
 * of the screen, in order, and wraps around.
 */
function assertPadNavigable(ui: ReactElement, minimum: number): void {
	harness = createPadHarness();
	render(ui);
	const dialog = screen.getByRole("dialog");
	// The first poll of a screen only records the pad state.
	harness.idle();
	const controls = controlsOf(dialog);
	expect(controls.length).toBeGreaterThanOrEqual(minimum);
	const visited = walkWithDpad(harness, dialog);
	expect(new Set(visited).size).toBe(controls.length);
	expect(visited).toEqual(controls);
	// The walk ended back on the first control: Up goes to the last one.
	const last = visited[visited.length - 1] as HTMLElement;
	harness.tap(12);
	expect(document.activeElement).toBe(last);
}

const slot = (id: string, over: Record<string, unknown> = {}) => ({
	kind: "item" as const,
	id,
	name: id,
	lines: ["+3 armadura"],
	price: 20,
	tier: 2,
	locked: false,
	sold: false,
	affordable: true,
	...over,
});

test("the focus ring is drawn on every control that takes focus (theme rule)", () => {
	const css = readFileSync("packages/ui/src/theme.css", "utf8");
	expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-ember\)/);
});

test("the title menu is navigable with the D-pad", () => {
	assertPadNavigable(
		<Menu
			view={{ records: [{ id: "normal", name: "Normal", round: 3 }] }}
			actions={{ play: vi.fn(), ossuary: vi.fn(), options: vi.fn() }}
		/>,
		3,
	);
});

test("the difficulty screen is navigable with the D-pad", () => {
	assertPadNavigable(
		<Difficulty
			view={{
				selected: "normal",
				options: [
					{ id: "normal", name: "Normal", summary: "", locked: false, requirement: "" },
					{ id: "grim", name: "Sombrio", summary: "", locked: false, requirement: "" },
					{ id: "nightmare", name: "Pesadelo", summary: "", locked: true, requirement: "x" },
				],
			}}
			actions={{ start: vi.fn(), cancel: vi.fn() }}
		/>,
		5,
	);
});

test("the ossuary is navigable with the D-pad", () => {
	assertPadNavigable(
		<Ossuary
			view={{
				souls: 60,
				refund: 50,
				branches: [
					{
						id: "flesh",
						name: "Carne",
						nodes: [
							{ id: "flesh_1", lines: ["+10 HP"], cost: 50, state: "owned", affordable: true },
							{
								id: "flesh_2",
								lines: ["+1 regen"],
								cost: 100,
								state: "available",
								affordable: true,
							},
						],
					},
				],
			}}
			actions={{ buy: vi.fn(), reset: vi.fn(), close: vi.fn() }}
		/>,
		2,
	);
});

test("the options screen, remap rows included, is navigable with the D-pad", () => {
	assertPadNavigable(
		<Options
			view={{
				preset: "auto",
				presets: [{ id: "high", name: "Alto" }],
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
			}}
			actions={{
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
		20,
	);
});

test("the shop is navigable with the D-pad", () => {
	assertPadNavigable(
		<Shop
			view={{ gold: 50, rerollPrice: 11, slots: [slot("a"), slot("b"), slot("c", { sold: true })] }}
			stats={[{ label: "Armadura", value: "0" }]}
			actions={{ buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() }}
		/>,
		6,
	);
});

test("the level-up offer and the elite chest offer are navigable with the D-pad", () => {
	const cards = [
		{ id: "armor", name: "+3 armadura", double: false },
		{ id: "damage", name: "+4% dano", double: true },
		{ id: "luck", name: "+4 sorte", double: false },
	];
	assertPadNavigable(<LevelUp cards={cards} onChoose={vi.fn()} rerollsLeft={1} onReroll={vi.fn()} />, 4);
	cleanup();
	harness?.restore();
	assertPadNavigable(<LevelUp cards={cards} onChoose={vi.fn()} title="Baú" />, 3);
});

test("the results screen is navigable with the D-pad", () => {
	assertPadNavigable(
		<Results
			view={{
				round: 12,
				kills: 340,
				damage: 5120,
				cause: "Carcaça",
				build: ["Espada"],
				souls: 285,
				totalSouls: 1285,
				record: 12,
				newRecord: true,
				seed: 42,
			}}
			onRestart={vi.fn()}
			onOssuary={vi.fn()}
		/>,
		2,
	);
});

test("the demo end is navigable with the D-pad, skipping the disabled store buttons", () => {
	assertPadNavigable(<DemoEnd onRestart={vi.fn()} onOssuary={vi.fn()} />, 2);
	for (const control of controlsOf(screen.getByRole("dialog"))) {
		expect((control as HTMLButtonElement).disabled).not.toBe(true);
	}
});
