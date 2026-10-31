import { type EventBuffer, EventType, findHero, Position, PrevPosition, type RenderPort } from "@gc/game";
import type { GameScene } from "./scene/scene";

/**
 * Minimal render side of the game/render contract. The horde (thin instances) joins in P-03-04; for now
 * it mirrors the hero cube and keeps the camera target on it. The camera follows the hero rigidly here;
 * the 8/s lerp arrives with P-02-01.
 */
export function createRenderPort(game: GameScene): RenderPort {
	const target = game.camera.target;
	// Created once: consumeEvents runs every frame and must not allocate.
	const onEvent = (type: number, a: number, b: number): void => {
		if (type === EventType.OriginShifted) {
			game.shiftWorld(a, b);
			target.x -= a;
			target.z -= b;
		}
	};
	return {
		sync(world, alpha): void {
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
