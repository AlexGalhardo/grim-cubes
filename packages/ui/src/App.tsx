import type { Store, VirtualStick } from "@gc/core";
import { type JSX, useSyncExternalStore } from "react";
import { Bar } from "./components/Bar/Bar";
import { VirtualJoystick } from "./components/VirtualJoystick/VirtualJoystick";

export interface HudState {
	hp: number;
	maxHp: number;
	round: number;
}

export interface AppProps {
	store: Store<HudState>;
	/** Present on touch devices: shows the floating joystick. */
	stick?: VirtualStick | undefined;
}

export function App({ store, stick }: AppProps): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	return (
		<div className="pointer-events-none absolute inset-0 p-4 font-display text-bone [text-shadow:1px_1px_0_var(--color-night)]">
			<div className="w-64" data-testid="hud-hp">
				<Bar value={hud.hp} max={hud.maxHp} label="HP" />
			</div>
			<div data-testid="hud-round">Round {hud.round}</div>
			{stick ? <VirtualJoystick stick={stick} /> : null}
		</div>
	);
}
