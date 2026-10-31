import type { Store } from "@gc/core";
import { type JSX, useSyncExternalStore } from "react";
import { Bar } from "./components/Bar/Bar";

export interface HudState {
	hp: number;
	maxHp: number;
	round: number;
}

export function App({ store }: { store: Store<HudState> }): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	return (
		<div className="pointer-events-none absolute inset-0 p-4 font-display text-bone [text-shadow:1px_1px_0_var(--color-night)]">
			<div className="w-64" data-testid="hud-hp">
				<Bar value={hud.hp} max={hud.maxHp} label="HP" />
			</div>
			<div data-testid="hud-round">Round {hud.round}</div>
		</div>
	);
}
