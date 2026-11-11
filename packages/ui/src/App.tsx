import { type PadStyle, padButtonName, type SaveNotice, type Store, t, type VirtualStick } from "@gc/core";
import { type CSSProperties, type JSX, useSyncExternalStore } from "react";
import { BossIntro, type BossViewModel } from "./components/BossBar/BossBar";
import { Caption } from "./components/Caption/Caption";
import { DashButton, type DashView } from "./components/DashButton/DashButton";
import { DemoEnd } from "./components/DemoEnd/DemoEnd";
import {
	Difficulty,
	type DifficultyActions,
	type DifficultyViewModel,
} from "./components/Difficulty/Difficulty";
import { Hud } from "./components/Hud/Hud";
import type { HudItem, HudWeapon } from "./components/Hud/hudTypes";
import { type CardView, LevelUp } from "./components/LevelUp/LevelUp";
import { Menu, type MenuActions, type MenuViewModel } from "./components/Menu/Menu";
import { MerchantPrompt, type MerchantPromptView } from "./components/MerchantPrompt/MerchantPrompt";
import { Notice } from "./components/Notice/Notice";
import { Options, type OptionsActions, type OptionsViewModel } from "./components/Options/Options";
import { Ossuary, type OssuaryActions, type OssuaryViewModel } from "./components/Ossuary/Ossuary";
import { type PauseActions, PauseMenu, type PauseViewModel } from "./components/PauseMenu/PauseMenu";
import { Results, type ResultsViewModel } from "./components/Results/Results";
import { Shop, type ShopActions, type ShopViewModel } from "./components/Shop/Shop";
import { Slots, type SlotsActions, type SlotsViewModel } from "./components/Slots/Slots";
import type { StatLineView } from "./components/StatList/StatList";
import { Tip, type TipId } from "./components/Tip/Tip";
import { VirtualJoystick } from "./components/VirtualJoystick/VirtualJoystick";
import { effectiveUiScale, useViewportHeight } from "./hooks/useViewport";
import { keyLabel } from "./keys";

/** Snapshot the game publishes to the store at 12 Hz (SDD 07). */
export interface HudState {
	hp: number;
	maxHp: number;
	round: number;
	level: number;
	xp: number;
	xpNeeded: number;
	gold: number;
	/** Whole seconds left in the round; 0 outside a timed round (the boss round has no timer). */
	secondsLeft: number;
	/** Souls the run has earned so far (the account gets them when it ends). */
	souls: number;
	/** Enemies killed in the run. */
	kills: number;
	/** The weapon in hand and its tier. */
	weapon: HudWeapon;
	/** The items the hero carries, grouped with a count; the same array until the owned set changes. */
	items: readonly HudItem[];
	/** The level-up offer on screen; empty when none. */
	cards: readonly CardView[];
	/** The elite chest offer on screen; empty when none. */
	chest: readonly CardView[];
	/** The shop screen between rounds; null during a round. */
	shop: ShopViewModel | null;
	/** Hero stats shown beside the shop offers. */
	stats: readonly StatLineView[];
	/** The end-of-run screen; null while playing. */
	results: ResultsViewModel | null;
	/** A save problem to tell the player about; null when the save loaded cleanly. */
	notice: SaveNotice | null;
	/** The boss HP bar while a boss fight runs; null otherwise. */
	boss: BossViewModel | null;
	/** The permanent tree; null while closed. */
	ossuary: OssuaryViewModel | null;
	/** The pre-run difficulty and seed screen; null while closed. */
	difficulty: DifficultyViewModel | null;
	/** The pause menu; null while playing. */
	pause: PauseViewModel | null;
	/** The save slot choice before a new game; null while closed. */
	slots: SlotsViewModel | null;
	/** The title screen; null once the player left it. */
	menu: MenuViewModel | null;
	/** The web demo is over (the Gravedigger fell): the DemoEnd screen shows and round 11 never starts. */
	demoEnd: boolean;
	/** The Merchant is waiting: direction and whether the hero is close enough to talk; null otherwise. */
	merchant: MerchantPromptView | null;
	/** The subtitle of the boss voice line being heard; null otherwise. */
	caption: string | null;
	/** `KeyboardEvent.code` of the reroll key (Options remap). */
	rerollKey: string;
	/** The last input came from the keyboard or mouse, or from a gamepad: hints show the matching key or button. */
	inputDevice: "keyboard" | "pad";
	/** Gamepad button of the reroll (standard mapping index). */
	padReroll: number;
	/** Gamepad button of the dash, which also talks to the Merchant. */
	padDash: number;
	/** Which label set the connected controller uses (Xbox letters, PlayStation symbols, neutral). */
	padStyle: PadStyle;
	/** Colour-blind mode on: rarities get shapes and a safer palette (`data-theme="cb"`). */
	colorblind: boolean;
	/** HUD scale in percent (90, 100, 125 or 150), applied through the `--ui-scale` variable on the root. */
	uiScale: number;
	/** Simulation speed, 1 to 3. */
	speed: number;
	/** The options screen; null while closed. */
	options: OptionsViewModel | null;
	/** Null until the Ossuary unlocks the dash. */
	dash: DashView | null;
	/** Level-up card rerolls left (Ossuary). */
	cardRerolls: number;
	/** Boss name during the 3 s intro; null otherwise. */
	bossIntro: string | null;
	/** The round 1 hint on screen; null when none. */
	tip: TipId | null;
	/** Red edge vignette strength, 0 (hidden) to 1: a hit pulse and the low-HP warning. */
	vignette: number;
}

