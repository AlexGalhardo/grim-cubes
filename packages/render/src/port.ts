import { type EventBuffer, EventType, findHero, Position, PrevPosition, type RenderPort } from "@gc/game";
import type { HordeRenderer } from "./horde/hordeRenderer";
import type { GameScene } from "./scene/scene";

/**
 * Render side of the game/render contract: mirrors the hero cube, delegates the horde to `horde` when given,
 * and keeps the camera target on the hero. The camera follows rigidly here; the 8/s lerp arrives with P-02-01.
 */
export function createRenderPort(game: GameScene, horde?: HordeRenderer): RenderPort {
	const target = game.camera.target;
	// Created once: consumeEvents runs every frame and must not allocate.
	const onEvent = (type: number, a: number, b: number, _c: number, entity: number): void => {
		if (type === EventType.Died) horde?.onDied(entity);
		if (type === EventType.OriginShifted) {
			// The camera target is rewritten from the (already shifted) hero in `sync`, so no order dependence.
			game.shiftWorld(a, b);
			horde?.shift(a, b);
		}
	};
	return {
		sync(world, alpha): void {
			horde?.sync(world, alpha);
			const hero = findHero(world);
			if (hero < 0) return;
			const px = PrevPosition.x[hero] ?? 0;
			const pz = PrevPosition.z[hero] ?? 0;
			const x = px + ((Position.x[hero] ?? 0) - px) * alpha;
			const z = pz + ((Position.z[hero] ?? 0) - pz) * alpha;
			game.setHeroPosition(x, z);
			target.x = x;
			target.z = z;
		},
		consumeEvents(events: EventBuffer): void {
			events.consume(onEvent);
		},
	};
}
