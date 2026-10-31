import { addComponent } from "bitecs";
import type { BossData, BossPatternData, RoundsData } from "../data/types";
import { dropChest } from "../ecs/chest";
import { Boss, ContactDamage, Health, Position, Radius, Speed, Velocity } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { DamageQueue } from "./damage";
import type { SpawnSystem } from "./spawn";

export interface BossSystemDeps {
	def: BossData;
	/** `rounds.json` `boss` block. */
	rounds: RoundsData["boss"];
	spawn: SpawnSystem;
	events: EventBuffer;
	queue: DamageQueue;
	hero: number;
	/** Angle source for the entry position (the `combat` stream). */
	rng: { float(a: number, b: number): number };
	/** `EnemyType` index of the summoned enemy (the Carcaça). */
	summonType: number;
	/** Difficulty multiplier on HP and damage. */
	difficulty: () => number;
	/** The kill was recorded: end the round, grant the free weapon upgrade, etc. */
	onDefeated: () => void;
}

export interface BossView {
	name: string;
	hp: number;
	maxHp: number;
	/** 0 before the summon, 1 after (the bar marks the 50% line). */
	phase: number;
}

export interface BossSystem {
	/** Creates the boss for `round` near the hero. Call when the boss round begins. */
	start(world: GameWorld, round: number): number;
	/** Runs the patterns and enrage; call after behaviorSystem so the pattern velocity wins. */
	run(world: GameWorld): void;
	/** Wire to the death system's `onDeath`. */
	handleDeath(world: GameWorld, enemy: number, x: number, z: number): void;
	readonly entity: number;
	view(): BossView | null;
}

enum State {
	Chase,
	Telegraph,
	Charge,
	ArcWindup,
	Recover,
}

const num = (p: BossPatternData | undefined, key: string, fallback = 0): number => {
	const value = p?.params?.[key];
	return typeof value === "number" ? value : fallback;
};

/** HP of the boss at `round`: base at its own round, +35% per ten rounds after (GDD 12.1), times difficulty. */
export function bossMaxHp(
	def: BossData,
	rounds: RoundsData["boss"],
	round: number,
	difficulty: number,
): number {
	return def.hpBaseRound10 * (1 + (rounds.hpScalePerTenRounds * (round - def.round)) / 10) * difficulty;
}

/** Enrage multiplier for damage and speed: +15% per stack, cumulative. */
export const enrageMult = (rounds: RoundsData["boss"], stacks: number): number =>
	1 + rounds.enrageDamageSpeedBonus * stacks;

/**
 * O Coveiro (GDD 12): a slow tank with a telegraphed line charge, a shovel arc and a summon at 50% HP. Contact
 * damage comes from the shared behaviorSystem; this system overrides velocity during the patterns.
 */
