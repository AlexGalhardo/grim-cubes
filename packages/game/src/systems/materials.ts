import { type EventBuffer, EventType } from "../ecs/events";
import type { Progress } from "./loot";

/** Upgrade materials (ADR-0030): an elite always drops a fragment, a boss always drops a relic. */
export const Material = { EliteFragment: 1, Relic: 2 } as const;
export type MaterialKind = (typeof Material)[keyof typeof Material];

export interface Materials {
	/** Credits `amount` of `kind` to the run at once, so a drop can never be missed, and tells the render and audio. */
	drop(kind: MaterialKind, amount: number, x: number, z: number): void;
}

export function createMaterials(progress: Progress, events: EventBuffer): Materials {
	return {
		drop(kind, amount, x, z): void {
			if (kind === Material.EliteFragment) progress.eliteFragments += amount;
			else progress.relics += amount;
			events.push(EventType.MaterialDropped, x, z, kind, 0);
		},
	};
}
