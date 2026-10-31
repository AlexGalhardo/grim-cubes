import type { Store, VirtualStick } from "@gc/core";
import { type JSX, useSyncExternalStore } from "react";
import { Bar } from "./components/Bar/Bar";
import { type CardView, LevelUp } from "./components/LevelUp/LevelUp";
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
	/** The shop screen between rounds; null during a round. */
	shop: ShopViewModel | null;
	/** Hero stats shown beside the shop offers. */
	stats: readonly StatLineView[];
}

export interface AppProps {
	store: Store<HudState>;
	/** Present on touch devices: shows the floating joystick. */
	stick?: VirtualStick | undefined;
	onChooseCard?: ((index: number) => void) | undefined;
	shopActions?: ShopActions | undefined;
}

export function App({ store, stick, onChooseCard, shopActions }: AppProps): JSX.Element {
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
			{hud.shop && shopActions ? (
				<Shop view={hud.shop} stats={hud.stats} actions={shopActions} />
			) : null}
			{stick ? <VirtualJoystick stick={stick} /> : null}
		</div>
	);
}
