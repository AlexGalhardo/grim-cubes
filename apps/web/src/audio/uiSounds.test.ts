import type { HudState } from "@gc/ui";
import { expect, test } from "vitest";
import { screenOf, type UiSoundState, uiSounds } from "./uiSounds";

const run = (over: Partial<UiSoundState> = {}): UiSoundState => ({
	cards: [],
	shop: null,
	results: null,
	ossuary: null,
	menu: null,
	slots: null,
	difficulty: null,
	heroes: null,
	daily: null,
	options: null,
	pause: null,
	demoEnd: false,
	secondsLeft: 40,
	...over,
});
const card = (id: string, rarity: number): { id: string; rarity: number } => ({ id, rarity });
const item = (slot: string, tier: number): { slot: string; level: number; tier: number; sold: boolean } => ({
	slot,
	level: tier,
	tier,
	sold: false,
});
const tree = (owned: number): UiSoundState["ossuary"] => ({
	branches: [{ nodes: [0, 1, 2].map((i) => ({ state: i < owned ? "owned" : "available" })) }],
});

test("HudState fits the sound state without a conversion", () => {
	const fits = (state: HudState): UiSoundState => state;
	expect(typeof fits).toBe("function");
});

test("opening the level-up plays its sting and the best rarity on offer", () => {
	const open = run({ cards: [card("a", 1), card("b", 4), card("c", 2)] });
	expect(uiSounds(run(), open)).toEqual(["sfx_ui_levelup_open", "sfx_ui_rarity_legendary"]);
	expect(uiSounds(run(), run({ cards: [card("a", 1)] }))).toEqual(["sfx_ui_levelup_open"]);
});

test("each rarity from Rare to Mythic has its own reveal sound", () => {
	const ids = [2, 3, 4, 5].map((rarity) =>
		uiSounds(run({ cards: [card("w", 1)] }), run({ cards: [card("x", rarity)] })),
	);
	expect(ids).toEqual([
		["sfx_ui_rarity_rare"],
		["sfx_ui_rarity_epic"],
		["sfx_ui_rarity_legendary"],
		["sfx_ui_rarity_mythic"],
	]);
});

test("picking a card plays the card sound; a reroll reveals again without the opening sting", () => {
	const open = run({ cards: [card("a", 1), card("b", 1)] });
	expect(uiSounds(open, run())).toEqual(["sfx_ui_card"]);
	expect(uiSounds(open, run({ cards: [card("c", 3), card("d", 1)] }))).toEqual(["sfx_ui_rarity_epic"]);
	expect(uiSounds(open, open)).toEqual([]);
});

test("shop offers reveal their best item rarity on open and after a reroll, not on every publish", () => {
	const shop = run({
		shop: { slots: [item("i1", 1), item("i2", 3)] },
	});
	expect(uiSounds(run(), shop)).toContain("sfx_ui_rarity_epic");
	expect(uiSounds(shop, shop)).toEqual([]);
	const bought = run({ shop: { slots: [item("i1", 1), { ...item("i2", 3), sold: true }] } });
	expect(uiSounds(run({ shop: { slots: [item("i1", 1), item("i2", 3)] } }), bought)).toEqual([]);
	const rerolled = run({ shop: { slots: [item("i3", 5)] } });
	expect(uiSounds(shop, rerolled)).toEqual(["sfx_ui_rarity_mythic"]);
});

test("menu screens change with a transition; the results screen has its own sound and the soul count", () => {
	const menu = run({ menu: {} });
	expect(uiSounds(menu, run({ menu: {}, slots: {} }))).toEqual(["sfx_ui_transition"]);
	expect(uiSounds(run({ menu: {}, slots: {} }), run({ menu: {}, difficulty: {} }))).toEqual([
		"sfx_ui_transition",
	]);
	expect(uiSounds(run(), run({ results: { souls: 40 } }))).toEqual(["sfx_ui_results", "sfx_ui_souls"]);
	expect(uiSounds(run(), run({ results: { souls: 0 } }))).toEqual(["sfx_ui_results"]);
	// Back into the run is silent: the music change carries it.
	expect(uiSounds(run({ difficulty: {} }), run())).toEqual([]);
});

test("buying an Ossuary node plays the unlock", () => {
	const before = run({ ossuary: tree(1) });
	expect(uiSounds(before, run({ ossuary: tree(2) }))).toEqual(["sfx_ui_unlock"]);
	expect(uiSounds(before, before)).toEqual([]);
});

test("the timer ticks once per second over the last five seconds of a round only", () => {
	expect(uiSounds(run({ secondsLeft: 6 }), run({ secondsLeft: 5 }))).toEqual(["sfx_ui_timer_tick"]);
	expect(uiSounds(run({ secondsLeft: 5 }), run({ secondsLeft: 5 }))).toEqual([]);
	expect(uiSounds(run({ secondsLeft: 7 }), run({ secondsLeft: 6 }))).toEqual([]);
	expect(uiSounds(run({ secondsLeft: 1 }), run({ secondsLeft: 0 }))).toEqual([]);
	const paused = run({ secondsLeft: 3, pause: {} });
	expect(uiSounds(run({ secondsLeft: 4, pause: {} }), paused)).toEqual([]);
});

test("the screen order puts overlays above what they cover", () => {
	expect(screenOf(run({ menu: {}, options: {} }))).toBe("options");
	expect(screenOf(run({ shop: { slots: [] }, cards: [card("a", 1)] }))).toBe("levelup");
	expect(screenOf(run())).toBe("run");
});

test("choosing a hero plays its sting; the hero and daily screens change with a transition", () => {
	expect(uiSounds(run({ menu: {}, heroes: {} }), run({ menu: {}, difficulty: {} }))).toEqual([
		"sfx_ui_hero_select",
	]);
	expect(uiSounds(run({ menu: {}, slots: {} }), run({ menu: {}, heroes: {} }))).toEqual([
		"sfx_ui_transition",
	]);
	expect(uiSounds(run({ menu: {} }), run({ menu: {}, daily: {} }))).toEqual(["sfx_ui_transition"]);
	expect(uiSounds(run({ menu: {}, heroes: {} }), run({ menu: {}, slots: {} }))).toEqual([
		"sfx_ui_transition",
	]);
});
