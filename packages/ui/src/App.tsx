import { type SaveNotice, type Store, t, type VirtualStick } from "@gc/core";
import { type JSX, useSyncExternalStore } from "react";
import { Bar } from "./components/Bar/Bar";
import { BossBar, BossIntro, type BossViewModel } from "./components/BossBar/BossBar";
import { DashButton, type DashView } from "./components/DashButton/DashButton";
import {
	Difficulty,
	type DifficultyActions,
	type DifficultyViewModel,
} from "./components/Difficulty/Difficulty";
import { type CardView, LevelUp } from "./components/LevelUp/LevelUp";
import { Notice } from "./components/Notice/Notice";
import { Options, type OptionsActions, type OptionsViewModel } from "./components/Options/Options";
import { Ossuary, type OssuaryActions, type OssuaryViewModel } from "./components/Ossuary/Ossuary";
import { Results, type ResultsViewModel } from "./components/Results/Results";
import {
	type PortraitFactory,
	Shop,
	type ShopActions,
	type ShopViewModel,
	type StatLineView,
} from "./components/Shop/Shop";
import { Tip, type TipId } from "./components/Tip/Tip";
import { VirtualJoystick } from "./components/VirtualJoystick/VirtualJoystick";

/** Snapshot the game publishes to the store at 12 Hz (SDD 07). */
export interface HudState {
	hp: number;
	maxHp: number;
	round: number;
	level: number;
	xp: number;
	xpNeeded: number;
	gold: number;
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
	/** Draws the animated Merchant into the Shop's portrait canvas. */
	shopPortrait?: PortraitFactory | undefined;
	onRestart?: (() => void) | undefined;
	difficultyActions?: DifficultyActions | undefined;
	/** Opens the options screen from the gear button; the screen itself talks through `optionsActions`. */
	onOpenOptions?: (() => void) | undefined;
	optionsActions?: OptionsActions | undefined;
	/** Cycles the game speed 1x, 2x, 3x (the button beside Options, and the TAB key in the host). */
	onCycleSpeed?: (() => void) | undefined;
	/** Touch dash button held state. */
	onDashHold?: ((down: boolean) => void) | undefined;
	ossuaryActions?: (OssuaryActions & { open(): void }) | undefined;
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
	shopPortrait,
	onRestart,
	ossuaryActions,
	onDashHold,
	difficultyActions,
	onOpenOptions,
	optionsActions,
	onCycleSpeed,
	version,
}: AppProps): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	return (
		<div className="pointer-events-none absolute inset-0 p-4 font-display text-bone [text-shadow:1px_1px_0_var(--color-night)]">
			<div className="flex w-64 flex-col gap-1" data-testid="hud-hp">
				<Bar value={hud.hp} max={hud.maxHp} label={t("hud.hp")} />
				<Bar value={hud.xp} max={hud.xpNeeded} variant="xp" label={t("hud.xp")} />
			</div>
			<div data-testid="hud-round">
				{t("hud.round", { round: hud.round })} · {t("hud.level", { level: hud.level })} ·{" "}
				<span className="text-currency">{hud.gold}</span>
			</div>
			{hud.cards.length > 0 && onChooseCard ? (
				<LevelUp
					cards={hud.cards}
					onChoose={onChooseCard}
					rerollsLeft={hud.cardRerolls}
					onReroll={onRerollCards}
				/>
			) : null}
			{hud.chest.length > 0 && onChooseChest ? (
				<LevelUp cards={hud.chest} onChoose={onChooseChest} title={t("chest.title")} />
			) : null}
			{hud.shop && shopActions ? (
				<Shop view={hud.shop} stats={hud.stats} actions={shopActions} portrait={shopPortrait} />
			) : null}
			{hud.results && onRestart && !hud.difficulty && !hud.ossuary ? (
				<Results view={hud.results} onRestart={onRestart} onOssuary={ossuaryActions?.open} />
			) : null}
			{hud.difficulty && difficultyActions ? (
				<Difficulty view={hud.difficulty} actions={difficultyActions} />
			) : null}
			{hud.ossuary && ossuaryActions ? <Ossuary view={hud.ossuary} actions={ossuaryActions} /> : null}
			{!hud.options && (onOpenOptions || onCycleSpeed) ? (
				<div
					className="pointer-events-none absolute top-2 right-2 z-20 flex gap-2"
					data-testid="hud-corner"
				>
					{onCycleSpeed ? (
						<button
							type="button"
							data-testid="speed-toggle"
							aria-label={t("hud.speed", { speed: hud.speed })}
							onClick={onCycleSpeed}
							className={`pointer-events-auto min-h-12 min-w-12 border-2 bg-night-2 px-2 font-display text-sm focus-visible:outline-2 focus-visible:outline-ember ${hud.speed === 1 ? "border-iron-dark text-bone-dark opacity-70" : "border-ember text-ember-light"} hover:border-ember hover:text-ember-light`}
						>
							{hud.speed}x
						</button>
					) : null}
					{onOpenOptions ? (
						<button
							type="button"
							data-testid="options-open"
							onClick={onOpenOptions}
							className="pointer-events-auto min-h-12 border-2 border-iron-dark bg-night-2 px-3 font-display text-sm text-bone hover:border-ember hover:text-ember-light focus-visible:outline-2 focus-visible:outline-ember"
						>
							{t("options.open")}
						</button>
					) : null}
				</div>
			) : null}
			{hud.options && optionsActions ? <Options view={hud.options} actions={optionsActions} /> : null}
			{hud.boss ? <BossBar boss={hud.boss} /> : null}
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
			{version ? (
				<div className="absolute bottom-1 left-2 z-50 text-xs opacity-70" data-testid="build-version">
					v{version}
				</div>
			) : null}
		</div>
	);
}
