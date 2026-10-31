import type { SaveNotice, Store, VirtualStick } from "@gc/core";
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
import { Ossuary, type OssuaryActions, type OssuaryViewModel } from "./components/Ossuary/Ossuary";
import { Results, type ResultsViewModel } from "./components/Results/Results";
import { Shop, type ShopActions, type ShopViewModel, type StatLineView } from "./components/Shop/Shop";
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
	/** Null until the Ossuary unlocks the dash. */
	dash: DashView | null;
	/** Boss name during the 3 s intro; null otherwise. */
	bossIntro: string | null;
	/** Red edge vignette strength, 0 (hidden) to 1: a hit pulse and the low-HP warning. */
	vignette: number;
}

export interface AppProps {
	store: Store<HudState>;
	/** Present on touch devices: shows the floating joystick. */
	stick?: VirtualStick | undefined;
	onChooseCard?: ((index: number) => void) | undefined;
	onChooseChest?: ((index: number) => void) | undefined;
	shopActions?: ShopActions | undefined;
	onRestart?: (() => void) | undefined;
	difficultyActions?: DifficultyActions | undefined;
	/** Touch dash button held state. */
	onDashHold?: ((down: boolean) => void) | undefined;
	ossuaryActions?: (OssuaryActions & { open(): void }) | undefined;
}

export function App({
	store,
	stick,
	onChooseCard,
	onChooseChest,
	shopActions,
	onRestart,
	ossuaryActions,
	onDashHold,
	difficultyActions,
}: AppProps): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	return (
		<div className="pointer-events-none absolute inset-0 p-4 font-display text-bone [text-shadow:1px_1px_0_var(--color-night)]">
			<div className="flex w-64 flex-col gap-1" data-testid="hud-hp">
				<Bar value={hud.hp} max={hud.maxHp} label="HP" />
				<Bar value={hud.xp} max={hud.xpNeeded} variant="xp" label="XP" />
			</div>
			<div data-testid="hud-round">
				Round {hud.round} · Lv {hud.level} · <span className="text-currency">{hud.gold}</span>
			</div>
			{hud.cards.length > 0 && onChooseCard ? (
				<LevelUp cards={hud.cards} onChoose={onChooseCard} />
			) : null}
			{hud.chest.length > 0 && onChooseChest ? (
				<LevelUp cards={hud.chest} onChoose={onChooseChest} title="Baú Lendário" />
			) : null}
			{hud.shop && shopActions ? (
				<Shop view={hud.shop} stats={hud.stats} actions={shopActions} />
			) : null}
			{hud.results && onRestart && !hud.difficulty && !hud.ossuary ? (
				<Results view={hud.results} onRestart={onRestart} onOssuary={ossuaryActions?.open} />
			) : null}
			{hud.difficulty && difficultyActions ? (
				<Difficulty view={hud.difficulty} actions={difficultyActions} />
			) : null}
			{hud.ossuary && ossuaryActions ? <Ossuary view={hud.ossuary} actions={ossuaryActions} /> : null}
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
			{stick ? <VirtualJoystick stick={stick} /> : null}
			{stick && hud.dash && onDashHold ? <DashButton view={hud.dash} onHold={onDashHold} /> : null}
		</div>
	);
}
