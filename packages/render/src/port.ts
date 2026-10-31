import {
	type EventBuffer,
	EventType,
	findHero,
	type Origin,
	Position,
	PrevPosition,
	type RenderPort,
} from "@gc/game";
import type { Characters } from "./character/characters";
import type { HordeRenderer } from "./horde/hordeRenderer";
import type { GameScene } from "./scene/scene";
import type { EliteView } from "./vfx/elite";
import type { Vfx } from "./vfx/vfx";

export interface RenderPortOptions {
	/**
	 * The live world origin. With it the camera target is re-expressed whenever the origin moves, independent of when
	 * `OriginShifted` is consumed (so `consumeEvents` and `sync` may run in either order).
	 */
	origin?: Origin;
	/** Exponential follow rate per second of the camera target (GDD §5: 8). Infinity (default) follows rigidly. */
	followRate?: number;
	/** Seconds since the previous sync; defaults to the engine delta, capped at 0.1 s. */
	deltaSeconds?: () => number;
	/** Combat juice fed from the same event stream (blood, decals, damage numbers). */
	vfx?: Vfx;
	/** Elite chest and incoming marker (P-05-06b). */
	elite?: EliteView;
	/** Skeleton rigs (hero, Merchant, Gravedigger): animation events. */
	characters?: Characters | undefined;
}

/**
 * Render side of the game/render contract: mirrors the hero cube, delegates the horde to `horde` when given,
 * and makes the camera target follow the interpolated hero position.
 */
export function createRenderPort(
	game: GameScene,
	horde?: HordeRenderer,
	options: RenderPortOptions = {},
): RenderPort {
	const target = game.camera.target;
	const { origin, vfx, elite, characters } = options;
	const followRate = options.followRate ?? Number.POSITIVE_INFINITY;
	const engine = game.scene.getEngine();
	const deltaSeconds = options.deltaSeconds ?? ((): number => Math.min(0.1, engine.getDeltaTime() / 1000));
	let lastOriginX = origin?.x ?? 0;
	let lastOriginZ = origin?.z ?? 0;
	let snapped = false;

	// Created once: consumeEvents runs every frame and must not allocate.
	const onEvent = (type: number, a: number, b: number, c: number, entity: number): void => {
		vfx?.onEvent(type, a, b, c, entity);
		elite?.onEvent(type, a, b, c);
		characters?.onEvent(type, a, b, c, entity);
		if (type === EventType.Died) horde?.onDied(entity);
		if (type === EventType.OriginShifted) {
			game.shiftWorld(a, b);
			horde?.shift(a, b);
			vfx?.shift(a, b);
			elite?.shift(a, b);
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

			if (origin) {
				// Positions are relative to the origin: when it moves, the camera target moves the opposite way.
				target.x += lastOriginX - origin.x;
				target.z += lastOriginZ - origin.z;
				lastOriginX = origin.x;
				lastOriginZ = origin.z;
			}
			if (!snapped || followRate === Number.POSITIVE_INFINITY) {
				target.x = x;
				target.z = z;
				snapped = true;
				return;
			}
			const k = 1 - Math.exp(-followRate * deltaSeconds());
			target.x += (x - target.x) * k;
			target.z += (z - target.z) * k;
		},
		consumeEvents(events: EventBuffer): void {
			events.consume(onEvent);
		},
	};
}
