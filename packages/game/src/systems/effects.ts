import type { SpatialHash } from "@gc/core";
import { hasComponent } from "bitecs";
import { EnemyFaction, Health, Invulnerable, Position, Radius } from "../ecs/components";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import {
	computeEffects,
	createItemEffects,
	type EffectSource,
	type EffectsExtra,
	type ItemEffects,
} from "../rules/effects";
import type { DamageQueue } from "./damage";

export interface EffectsSystem {
	readonly effects: ItemEffects;
	/** Call after the inventory changes (a shop purchase). */
	refresh(): void;
	/** Consumes a revive if one is available: restores HP, grants i-frames, returns true. */
	tryRevive(hero: number): boolean;
}

/** Steps of invulnerability after a revive (2 s). */
const REVIVE_IFRAMES = 120;

export function createEffectsSystem(
	items: readonly EffectSource[],
	owned: ReadonlyMap<string, number>,
	extra?: EffectsExtra,
): EffectsSystem {
	const effects = createItemEffects();
	let spent = 0;
	const refresh = (): void => computeEffects(items, owned, effects, spent, extra);
	refresh();

	return {
		effects,
		refresh,
		tryRevive(hero: number): boolean {
			if (effects.revives <= 0) return false;
			spent++;
			Health.hp[hero] = (Health.max[hero] ?? 0) * effects.reviveHpFraction;
			Invulnerable.ticks[hero] = REVIVE_IFRAMES;
			refresh();
			return true;
		},
	};
}

export interface AuraSystemDeps {
	effects: ItemEffects;
	queue: DamageQueue;
	/** The enemy hash rebuilt this step (separationSystem.hash). */
	enemies: SpatialHash;
	round: () => number;
}

export interface AuraSystem {
	run(world: GameWorld, hero: number): void;
}

const MAX_NEAR = 128;

/** `proximity_aura_damage` (`brimstone_heart`): enemies near the hero take damage per second, spread over the steps. */
export function createAuraSystem(deps: AuraSystemDeps): AuraSystem {
	const { effects, queue, enemies, round } = deps;
	const near = new Uint16Array(MAX_NEAR);

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			for (let a = 0; a < effects.auras.length; a++) {
				const aura = effects.auras[a];
				if (!aura) continue;
				const perStep = (aura.damageBase + aura.damagePerRound * round()) * STEP;
				const n = enemies.queryCircle(hx, hz, aura.radius + 1, near);
				for (let i = 0; i < n; i++) {
					const e = near[i] ?? 0;
					if ((Health.hp[e] ?? 0) <= 0 || !hasComponent(world, e, EnemyFaction)) continue;
					const dist = Math.hypot((Position.x[e] ?? 0) - hx, (Position.z[e] ?? 0) - hz);
					if (dist <= aura.radius + (Radius.r[e] ?? 0)) queue.push(e, perStep, 0, 0, 0, 0);
				}
			}
		},
	};
}
