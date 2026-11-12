import { EnemyFaction, PlayerFaction, Position, Radius } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";

/** Slice of `data/world.json`. */
export interface ArenaConfig {
	/** Half the side of the square in round 1, in u. */
	startHalfSize: number;
	growPerRound: number;
	maxHalfSize: number;
}

/** Half the side of the arena in a round (the arena is centred on the world origin). */
export function arenaHalfSize(config: ArenaConfig, round: number): number {
	return Math.min(
		config.maxHalfSize,
		config.startHalfSize + config.growPerRound * (Math.max(1, round) - 1),
	);
}

export interface Arena {
	/** Half the side of the current square. */
	readonly half: number;
	/** Pulls (x, z) inside the square, keeping `margin` from the border. Writes into `out`. */
	clamp(x: number, z: number, margin: number, out: { x: number; z: number }): void;
	/** Keeps the hero and every enemy inside the border by their radius (after movement and prop resolution). */
	confine(world: GameWorld): void;
}

const heroes = createQueryCache([PlayerFaction, Position, Radius]);
const enemies = createQueryCache([EnemyFaction, Position, Radius]);

/**
 * The bounded world (ADR-0030): a square centred on the origin that grows with the round. Positions are relative to
 * the render origin, which never shifts here because `maxHalfSize` stays far below `originShiftThreshold`.
 */
export function createArena(config: ArenaConfig, round: () => number): Arena {
	const half = (): number => arenaHalfSize(config, round());
	function confineList(list: readonly number[], h: number): void {
		for (let i = 0; i < list.length; i++) {
			const e = list[i] ?? 0;
			const limit = h - (Radius.r[e] ?? 0);
			Position.x[e] = Math.max(-limit, Math.min(limit, Position.x[e] ?? 0));
			Position.z[e] = Math.max(-limit, Math.min(limit, Position.z[e] ?? 0));
		}
	}
	return {
		get half(): number {
			return half();
		},
		clamp(x, z, margin, out): void {
			const limit = half() - margin;
			out.x = Math.max(-limit, Math.min(limit, x));
			out.z = Math.max(-limit, Math.min(limit, z));
		},
		confine(world): void {
			const h = half();
			confineList(heroes(world), h);
			confineList(enemies(world), h);
		},
	};
}