export function createBossSystem(deps: BossSystemDeps): BossSystem {
	const { def, rounds, spawn, events, queue, hero, rng, summonType, difficulty, onDefeated } = deps;
	const charge = def.patterns.find((p) => p.id === "line_charge");
	const arc = def.patterns.find((p) => p.id === "shovel_arc");
	const summon = def.patterns.find((p) => p.id === "summon");
	const steps = (seconds: number): number => Math.max(1, Math.round(seconds / STEP));
	const enrageSteps = steps(rounds.enrageEverySeconds);
	const cooldownSteps = steps(def.patternCooldownSeconds ?? 1);

	let entity = -1;
	let bossRound = def.round;
	let state: State = State.Chase;
	let timer = 0;
	let cooldown = 0;
	let dirX = 1;
	let dirZ = 0;
	let baseSpeed = 0;
	let baseContact = 0;
	let maxHp = 0;

	function applyEnrage(): void {
		const mult = enrageMult(rounds, Boss.enrageStacks[entity] ?? 0);
		Speed.value[entity] = baseSpeed * mult;
		ContactDamage.value[entity] = baseContact * mult;
	}

	function aimAtHero(): number {
		const dx = (Position.x[hero] ?? 0) - (Position.x[entity] ?? 0);
		const dz = (Position.z[hero] ?? 0) - (Position.z[entity] ?? 0);
		const dist = Math.hypot(dx, dz);
		if (dist > 1e-6) {
			dirX = dx / dist;
			dirZ = dz / dist;
		}
		return dist;
	}

	function stop(): void {
		Velocity.x[entity] = 0;
		Velocity.z[entity] = 0;
	}

	function doSummon(world: GameWorld): void {
		const count = num(summon, "count", 6);
		const x = Position.x[entity] ?? 0;
		const z = Position.z[entity] ?? 0;
		for (let i = 0; i < count; i++) {
			const angle = (i / count) * Math.PI * 2;
			spawn.spawnEnemy(world, summonType, x + Math.cos(angle) * 2.5, z + Math.sin(angle) * 2.5);
		}
		events.push(EventType.BossSummon, x, z, count, entity);
	}

	function swingShovel(): void {
		const range = num(arc, "range", 3);
		const cos = Math.cos(((num(arc, "arcDegrees", 120) / 2) * Math.PI) / 180);
		const dx = (Position.x[hero] ?? 0) - (Position.x[entity] ?? 0);
		const dz = (Position.z[hero] ?? 0) - (Position.z[entity] ?? 0);
		const dist = Math.hypot(dx, dz);
		const inArc = dist < 1e-6 || (dx * dirX + dz * dirZ) / dist >= cos;
		if (dist <= range + (Radius.r[hero] ?? 0) && inArc) {
			queue.push(
				hero,
				(ContactDamage.value[entity] ?? 0) * num(arc, "damageMult", 1.5),
				entity,
				0,
				0,
				0,
			);
		}
	}

	function tickPattern(): void {
		const mult = enrageMult(rounds, Boss.enrageStacks[entity] ?? 0);
		switch (state) {
			case State.Chase: {
				const dist = aimAtHero();
				if (cooldown > 0) {
					cooldown--;
				} else if (arc && dist <= num(arc, "maxDistance", 3.5)) {
					state = State.ArcWindup;
					timer = steps(num(arc, "windupSeconds", 0.6));
					stop();
					events.push(EventType.BossTelegraph, dirX, dirZ, num(arc, "windupSeconds", 0.6), entity);
				} else if (charge && dist >= num(charge, "minDistance", 5)) {
					state = State.Telegraph;
					timer = steps(num(charge, "telegraphSeconds", 1));
					stop();
					events.push(
						EventType.BossTelegraph,
						dirX,
						dirZ,
						num(charge, "telegraphSeconds", 1),
						entity,
					);
				}
				break;
			}
			case State.Telegraph:
				stop();
				if (--timer <= 0) {
					state = State.Charge;
					timer = steps(num(charge, "chargeSeconds", 0.6));
				}
				break;
			case State.Charge: {
				const v = baseSpeed * mult * num(charge, "speedMult", 4);
				Velocity.x[entity] = dirX * v;
				Velocity.z[entity] = dirZ * v;
				if (--timer <= 0) {
					state = State.Recover;
					timer = steps(num(charge, "recoverSeconds", 1));
				}
				break;
			}
			case State.ArcWindup:
				stop();
				if (--timer <= 0) {
					swingShovel();
					state = State.Recover;
					timer = steps(num(arc, "recoverSeconds", 0.8));
				}
				break;
			case State.Recover:
				stop();
				if (--timer <= 0) {
					state = State.Chase;
					cooldown = cooldownSteps;
				}
				break;
		}
	}

	return {
		get entity(): number {
			return entity;
		},
		start(world: GameWorld, round: number): number {
			bossRound = round;
			maxHp = bossMaxHp(def, rounds, round, difficulty());
			const angle = rng.float(0, Math.PI * 2);
			const x = (Position.x[hero] ?? 0) + Math.cos(angle) * 12;
			const z = (Position.z[hero] ?? 0) + Math.sin(angle) * 12;
			entity = spawn.spawnEnemy(world, summonType, x, z);
			addComponent(world, entity, Boss);
			Boss.id[entity] = 1;
			Health.hp[entity] = Health.max[entity] = maxHp;
			Radius.r[entity] = def.radius ?? 1.2;
			baseSpeed = def.speed ?? 2.4;
			baseContact =
				(rounds.contactDamageBase + rounds.contactDamagePerRound * bossRound) * difficulty();
			applyEnrage();
			state = State.Chase;
			cooldown = cooldownSteps;
			timer = 0;
			return entity;
		},
		run(world: GameWorld): void {
			if (entity < 0 || (Health.hp[entity] ?? 0) <= 0) return;

			const ticks = (Boss.enrageTimer[entity] ?? 0) + 1;
			if (ticks >= enrageSteps) {
				Boss.enrageTimer[entity] = 0;
				Boss.enrageStacks[entity] = (Boss.enrageStacks[entity] ?? 0) + 1;
				applyEnrage();
				events.push(EventType.BossEnraged, Boss.enrageStacks[entity] ?? 0, 0, 0, entity);
			} else {
				Boss.enrageTimer[entity] = ticks;
			}

			if (summon && (Boss.phase[entity] ?? 0) === 0) {
				if ((Health.hp[entity] ?? 0) <= maxHp * num(summon, "atHpFraction", 0.5)) {
					Boss.phase[entity] = 1;
					doSummon(world);
				}
			}
			tickPattern();
		},
		handleDeath(world: GameWorld, e: number, x: number, z: number): void {
			if (e !== entity) return;
			entity = -1;
			events.push(EventType.BossDied, x, z, 0, e);
			const chest = rounds.rewardChest;
			dropChest(world, x, z, chest.minTier, chest.offered, chest.picks);
			onDefeated();
		},
		view(): BossView | null {
			if (entity < 0) return null;
			return {
				name: def.name,
				hp: Math.max(0, Math.ceil(Health.hp[entity] ?? 0)),
				maxHp: Math.ceil(maxHp),
				phase: Boss.phase[entity] ?? 0,
			};
		},
	};
}