export interface AppProps {
	store: Store<HudState>;
	/** Present on touch devices: shows the floating joystick. */
	stick?: VirtualStick | undefined;
	onChooseCard?: ((index: number) => void) | undefined;
	onRerollCards?: (() => void) | undefined;
	onChooseChest?: ((index: number) => void) | undefined;
	shopActions?: ShopActions | undefined;
	onRestart?: (() => void) | undefined;
	/** Back to the title menu from the results and the demo end (the host asks nothing more). */
	onMenu?: (() => void) | undefined;
	/** Opens the Steam store page (menu, demo end and the demo's results); the buttons are absent without it. */
	onWishlist?: (() => void) | undefined;
	difficultyActions?: DifficultyActions | undefined;
	slotsActions?: SlotsActions | undefined;
	pauseActions?: PauseActions | undefined;
	/** The pause button of the corner (touch screens); the keyboard and pad open the menu from the host. */
	onPause?: (() => void) | undefined;
	/** Opens the options screen from the gear button; the screen itself talks through `optionsActions`. */
	onOpenOptions?: (() => void) | undefined;
	optionsActions?: OptionsActions | undefined;
	/** Cycles the game speed 1x, 2x, 3x (the button beside Options, and the TAB key in the host). */
	onCycleSpeed?: (() => void) | undefined;
	menuActions?: MenuActions | undefined;
	onMerchantTalk?: (() => void) | undefined;
	/** Touch dash button held state. */
	onDashHold?: ((down: boolean) => void) | undefined;
	ossuaryActions?: (OssuaryActions & { open(): void }) | undefined;
	/** True in the web demo build: shows the DEMO seal. */
	demo?: boolean | undefined;
	/** Build release shown bottom-left on the menu and in play, so a tester knows which build they run. */
	version?: string | undefined;
}

