import type { EventBuffer } from "./events";
import type { GameWorld } from "./world";

/** Implemented by `render`; `game` only calls it (layering: core <- game <- render). */
export interface RenderPort {
	/**
	 * Per frame, call `consumeEvents` BEFORE `sync`: events such as OriginShifted change what `sync` must write.
	 * Handlers that only move static geometry are order-independent; anything sync has already written for
	 * this frame is stale until the next sync.
	 */
	/** Mirrors world state into meshes; `alpha` in [0, 1) interpolates PrevPosition -> Position. */
	sync(world: GameWorld, alpha: number): void;
	/** Applies one-shot effects; must drain `events` (typically via `consumeEvents`). */
	consumeEvents(events: EventBuffer): void;
}
