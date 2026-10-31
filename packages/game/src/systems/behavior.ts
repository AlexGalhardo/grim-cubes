import { query } from "bitecs";
import {
	Behavior,
	ContactCooldown,
	ContactDamage,
	EnemyFaction,
	Position,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { DamageQueue } from "./damage";

export const BehaviorKind = { Chase: 0, Zigzag: 1 } as const;

export interface BehaviorConfig {
	/** `behaviorParams` of the zigzag enemy in `data/enemies.json`. */
	zigzag: { amplitude: number; periodSeconds: number };
	/** `combat.contactCooldownSeconds` in `data/hero.json`. */
	contactCooldownSeconds: number;
}

export interface BehaviorSystem {
	run(world: GameWorld, hero: number): void;
}

const ENEMY_TERMS = [EnemyFaction, Position, Velocity, Speed, Behavior];

export function createBehaviorSystem(config: BehaviorConfig, queue: DamageQueue): BehaviorSystem {
	const periodSteps = Math.max(1, Math.round(config.zigzag.periodSeconds / STEP));
	const omega = (2 * Math.PI) / (periodSteps * STEP);
	const cooldownSteps = Math.round(config.contactCooldownSeconds / STEP);

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const heroRadius = Radius.r[hero] ?? 0;
			const enemies = query(world, ENEMY_TERMS);

			for (let i = 0; i < enemies.length; i++) {
				const e = enemies[i] ?? 0;
				const dx = hx - (Position.x[e] ?? 0);
				const dz = hz - (Position.z[e] ?? 0);
				const dist = Math.hypot(dx, dz);
				const speed = Speed.value[e] ?? 0;
				const nx = dist > 1e-6 ? dx / dist : 0;
				const nz = dist > 1e-6 ? dz / dist : 0;
				let vx = nx * speed;
				let vz = nz * speed;

				if (Behavior.kind[e] === BehaviorKind.Zigzag) {
					// Per-entity phase offset so a group does not weave in unison.
					const step = ((Behavior.timer[e] ?? 0) + e * 7) % periodSteps;
					const lateral = config.zigzag.amplitude * omega * Math.cos(omega * step * STEP);
					vx += -nz * lateral;
					vz += nx * lateral;
					Behavior.timer[e] = ((Behavior.timer[e] ?? 0) + 1) % periodSteps;
				}
				Velocity.x[e] = vx;
				Velocity.z[e] = vz;

				const cooldown = ContactCooldown.ticks[e] ?? 0;
				if (cooldown > 0) {
					ContactCooldown.ticks[e] = cooldown - 1;
				} else if (dist <= (Radius.r[e] ?? 0) + heroRadius) {
					queue.push(hero, ContactDamage.value[e] ?? 0, e, 0, 0, 0);
					ContactCooldown.ticks[e] = cooldownSteps;
				}
			}
		},
	};
}