export function App({
	store,
	stick,
	onChooseCard,
	onRerollCards,
	onChooseChest,
	shopActions,
	onRestart,
	onMenu,
	onWishlist,
	ossuaryActions,
	onDashHold,
	difficultyActions,
	slotsActions,
	pauseActions,
	onPause,
	onOpenOptions,
	optionsActions,
	onCycleSpeed,
	menuActions,
	onMerchantTalk,
	demo,
	version,
}: AppProps): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	const height = useViewportHeight();
	const usingPad = hud.inputDevice === "pad";
	const rerollHint = usingPad ? padButtonName(hud.padReroll, hud.padStyle) : keyLabel(hud.rerollKey);
	const talkHint = usingPad ? padButtonName(hud.padDash, hud.padStyle) : "Enter";
	const scale = effectiveUiScale(hud.uiScale, height) / 100;
	// The HUD chrome (buttons, version, seal) is not drawn while a dialog is open: it would sit on top of the dialog
	// and still take clicks.
	const dialogOpen =
		hud.cards.length > 0 ||
		hud.chest.length > 0 ||
		hud.shop !== null ||
		hud.results !== null ||
		hud.difficulty !== null ||
		hud.slots !== null ||
		hud.pause !== null ||
		hud.ossuary !== null ||
		hud.options !== null ||
		hud.menu !== null ||
		hud.demoEnd;
	return (
		<div
			className="pointer-events-none absolute inset-0 p-4 font-display text-bone [text-shadow:1px_1px_0_var(--color-night)]"
			style={{ "--ui-scale": scale, zoom: "var(--ui-scale)" } as CSSProperties}
			data-testid="hud-root"
			data-theme={hud.colorblind ? "cb" : undefined}
		>
			<Hud
				hud={hud}
				touch={stick !== undefined}
				showButtons={!dialogOpen}
				onPause={onPause}
				onCycleSpeed={onCycleSpeed}
				onOpenOptions={onOpenOptions}
			/>
			{hud.cards.length > 0 && onChooseCard ? (
				<LevelUp
					cards={hud.cards}
					stats={hud.stats}
					onChoose={onChooseCard}
					rerollsLeft={hud.cardRerolls}
					onReroll={onRerollCards}
					rerollKey={hud.rerollKey}
					rerollHint={rerollHint}
					rerollButton={hud.padReroll}
				/>
			) : null}
			{hud.chest.length > 0 && onChooseChest ? (
				<LevelUp
					cards={hud.chest}
					stats={hud.stats}
					onChoose={onChooseChest}
					title={t("chest.title")}
				/>
			) : null}
			{hud.shop && shopActions ? (
				<Shop
					view={hud.shop}
					stats={hud.stats}
					actions={shopActions}
					rerollKey={hud.rerollKey}
					rerollHint={rerollHint}
					rerollButton={hud.padReroll}
				/>
			) : null}
			{hud.menu && menuActions && !hud.difficulty && !hud.slots && !hud.ossuary && !hud.options ? (
				<Menu view={hud.menu} actions={menuActions} version={version} demo={demo} />
			) : null}
			{hud.demoEnd && onRestart && !hud.difficulty && !hud.ossuary ? (
				<DemoEnd
					onRestart={onRestart}
					onOssuary={ossuaryActions?.open}
					onMenu={onMenu}
					onWishlist={onWishlist}
				/>
			) : null}
			{hud.results && onRestart && !hud.demoEnd && !hud.difficulty && !hud.ossuary ? (
				<Results
					view={hud.results}
					onRestart={onRestart}
					onOssuary={ossuaryActions?.open}
					onMenu={onMenu}
					onWishlist={demo ? onWishlist : undefined}
				/>
			) : null}
			{hud.pause && !hud.options && pauseActions ? (
				<PauseMenu view={hud.pause} actions={pauseActions} />
			) : null}
			{hud.slots && slotsActions ? <Slots view={hud.slots} actions={slotsActions} /> : null}
			{hud.difficulty && difficultyActions ? (
				<Difficulty view={hud.difficulty} actions={difficultyActions} />
			) : null}
			{hud.ossuary && ossuaryActions ? <Ossuary view={hud.ossuary} actions={ossuaryActions} /> : null}
			{hud.options && optionsActions ? <Options view={hud.options} actions={optionsActions} /> : null}
			{hud.merchant && onMerchantTalk ? (
				<MerchantPrompt view={hud.merchant} hint={talkHint} onTalk={onMerchantTalk} />
			) : null}
			{hud.caption ? <Caption text={hud.caption} /> : null}
			{hud.bossIntro ? <BossIntro name={hud.bossIntro} /> : null}
			{hud.notice ? <Notice notice={hud.notice} /> : null}
			{hud.vignette > 0 ? (
				<div
					className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--color-blood-light)_100%)]"
					style={{ opacity: hud.vignette }}
					data-testid="hud-vignette"
				/>
			) : null}
			{hud.tip ? <Tip id={hud.tip} /> : null}
			{stick ? <VirtualJoystick stick={stick} /> : null}
			{stick && hud.dash && onDashHold ? <DashButton view={hud.dash} onHold={onDashHold} /> : null}
			{demo && !dialogOpen ? (
				<div
					className="absolute bottom-1 left-16 z-50 border-2 border-ember px-1 text-xs text-ember-light"
					data-testid="demo-seal"
				>
					{t("demo.badge")}
				</div>
			) : null}
			{version && !dialogOpen ? (
				<div className="absolute bottom-1 left-2 z-50 text-xs opacity-70" data-testid="build-version">
					v{version}
				</div>
			) : null}
		</div>
	);
}
