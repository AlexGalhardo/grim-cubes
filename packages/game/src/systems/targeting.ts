import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { Boss, Egg, Elite, EnemyFaction, Health, Position, Stealth } from "../ecs/components";
import type { GameWorld } from "../ecs/world";

export interface TargetingConfig {
	/** `combat.targetPriorityDistanceMult` in `data/hero.json`: bosses and elites look closer. */
	priorityDistanceMult: number;
	/** Steps between re-picks while the current target stays valid. */
	retargetEvery: number;
}

export interface TargetingSystem {
	/** Entity id of the current target, or -1. */
	readonly target: number;
	run(world: GameWorld, hero: number, range: number): void;
}

const MAX_CANDIDATES = 128;

/** Alive enemies and Nest Queen eggs; a stealthed boss cannot be picked (B-01-01). */
function targetable(world: GameWorld, e: number): boolean {
	if ((Health.hp[e] ?? 0) <= 0) return false;
	if (hasComponent(world, e, Egg)) return true;
	return hasComponent(world, e, EnemyFaction) && !hasComponent(world, e, Stealth);
}

export function createTargetingSystem(config: TargetingConfig, enemies: SpatialHash): TargetingSystem {
	const near = new Uint16Array(MAX_CANDIDATES);
	let target = -1;
	let sinceRetarget = 0;

	function valid(world: GameWorld, hero: number, range: number): boolean {
		if (target < 0 || !targetable(world, target)) return false;
		return (
			Math.hypot(
				(Position.x[target] ?? 0) - (Position.x[hero] ?? 0),
				(Position.z[target] ?? 0) - (Position.z[hero] ?? 0),
			) <= range
		);
	}

	return {
		get target(): number {
			return target;
		},
		run(world: GameWorld, hero: number, range: number): void {
			sinceRetarget++;
			if (valid(world, hero, range) && sinceRetarget < config.retargetEvery) return;
			sinceRetarget = 0;
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const n = enemies.queryCircle(hx, hz, range, near);
			let best = -1;
			let bestScore = Number.POSITIVE_INFINITY;
			for (let i = 0; i < n; i++) {
				const e = near[i] ?? 0;
				if (!targetable(world, e)) continue;
				let score = Math.hypot((Position.x[e] ?? 0) - hx, (Position.z[e] ?? 0) - hz);
				if (hasComponent(world, e, Boss) || hasComponent(world, e, Elite))
					score *= config.priorityDistanceMult;
				if (score < bestScore) {
					bestScore = score;
					best = e;
				}
			}
			target = best;
		},
	};
}
