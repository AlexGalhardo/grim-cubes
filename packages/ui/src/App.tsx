import type { Store } from "@gc/core";
import { type JSX, useSyncExternalStore } from "react";

export interface HudState {
	hp: number;
	maxHp: number;
	round: number;
}

export function App({ store }: { store: Store<HudState> }): JSX.Element {
	const hud = useSyncExternalStore(store.subscribe, store.get);
	return (
		<div className="pointer-events-none absolute inset-0 p-4 font-mono text-white">
			<div data-testid="hud-hp">
				HP {hud.hp}/{hud.maxHp}
			</div>
			<div data-testid="hud-round">Round {hud.round}</div>
		</div>
	);
}
