import {
	Attacking,
	Behavior,
	ContactCooldown,
	ContactDamage,
	EnemyFaction,
	Facing,
	Health,
	Position,
	PrevHealth,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import type { EnemyShotPool } from "../ecs/enemyShot";
import { type EventBuffer, EventType } from "../ecs/events";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { DamageQueue } from "./damage";
import type { SpawnSystem } from "./spawn";

/** Numeric ids of `enemies.json` `behavior` strings (`toEnemyDefs` maps them; unknown names throw there). */
export const BehaviorKind = {
	Chase: 0,
	Zigzag: 1,
	Push: 2,
	LatchDrain: 3,
	Armored: 4,
	RangedStatic: 5,
	Charge: 6,
	Spawner: 7,
} as const;

enum Charge {
	Chase = 0,
	Windup = 1,
	Rush = 2,
	Recover = 3,
}

export interface BehaviorConfig {
	/** `behaviorParams` of the zigzag enemy in `data/enemies.json`. */
	zigzag: { amplitude: number; periodSeconds: number };
	/** `combat.contactCooldownSeconds` in `data/hero.json`. */
	contactCooldownSeconds: number;
	/** `ai.attackAnimationSeconds` in `data/rounds.json`. */
	attackAnimationSeconds: number;
	/** `leech`: follows at `speedMult` x speed and drains the hero while latched. */
	latch?: { drainHpPerSecond: number; speedMult: number };
	/** `watcher`: fires a slow projectile when the hero is within `range`. */
	ranged?: { range: number; projectileSpeed: number; intervalSeconds: number; projectileRadius: number };
	/** `hunter`: periodic telegraphed rush. */
	charge?: {
		intervalSeconds: number;
		triggerDistance: number;
		windupSeconds: number;
		chargeSeconds: number;
		speedMult: number;
		recoverSeconds: number;
	};
	/** `breeder`: creates `count` enemies of `type` next to itself every `intervalSeconds`, within the cap. */
	spawner?: { type: number; intervalSeconds: number; count: number; cap: number };
}

export interface BehaviorDeps {
	events?: EventBuffer | undefined;
	/** Needed by the breeder. */
	spawn?: SpawnSystem | undefined;
	/** Needed by the watcher. */
	shots?: EnemyShotPool | undefined;
	/** Needed by the leech: damage that skips armor and i-frames (`DamageSystem.drain`). */
	drain?: ((world: GameWorld, amount: number, by: number) => void) | undefined;
}

export interface BehaviorSystem {
	run(world: GameWorld, hero: number): void;
}

const enemyList = createQueryCache([EnemyFaction, Position, Velocity, Speed, Behavior]);

export function createBehaviorSystem(
	config: BehaviorConfig,
	queue: DamageQueue,
	deps: BehaviorDeps = {},
): BehaviorSystem {
	const { events, spawn, shots, drain } = deps;
	const steps = (seconds: number): number => Math.max(1, Math.round(seconds / STEP));
	const periodSteps = steps(config.zigzag.periodSeconds);
	const omega = (2 * Math.PI) / (periodSteps * STEP);
	const cooldownSteps = Math.round(config.contactCooldownSeconds / STEP);
	const attackSteps = Math.round(config.attackAnimationSeconds / STEP);
	const { latch, ranged, charge, spawner } = config;

	function tickCharge(e: number, nx: number, nz: number, dist: number, speed: number): [number, number] {
		if (!charge) return [nx * speed, nz * speed];
		const state = Behavior.state[e] ?? Charge.Chase;
		const timer = Behavior.timer[e] ?? 0;
		switch (state) {
			case Charge.Windup:
				if (timer <= 1) {
					Behavior.state[e] = Charge.Rush;
					Behavior.timer[e] = steps(charge.chargeSeconds);
				} else {
					Behavior.timer[e] = timer - 1;
				}
				return [0, 0];
			case Charge.Rush:
				// The heading was stored in Facing.yaw at the windup, so the rush is a straight line.
				if (timer <= 1) {
					Behavior.state[e] = Charge.Recover;
					Behavior.timer[e] = steps(charge.recoverSeconds);
				} else {
					Behavior.timer[e] = timer - 1;
				}
				return [
					Math.sin(Facing.yaw[e] ?? 0) * speed * charge.speedMult,
					Math.cos(Facing.yaw[e] ?? 0) * speed * charge.speedMult,
				];
			case Charge.Recover:
				if (timer <= 1) {
					Behavior.state[e] = Charge.Chase;
					Behavior.aux[e] = 0;
				} else {
					Behavior.timer[e] = timer - 1;
				}
				return [0, 0];
			default: {
				const wait = (Behavior.aux[e] ?? 0) + 1;
				Behavior.aux[e] = wait;
				if (wait >= steps(charge.intervalSeconds) && dist <= charge.triggerDistance) {
					Behavior.state[e] = Charge.Windup;
					Behavior.timer[e] = steps(charge.windupSeconds);
					events?.push(EventType.EnemyTelegraph, nx, nz, charge.windupSeconds, e);
					Facing.yaw[e] = Math.atan2(nx, nz);
					return [0, 0];
				}
				return [nx * speed, nz * speed];
			}
		}
	}

	return {
		run(world: GameWorld, hero: number): void {
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const heroRadius = Radius.r[hero] ?? 0;
			const enemies = enemyList(world);
			// Several breeders can act in one step, so the count grows with every wail they add.
			let alive = enemies.length;

			for (let i = 0; i < enemies.length; i++) {
				const e = enemies[i] ?? 0;
				const dx = hx - (Position.x[e] ?? 0);
				const dz = hz - (Position.z[e] ?? 0);
				const dist = Math.hypot(dx, dz);
				const speed = Speed.value[e] ?? 0;
				const nx = dist > 1e-6 ? dx / dist : 0;
				const nz = dist > 1e-6 ? dz / dist : 0;
				const kind = Behavior.kind[e];
				let vx = nx * speed;
				let vz = nz * speed;
				const touching = dist <= (Radius.r[e] ?? 0) + heroRadius;

				if (kind === BehaviorKind.Zigzag) {
					// Per-entity phase offset so a group does not weave in unison.
					const step = ((Behavior.timer[e] ?? 0) + e * 7) % periodSteps;
					const lateral = config.zigzag.amplitude * omega * Math.cos(omega * step * STEP);
					vx += -nz * lateral;
					vz += nx * lateral;
					Behavior.timer[e] = ((Behavior.timer[e] ?? 0) + 1) % periodSteps;
				} else if (kind === BehaviorKind.LatchDrain && latch) {
					const hurt = (Health.hp[e] ?? 0) < (PrevHealth.hp[e] ?? 0);
					if (Behavior.state[e] === 1 && hurt) Behavior.state[e] = 0;
					else if (Behavior.state[e] !== 1 && touching) Behavior.state[e] = 1;
					if (Behavior.state[e] === 1) {
						vx = nx * speed * latch.speedMult;
						vz = nz * speed * latch.speedMult;
						// Drain skips armor and i-frames: it is a slow leak, not a hit.
						drain?.(world, latch.drainHpPerSecond * STEP, e);
					}
				} else if (kind === BehaviorKind.RangedStatic && ranged && shots) {
					vx = 0;
					vz = 0;
					const wait = (Behavior.aux[e] ?? 0) + 1;
					Behavior.aux[e] = wait;
					if (dist < ranged.range && wait >= steps(ranged.intervalSeconds)) {
						Behavior.aux[e] = 0;
						const life = Math.ceil(ranged.range / ranged.projectileSpeed / STEP);
						shots.acquire(
							Position.x[e] ?? 0,
							Position.z[e] ?? 0,
							nx * ranged.projectileSpeed,
							nz * ranged.projectileSpeed,
							ContactDamage.value[e] ?? 0,
							life,
							ranged.projectileRadius,
						);
						events?.push(EventType.EnemyShotFired, Position.x[e] ?? 0, Position.z[e] ?? 0, 0, e);
					}
				} else if (kind === BehaviorKind.Charge) {
					[vx, vz] = tickCharge(e, nx, nz, dist, speed);
				} else if (kind === BehaviorKind.Spawner && spawner && spawn) {
					const wait = (Behavior.aux[e] ?? 0) + 1;
					Behavior.aux[e] = wait;
					if (wait >= steps(spawner.intervalSeconds)) {
						Behavior.aux[e] = 0;
						for (let k = 0; k < spawner.count && alive < spawner.cap; k++) {
							const angle = (k / spawner.count) * Math.PI * 2;
							spawn.spawnEnemy(
								world,
								spawner.type,
								(Position.x[e] ?? 0) + Math.cos(angle) * ((Radius.r[e] ?? 0) + 0.6),
								(Position.z[e] ?? 0) + Math.sin(angle) * ((Radius.r[e] ?? 0) + 0.6),
							);
							alive++;
						}
					}
				}
				Velocity.x[e] = vx;
				Velocity.z[e] = vz;
				PrevHealth.hp[e] = Health.hp[e] ?? 0;

				const attacking = Attacking.ticks[e] ?? 0;
				if (attacking > 0) Attacking.ticks[e] = attacking - 1;
				const cooldown = ContactCooldown.ticks[e] ?? 0;
				if (cooldown > 0) {
					ContactCooldown.ticks[e] = cooldown - 1;
				} else if (
					touching &&
					ContactDamage.value[e] !== undefined &&
					(ContactDamage.value[e] ?? 0) > 0
				) {
					queue.push(hero, ContactDamage.value[e] ?? 0, e, 0, 0, 0);
					ContactCooldown.ticks[e] = cooldownSteps;
					Attacking.ticks[e] = attackSteps;
				}
			}
		},
	};
}
