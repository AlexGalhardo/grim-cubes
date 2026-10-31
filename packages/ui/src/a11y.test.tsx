import { createKeyMap, createPadMap } from "@gc/core";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { DemoEnd } from "./components/DemoEnd/DemoEnd";
import { Difficulty } from "./components/Difficulty/Difficulty";
import { LevelUp } from "./components/LevelUp/LevelUp";
import { Menu } from "./components/Menu/Menu";
import { Options } from "./components/Options/Options";
import { Ossuary } from "./components/Ossuary/Ossuary";
import { PauseMenu } from "./components/PauseMenu/PauseMenu";
import { Results } from "./components/Results/Results";
import { Shop } from "./components/Shop/Shop";
import { Slots } from "./components/Slots/Slots";

afterEach(cleanup);

/**
 * axe-core over the main screens (A-07-02). jsdom has no layout or painting, so the rules that need them
 * (colour contrast, visibility of landmarks) are off; what remains is names, roles, labels and ARIA validity.
 */
async function violations(ui: ReactElement): Promise<string[]> {
	const { container } = render(ui);
	const result = await axe.run(container, {
		rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
	});
	return result.violations
		.filter((v) => v.impact === "serious" || v.impact === "critical")
		.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
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

test("the title menu has no serious violations", async () => {
	expect(
		await violations(
			<Menu
				view={{ records: [{ id: "normal", name: "Normal", round: 12 }], continue: null }}
				actions={{ resume: vi.fn(), play: vi.fn(), ossuary: vi.fn(), options: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

const slotViews = [
	{
		slot: 1,
		name: "Slot 1",
		state: "used" as const,
		lastPlayed: "31/10/2026",
		bestRound: 12,
		souls: 285,
		runRound: 5,
	},
	{
		slot: 2,
		name: "Slot 2",
		state: "empty" as const,
		lastPlayed: "",
		bestRound: 0,
		souls: 0,
		runRound: null,
	},
];

test("the pause menu has no serious violations", async () => {
	expect(
		await violations(
			<PauseMenu view={{ round: 3 }} actions={{ resume: vi.fn(), options: vi.fn(), quit: vi.fn() }} />,
		),
	).toEqual([]);
});

test("the slot screen has no serious violations", async () => {
	expect(
		await violations(
			<Slots
				view={{ slots: slotViews }}
				actions={{ choose: vi.fn(), erase: vi.fn(), cancel: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

test("the slot screen's overwrite question has no serious violations", async () => {
	const { fireEvent } = await import("@testing-library/react");
	const { container } = render(
		<Slots view={{ slots: slotViews }} actions={{ choose: vi.fn(), erase: vi.fn(), cancel: vi.fn() }} />,
	);
	fireEvent.click(container.querySelector<HTMLElement>("[data-testid=slot-1]") as HTMLElement);
	const result = await axe.run(container, {
		rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
	});
	expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("the title menu with Continuar has no serious violations", async () => {
	expect(
		await violations(
			<Menu
				view={{ records: [], continue: { slotName: "Slot 2", runRound: 7 } }}
				actions={{ resume: vi.fn(), play: vi.fn(), ossuary: vi.fn(), options: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

test("the difficulty screen has no serious violations", async () => {
	expect(
		await violations(
			<Difficulty
				view={{
					selected: "normal",
					options: [
						{ id: "normal", name: "Normal", summary: "Base", locked: false, requirement: "" },
						{
							id: "grim",
							name: "Sombrio",
							summary: "x",
							locked: true,
							requirement: "Recorde 20",
						},
					],
				}}
				actions={{ start: vi.fn(), cancel: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

test("the options screen has no serious violations", async () => {
	expect(
		await violations(
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
		),
	).toEqual([]);
});

test("the shop has no serious violations", async () => {
	expect(
		await violations(
			<Shop
				view={{ gold: 50, rerollPrice: 11, slots: [slot("a"), slot("b", { sold: true, tier: 3 })] }}
				stats={[{ label: "Armadura", value: "0" }]}
				actions={{ buy: vi.fn(), toggleLock: vi.fn(), reroll: vi.fn(), next: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

test("the level-up offer has no serious violations", async () => {
	expect(
		await violations(
			<LevelUp
				cards={[
					{ id: "armor", name: "+3 armadura", double: false },
					{ id: "damage", name: "+4% dano", double: true },
				]}
				onChoose={vi.fn()}
			/>,
		),
	).toEqual([]);
});

test("the ossuary has no serious violations", async () => {
	expect(
		await violations(
			<Ossuary
				view={{
					souls: 60,
					refund: 50,
					branches: [
						{
							id: "flesh",
							name: "Carne",
							nodes: [
								{
									id: "flesh_1",
									lines: ["+10 HP"],
									cost: 50,
									state: "owned",
									affordable: true,
								},
								{
									id: "flesh_2",
									lines: ["+1 regen"],
									cost: 100,
									state: "locked",
									affordable: false,
								},
							],
						},
					],
				}}
				actions={{ buy: vi.fn(), reset: vi.fn(), close: vi.fn() }}
			/>,
		),
	).toEqual([]);
});

test("the results and the demo end have no serious violations", async () => {
	expect(
		await violations(
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
			/>,
		),
	).toEqual([]);
	cleanup();
	expect(await violations(<DemoEnd onRestart={vi.fn()} />)).toEqual([]);
});

test("the harness does see a serious violation (an unnamed button)", async () => {
	expect(await violations(<button type="button" />)).not.toEqual([]);
});
