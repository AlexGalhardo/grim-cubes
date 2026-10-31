import type { SpatialHash } from "@gc/core";
import { addComponent, hasComponent, removeComponent, removeEntity } from "bitecs";
import type { BossPatternData } from "../data/types";
import {
	Armor,
	Boss,
	ContactDamage,
	Egg,
	Health,
	IgnoresProps,
	Position,
	PrevPosition,
	Radius,
	Stealth,
	Velocity,
} from "../ecs/components";
import type { EventBuffer } from "../ecs/events";
import { EventType } from "../ecs/events";
import { type GameWorld, spawn } from "../ecs/world";
import { STEP } from "../loop";
import type { DamageQueue } from "./damage";
import type { SpawnSystem } from "./spawn";

/** What a pattern handler can see and do. One context per boss, refreshed by the boss system every step. */
export interface PatternContext {
	world: GameWorld;
	entity: number;
	hero: number;
	/** Unit vector toward the hero as of the last `aim()`. */
	dirX: number;
	dirZ: number;
	maxHp: number;
	/** Boss speed before enrage; multiply by `enrage` for the live value. */
	baseSpeed: number;
	/** 1 + 15% per enrage stack. */
	enrage: number;
	spawn: SpawnSystem;
	events: EventBuffer;
	queue: DamageQueue;
	/** `EnemyType` index of the minion every boss borrows its stats from. */
	summonType: number;
	/** `EnemyType` index of an enemy id from enemies.json. Throws on an unknown id. */
	enemyIndex(id: string): number;
	/** Slows the hero (mud pool). */
	slowHero(seconds: number, multiplier: number): void;
	/** Fires one projectile from the shared enemy shot pool (chain shot). */
	fireShot(
		x: number,
		z: number,
		vx: number,
		vz: number,
		damage: number,
		lifeSteps: number,
		radius: number,
	): void;
	/** Shoves the hero along (dirX, dirZ) by `distance` over `seconds` (scream). */
	pushHero(dirX: number, dirZ: number, distance: number, seconds: number): void;
	/** Turns the pattern's `dir` toward the hero and returns the distance. */
	aim(): number;
	stop(): void;
	steps(seconds: number): number;
}

/**
 * A boss attack (SDD 04 section 6). The dispatcher calls `canStart` while the boss is free and its cooldown is
 * over, `start` once, then `update` every step until it returns false, then `end`. `tick` runs every step
 * regardless (HP triggers such as the summon). All state lives in the handler's closure: one boss at a time.
 */
export interface PatternHandler {
	canStart?(ctx: PatternContext, distance: number): boolean;
	start?(ctx: PatternContext): void;
	/** True while the pattern is still running. */
	update?(ctx: PatternContext): boolean;
	end?(ctx: PatternContext): void;
	tick?(ctx: PatternContext): void;
	/** The world origin moved by (dx, dz): positions the handler remembers (pools) shift by the opposite amount. */
	shift?(dx: number, dz: number): void;
	/** Puts the entities the handler owns that weapons must be able to hit (eggs) in the enemy spatial hash. */
	insertInto?(hash: SpatialHash): void;
	/** A new fight starts or the boss died: drop the entities and timers the handler still holds. */
	reset?(world: GameWorld): void;
}

export type PatternParams = Readonly<Record<string, number | string | boolean>>;
export type PatternFactory = (params: PatternParams) => PatternHandler;

const num = (params: PatternParams, key: string, fallback = 0): number => {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
};

const lineCharge: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;
	return {
		canStart: (_ctx, distance) => distance >= num(p, "minDistance", 5),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 1));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 1),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			if (phase === 0) {
				ctx.stop();
				if (--timer <= 0) {
					phase = 1;
					timer = ctx.steps(num(p, "chargeSeconds", 0.6));
				}
			} else if (phase === 1) {
				const v = ctx.baseSpeed * ctx.enrage * num(p, "speedMult", 4);
				Velocity.x[ctx.entity] = ctx.dirX * v;
				Velocity.z[ctx.entity] = ctx.dirZ * v;
				if (--timer <= 0) {
					phase = 2;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else {
				ctx.stop();
				if (--timer <= 0) return false;
			}
			return true;
		},
	};
};

const shovelArc: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;

	function swing(ctx: PatternContext): void {
		const cos = Math.cos(((num(p, "arcDegrees", 120) / 2) * Math.PI) / 180);
		const dx = (Position.x[ctx.hero] ?? 0) - (Position.x[ctx.entity] ?? 0);
		const dz = (Position.z[ctx.hero] ?? 0) - (Position.z[ctx.entity] ?? 0);
		const dist = Math.hypot(dx, dz);
		const inArc = dist < 1e-6 || (dx * ctx.dirX + dz * ctx.dirZ) / dist >= cos;
		if (dist <= num(p, "range", 3) + (Radius.r[ctx.hero] ?? 0) && inArc) {
			ctx.queue.push(
				ctx.hero,
				(ContactDamage.value[ctx.entity] ?? 0) * num(p, "damageMult", 1.5),
				ctx.entity,
				0,
				0,
				0,
			);
		}
	}

	return {
		canStart: (_ctx, distance) => distance <= num(p, "maxDistance", 3.5),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "windupSeconds", 0.6));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "windupSeconds", 0.6),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					swing(ctx);
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 0.8));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
	};
};

/** Spawns `count` minions in a ring around the boss and announces it. */
function summonRing(ctx: PatternContext, type: number, count: number): void {
	const x = Position.x[ctx.entity] ?? 0;
	const z = Position.z[ctx.entity] ?? 0;
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		ctx.spawn.spawnEnemy(ctx.world, type, x + Math.cos(angle) * 2.5, z + Math.sin(angle) * 2.5);
	}
	ctx.events.push(EventType.BossSummon, x, z, count, ctx.entity);
}

/**
 * Minions around the boss, in one of two shapes: once when HP falls to `atHpFraction` (the Gravedigger; `Boss.phase`
 * is the bar's 50% mark), or every `intervalSeconds` (the Matriarch). `enemy` names the minion, defaulting to the
 * boss's own base enemy.
 */
const summon: PatternFactory = (p) => {
	const periodic = typeof p.intervalSeconds === "number";
	const minion = (ctx: PatternContext): number =>
		typeof p.enemy === "string" ? ctx.enemyIndex(p.enemy) : ctx.summonType;
	let wait = 0;
	return {
		tick(ctx): void {
			if (periodic) {
				if (++wait < ctx.steps(num(p, "intervalSeconds"))) return;
				wait = 0;
				summonRing(ctx, minion(ctx), num(p, "count", 3));
				return;
			}
			if ((Boss.phase[ctx.entity] ?? 0) !== 0) return;
			if ((Health.hp[ctx.entity] ?? 0) > ctx.maxHp * num(p, "atHpFraction", 0.5)) return;
			Boss.phase[ctx.entity] = 1;
			summonRing(ctx, minion(ctx), num(p, "count", 6));
		},
	};
};

const MAX_POOLS = 8;

/**
 * Mud pool (Matriarch): after a telegraph the boss leaves a pool where the hero stood; standing in it slows the
 * hero for `slowSeconds` after the last tick inside, so leaving does not free the hero at once.
 */
const mudPool: PatternFactory = (p) => {
	const poolX = new Float32Array(MAX_POOLS);
	const poolZ = new Float32Array(MAX_POOLS);
	const poolLeft = new Uint16Array(MAX_POOLS);
	let next = 0;
	let phase = 0;
	let timer = 0;
	let targetX = 0;
	let targetZ = 0;

	return {
		canStart: (_ctx, distance) => distance >= num(p, "minDistance", 3),
		shift(dx, dz): void {
			targetX -= dx;
			targetZ -= dz;
			for (let i = 0; i < MAX_POOLS; i++) {
				poolX[i] = (poolX[i] ?? 0) - dx;
				poolZ[i] = (poolZ[i] ?? 0) - dz;
			}
		},
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 1));
			targetX = Position.x[ctx.hero] ?? 0;
			targetZ = Position.z[ctx.hero] ?? 0;
			ctx.stop();
			// The pool lands where the hero stands now, so the telegraph names that spot instead of a direction.
			ctx.events.push(
				EventType.BossTelegraph,
				targetX,
				targetZ,
				num(p, "telegraphSeconds", 1),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					poolX[next] = targetX;
					poolZ[next] = targetZ;
					poolLeft[next] = ctx.steps(num(p, "durationSeconds", 6));
					next = (next + 1) % MAX_POOLS;
					ctx.events.push(EventType.BossPool, targetX, targetZ, num(p, "radius", 2.5), ctx.entity);
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 0.8));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
		tick(ctx): void {
			const reach = num(p, "radius", 2.5) + (Radius.r[ctx.hero] ?? 0);
			for (let i = 0; i < MAX_POOLS; i++) {
				const left = poolLeft[i] ?? 0;
				if (left === 0) continue;
				poolLeft[i] = left - 1;
				const dx = (Position.x[ctx.hero] ?? 0) - (poolX[i] ?? 0);
				const dz = (Position.z[ctx.hero] ?? 0) - (poolZ[i] ?? 0);
				if (dx * dx + dz * dz <= reach * reach) {
					ctx.slowHero(num(p, "slowSeconds", 3), num(p, "slowMult", 0.5));
				}
			}
		},
	};
};

/** Scream (Matriarch): a close-range telegraphed shout that shoves the hero away from the boss and bruises it. */
const scream: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;

	function shout(ctx: PatternContext): void {
		const x = Position.x[ctx.entity] ?? 0;
		const z = Position.z[ctx.entity] ?? 0;
		const radius = num(p, "radius", 6);
		ctx.events.push(EventType.BossScream, x, z, radius, ctx.entity);
		const dx = (Position.x[ctx.hero] ?? 0) - x;
		const dz = (Position.z[ctx.hero] ?? 0) - z;
		const dist = Math.hypot(dx, dz);
		if (dist > radius + (Radius.r[ctx.hero] ?? 0)) return;
		// Dead centre has no direction: fall back to where the boss was facing.
		const nx = dist > 1e-6 ? dx / dist : ctx.dirX;
		const nz = dist > 1e-6 ? dz / dist : ctx.dirZ;
		ctx.pushHero(nx, nz, num(p, "knockbackDistance", 5), num(p, "knockbackSeconds", 0.25));
		ctx.queue.push(
			ctx.hero,
			(ContactDamage.value[ctx.entity] ?? 0) * num(p, "damageMult", 0.5),
			ctx.entity,
			0,
			0,
			0,
		);
	}

	return {
		canStart: (_ctx, distance) => distance <= num(p, "maxDistance", 5),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 0.8));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 0.8),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					shout(ctx);
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
	};
};

/**
 * Hammer (Forgemaster): after a telegraph the boss slams the ground; a hero inside the radius is thrown back and
 * hurt. The radius is a full circle, so the only answer is distance, not facing.
 */
const hammerShockwave: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;
	return {
		canStart: (_ctx, distance) => distance <= num(p, "maxDistance", 7),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 1.2));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 1.2),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					const x = Position.x[ctx.entity] ?? 0;
					const z = Position.z[ctx.entity] ?? 0;
					const radius = num(p, "radius", 7);
					ctx.events.push(EventType.BossShockwave, x, z, radius, ctx.entity);
					const dx = (Position.x[ctx.hero] ?? 0) - x;
					const dz = (Position.z[ctx.hero] ?? 0) - z;
					const dist = Math.hypot(dx, dz);
					if (dist <= radius + (Radius.r[ctx.hero] ?? 0)) {
						const nx = dist > 1e-6 ? dx / dist : ctx.dirX;
						const nz = dist > 1e-6 ? dz / dist : ctx.dirZ;
						ctx.pushHero(nx, nz, num(p, "knockbackDistance", 3), num(p, "knockbackSeconds", 0.2));
						ctx.queue.push(
							ctx.hero,
							(ContactDamage.value[ctx.entity] ?? 0) * num(p, "damageMult", 1.3),
							ctx.entity,
							0,
							0,
							0,
						);
					}
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 1.2));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
	};
};

/**
 * Chains (Forgemaster): `bursts` volleys of `directions` projectiles, evenly spread, the first aimed at the hero and
 * each next one turned by half a spacing so the gaps move. Shots come from the shared enemy shot pool.
 */
const chainShot: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;
	let burstsLeft = 0;
	let baseAngle = 0;

	function volley(ctx: PatternContext, index: number): void {
		const directions = Math.max(1, Math.round(num(p, "directions", 4)));
		const speed = num(p, "projectileSpeed", 9);
		const life = Math.ceil(num(p, "range", 18) / speed / STEP);
		const damage = (ContactDamage.value[ctx.entity] ?? 0) * num(p, "damageMult", 0.7);
		const offset = (index * Math.PI) / directions;
		for (let i = 0; i < directions; i++) {
			const angle = baseAngle + offset + (i / directions) * Math.PI * 2;
			ctx.fireShot(
				Position.x[ctx.entity] ?? 0,
				Position.z[ctx.entity] ?? 0,
				Math.sin(angle) * speed,
				Math.cos(angle) * speed,
				damage,
				life,
				num(p, "projectileRadius", 0.35),
			);
		}
	}

	return {
		canStart: (_ctx, distance) => distance >= num(p, "minDistance", 3),
		start(ctx): void {
			phase = 0;
			burstsLeft = Math.max(1, Math.round(num(p, "bursts", 2)));
			baseAngle = Math.atan2(ctx.dirX, ctx.dirZ);
			timer = ctx.steps(num(p, "telegraphSeconds", 0.8));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 0.8),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					const total = Math.max(1, Math.round(num(p, "bursts", 2)));
					volley(ctx, total - burstsLeft);
					burstsLeft--;
					if (burstsLeft > 0) {
						timer = ctx.steps(num(p, "burstGapSeconds", 0.5));
					} else {
						phase = 1;
						timer = ctx.steps(num(p, "recoverSeconds", 1));
					}
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
	};
};

/** Armor phase (Forgemaster): once HP falls to `atHpFraction` the boss hardens to `armor` (and `Boss.phase` flips). */
const phaseArmor: PatternFactory = (p) => ({
	tick(ctx): void {
		if ((Boss.phase[ctx.entity] ?? 0) !== 0) return;
		if ((Health.hp[ctx.entity] ?? 0) > ctx.maxHp * num(p, "atHpFraction", 0.5)) return;
		Boss.phase[ctx.entity] = 1;
		Armor.value[ctx.entity] = num(p, "armor", 30);
		ctx.events.push(EventType.BossPhase, num(p, "phase", 2), 0, 0, ctx.entity);
	},
});

/** Unit vector the hero is moving along, or the fallback while it stands still. */
function heroHeading(
	ctx: PatternContext,
	out: { x: number; z: number },
	fallbackX: number,
	fallbackZ: number,
): void {
	const vx = Velocity.x[ctx.hero] ?? 0;
	const vz = Velocity.z[ctx.hero] ?? 0;
	const speed = Math.hypot(vx, vz);
	out.x = speed > 0.1 ? vx / speed : fallbackX;
	out.z = speed > 0.1 ? vz / speed : fallbackZ;
}

/** Hurts the hero by the boss's contact damage times `mult` when it is within `range` of (x, z). */
function hitHeroWithin(ctx: PatternContext, x: number, z: number, range: number, mult: number): boolean {
	const dist = Math.hypot((Position.x[ctx.hero] ?? 0) - x, (Position.z[ctx.hero] ?? 0) - z);
	if (dist > range + (Radius.r[ctx.hero] ?? 0)) return false;
	ctx.queue.push(ctx.hero, (ContactDamage.value[ctx.entity] ?? 0) * mult, ctx.entity, 0, 0, 0);
	return true;
}

/**
 * Stealth (Alpha Hunter): the boss vanishes (`Stealth`, so weapons cannot target it), sprints to a spot behind the
 * hero's heading, shows itself and strikes after a short telegraph. The reveal is the warning for the hero.
 */
const stealth: PatternFactory = (p) => {
	const heading = { x: 0, z: 1 };
	let phase = 0;
	let timer = 0;

	function reveal(ctx: PatternContext): void {
		if (!hasComponent(ctx.world, ctx.entity, Stealth)) return;
		removeComponent(ctx.world, ctx.entity, Stealth);
		ctx.events.push(EventType.BossStealth, 0, 1, 0, ctx.entity);
	}

	return {
		canStart: (_ctx, distance) => distance >= num(p, "minDistance", 6),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "invisibleSeconds", 3));
			const alpha = num(p, "alpha", 0.15);
			addComponent(ctx.world, ctx.entity, Stealth);
			Stealth.alpha[ctx.entity] = alpha;
			heroHeading(ctx, heading, -ctx.dirX, -ctx.dirZ);
			ctx.events.push(EventType.BossStealth, 1, alpha, num(p, "invisibleSeconds", 3), ctx.entity);
		},
		update(ctx): boolean {
			if (phase === 0) {
				heroHeading(ctx, heading, heading.x, heading.z);
				const behind = num(p, "behindDistance", 2);
				const dx = (Position.x[ctx.hero] ?? 0) - heading.x * behind - (Position.x[ctx.entity] ?? 0);
				const dz = (Position.z[ctx.hero] ?? 0) - heading.z * behind - (Position.z[ctx.entity] ?? 0);
				const dist = Math.hypot(dx, dz);
				if (dist > 0.3) {
					const v = ctx.baseSpeed * ctx.enrage * num(p, "speedMult", 2.2);
					Velocity.x[ctx.entity] = (dx / dist) * v;
					Velocity.z[ctx.entity] = (dz / dist) * v;
				} else {
					ctx.stop();
				}
				if (--timer <= 0) {
					reveal(ctx);
					ctx.stop();
					ctx.aim();
					phase = 1;
					timer = ctx.steps(num(p, "strikeTelegraphSeconds", 0.5));
					ctx.events.push(
						EventType.BossTelegraph,
						ctx.dirX,
						ctx.dirZ,
						num(p, "strikeTelegraphSeconds", 0.5),
						ctx.entity,
					);
				}
			} else if (phase === 1) {
				ctx.stop();
				if (--timer <= 0) {
					const range = num(p, "strikeRange", 2.5);
					const x = Position.x[ctx.entity] ?? 0;
					const z = Position.z[ctx.entity] ?? 0;
					ctx.events.push(EventType.BossShockwave, x, z, range, ctx.entity);
					hitHeroWithin(ctx, x, z, range, num(p, "damageMult", 2));
					phase = 2;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else {
				ctx.stop();
				if (--timer <= 0) return false;
			}
			return true;
		},
		end: (ctx) => {
			// The boss can only be cut short by dying, but a handler must not leave the entity invisible.
			if (hasComponent(ctx.world, ctx.entity, Stealth)) removeComponent(ctx.world, ctx.entity, Stealth);
		},
	};
};

/**
 * Leap (Alpha Hunter): after a telegraph that names the landing spot (where the hero stood), the boss flies there
 * in `airSeconds` and the landing hurts everything within `radius`.
 */
const leap: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;
	let targetX = 0;
	let targetZ = 0;

	return {
		canStart: (_ctx, distance) =>
			distance >= num(p, "minDistance", 5) && distance <= num(p, "maxDistance", 16),
		shift(dx, dz): void {
			targetX -= dx;
			targetZ -= dz;
		},
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 0.8));
			targetX = Position.x[ctx.hero] ?? 0;
			targetZ = Position.z[ctx.hero] ?? 0;
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				targetX,
				targetZ,
				num(p, "telegraphSeconds", 0.8),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			if (phase === 0) {
				ctx.stop();
				if (--timer <= 0) {
					phase = 1;
					timer = ctx.steps(num(p, "airSeconds", 0.5));
					ctx.events.push(
						EventType.BossLeap,
						targetX,
						targetZ,
						num(p, "airSeconds", 0.5),
						ctx.entity,
					);
				}
			} else if (phase === 1) {
				// Aim at the landing spot with exactly the time left, so the last step lands on it.
				const left = timer * STEP;
				Velocity.x[ctx.entity] = (targetX - (Position.x[ctx.entity] ?? 0)) / left;
				Velocity.z[ctx.entity] = (targetZ - (Position.z[ctx.entity] ?? 0)) / left;
				if (--timer <= 0) {
					ctx.stop();
					const radius = num(p, "radius", 3.5);
					ctx.events.push(EventType.BossShockwave, targetX, targetZ, radius, ctx.entity);
					hitHeroWithin(ctx, targetX, targetZ, radius, num(p, "damageMult", 3));
					phase = 2;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else {
				ctx.stop();
				if (--timer <= 0) return false;
			}
			return true;
		},
	};
};

/** Thermal vision (Alpha Hunter): the boss walks through blocking props instead of steering around them. */
const thermalVision: PatternFactory = () => ({
	tick(ctx): void {
		if (!hasComponent(ctx.world, ctx.entity, IgnoresProps))
			addComponent(ctx.world, ctx.entity, IgnoresProps);
	},
});

const MAX_EGGS = 12;

/**
 * Eggs (Nest Queen): after a telegraph the boss lays `count` eggs in a ring around itself. An egg is a target with
 * HP (a fraction of the boss's) that weapons can hit; if it survives `hatchSeconds` a hunter climbs out of it, as
 * soon as the enemy cap leaves room.
 */
const eggs: PatternFactory = (p) => {
	const live = new Int32Array(MAX_EGGS).fill(-1);
	let phase = 0;
	let timer = 0;

	function layEggs(ctx: PatternContext): void {
		const count = Math.max(1, Math.round(num(p, "count", 3)));
		const ring = num(p, "layRadius", 5);
		const base = Math.atan2(ctx.dirZ, ctx.dirX);
		const bx = Position.x[ctx.entity] ?? 0;
		const bz = Position.z[ctx.entity] ?? 0;
		const hatch = num(p, "hatchSeconds", 6);
		for (let i = 0; i < count; i++) {
			let slot = -1;
			for (let k = 0; k < Math.min(MAX_EGGS, Math.round(num(p, "maxEggs", 8))); k++) {
				if ((live[k] ?? -1) < 0) {
					slot = k;
					break;
				}
			}
			if (slot < 0) return;
			const angle = base + (i / count) * Math.PI * 2;
			const x = bx + Math.cos(angle) * ring;
			const z = bz + Math.sin(angle) * ring;
			const e = spawn(ctx.world);
			addComponent(ctx.world, e, Egg);
			addComponent(ctx.world, e, Position);
			addComponent(ctx.world, e, PrevPosition);
			addComponent(ctx.world, e, Health);
			addComponent(ctx.world, e, Radius);
			Position.x[e] = PrevPosition.x[e] = x;
			Position.z[e] = PrevPosition.z[e] = z;
			Health.hp[e] = Health.max[e] = ctx.maxHp * num(p, "hpFractionOfBoss", 0.03);
			Radius.r[e] = num(p, "eggRadius", 0.6);
			Egg.hatch[e] = ctx.steps(hatch);
			live[slot] = e;
			ctx.events.push(EventType.BossEggLaid, x, z, hatch, e);
		}
	}

	function clear(world: GameWorld): void {
		for (let i = 0; i < MAX_EGGS; i++) {
			const e = live[i] ?? -1;
			if (e >= 0 && hasComponent(world, e, Egg)) removeEntity(world, e);
			live[i] = -1;
		}
	}

	return {
		canStart(): boolean {
			let used = 0;
			for (let i = 0; i < MAX_EGGS; i++) if ((live[i] ?? -1) >= 0) used++;
			return used + Math.round(num(p, "count", 3)) <= Math.round(num(p, "maxEggs", 8));
		},
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 0.8));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 0.8),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					layEggs(ctx);
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
		tick(ctx): void {
			for (let i = 0; i < MAX_EGGS; i++) {
				const e = live[i] ?? -1;
				if (e < 0) continue;
				if (!hasComponent(ctx.world, e, Egg)) {
					live[i] = -1;
					continue;
				}
				const x = Position.x[e] ?? 0;
				const z = Position.z[e] ?? 0;
				if ((Health.hp[e] ?? 0) <= 0) {
					ctx.events.push(EventType.BossEggBroken, x, z, 0, e);
					removeEntity(ctx.world, e);
					live[i] = -1;
					continue;
				}
				if ((Egg.hatch[e] ?? 0) > 0) Egg.hatch[e] = (Egg.hatch[e] ?? 0) - 1;
				else if (ctx.spawn.hasRoom(ctx.world)) {
					const born = ctx.spawn.spawnEnemy(
						ctx.world,
						ctx.enemyIndex(typeof p.enemy === "string" ? p.enemy : "hunter"),
						x,
						z,
					);
					ctx.events.push(EventType.BossEggHatched, x, z, born, e);
					removeEntity(ctx.world, e);
					live[i] = -1;
				}
			}
		},
		insertInto(hash): void {
			for (let i = 0; i < MAX_EGGS; i++) {
				const e = live[i] ?? -1;
				if (e >= 0) hash.insert(e, Position.x[e] ?? 0, Position.z[e] ?? 0);
			}
		},
		reset: clear,
	};
};

/** Tail sweep (Nest Queen): a close-range arc that hurts the hero inside it after a telegraph. */
const sweep: PatternFactory = (p) => {
	let phase = 0;
	let timer = 0;

	function lash(ctx: PatternContext): void {
		const range = num(p, "range", 5);
		const cos = Math.cos(((num(p, "arcDegrees", 200) / 2) * Math.PI) / 180);
		const x = Position.x[ctx.entity] ?? 0;
		const z = Position.z[ctx.entity] ?? 0;
		ctx.events.push(EventType.BossSweep, ctx.dirX, ctx.dirZ, range, ctx.entity);
		const dx = (Position.x[ctx.hero] ?? 0) - x;
		const dz = (Position.z[ctx.hero] ?? 0) - z;
		const dist = Math.hypot(dx, dz);
		if (dist < 1e-6 || (dx * ctx.dirX + dz * ctx.dirZ) / dist >= cos) {
			hitHeroWithin(ctx, x, z, range, num(p, "damageMult", 2));
		}
	}

	return {
		canStart: (_ctx, distance) => distance <= num(p, "maxDistance", 5),
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 0.9));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 0.9),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					lash(ctx);
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 1));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
	};
};

const MAX_BOMBS = 8;

/**
 * Flying bombardment (Nest Queen, phase 2): once HP falls to `atHpFraction` the boss takes off (`Boss.phase` flips,
 * it walks through props) and its attack becomes a salvo of `count` bombs dropped on and around the hero. Each bomb
 * is announced by `BossBomb` and explodes `delaySeconds` later, one after the other `gapSeconds` apart.
 */
const flyBomb: PatternFactory = (p) => {
	const bombX = new Float32Array(MAX_BOMBS);
	const bombZ = new Float32Array(MAX_BOMBS);
	const bombLeft = new Uint16Array(MAX_BOMBS);
	let next = 0;
	let phase = 0;
	let timer = 0;

	return {
		canStart: (ctx) => (Boss.phase[ctx.entity] ?? 0) !== 0,
		shift(dx, dz): void {
			for (let i = 0; i < MAX_BOMBS; i++) {
				bombX[i] = (bombX[i] ?? 0) - dx;
				bombZ[i] = (bombZ[i] ?? 0) - dz;
			}
		},
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 0.6));
			ctx.stop();
			ctx.events.push(
				EventType.BossTelegraph,
				ctx.dirX,
				ctx.dirZ,
				num(p, "telegraphSeconds", 0.6),
				ctx.entity,
			);
		},
		update(ctx): boolean {
			ctx.stop();
			if (phase === 0) {
				if (--timer <= 0) {
					const count = Math.min(MAX_BOMBS, Math.max(1, Math.round(num(p, "count", 4))));
					const spread = num(p, "spread", 3.5);
					for (let i = 0; i < count; i++) {
						// The first bomb falls on the hero; the rest ring it, so standing still is the worst answer.
						const angle = (i / count) * Math.PI * 2;
						const x = (Position.x[ctx.hero] ?? 0) + (i === 0 ? 0 : Math.cos(angle) * spread);
						const z = (Position.z[ctx.hero] ?? 0) + (i === 0 ? 0 : Math.sin(angle) * spread);
						const delay = num(p, "delaySeconds", 1.2) + i * num(p, "gapSeconds", 0.3);
						bombX[next] = x;
						bombZ[next] = z;
						bombLeft[next] = ctx.steps(delay);
						next = (next + 1) % MAX_BOMBS;
						ctx.events.push(EventType.BossBomb, x, z, delay, ctx.entity);
					}
					phase = 1;
					timer = ctx.steps(num(p, "recoverSeconds", 1.5));
				}
			} else if (--timer <= 0) {
				return false;
			}
			return true;
		},
		tick(ctx): void {
			if (
				(Boss.phase[ctx.entity] ?? 0) === 0 &&
				(Health.hp[ctx.entity] ?? 0) <= ctx.maxHp * num(p, "atHpFraction", 0.5)
			) {
				Boss.phase[ctx.entity] = 1;
				addComponent(ctx.world, ctx.entity, IgnoresProps);
				ctx.events.push(EventType.BossPhase, num(p, "phase", 2), 0, 0, ctx.entity);
			}
			const radius = num(p, "radius", 2.5);
			for (let i = 0; i < MAX_BOMBS; i++) {
				const left = bombLeft[i] ?? 0;
				if (left === 0) continue;
				bombLeft[i] = left - 1;
				if (left > 1) continue;
				ctx.events.push(EventType.Exploded, bombX[i] ?? 0, bombZ[i] ?? 0, radius, ctx.entity);
				hitHeroWithin(ctx, bombX[i] ?? 0, bombZ[i] ?? 0, radius, num(p, "damageMult", 2));
			}
		},
	};
};

const REGISTRY = new Map<string, PatternFactory>([
	["line_charge", lineCharge],
	["shovel_arc", shovelArc],
	["summon", summon],
	["mud_pool", mudPool],
	["scream", scream],
	["hammer_shockwave", hammerShockwave],
	["chain_shot", chainShot],
	["phase_armor", phaseArmor],
	["stealth", stealth],
	["leap", leap],
	["thermal_vision", thermalVision],
	["eggs", eggs],
	["sweep", sweep],
	["fly_bomb", flyBomb],
]);

/** Adds a pattern for the next bosses (A-03-01 onward). Throws when the id is taken. */
export function registerPattern(id: string, factory: PatternFactory): void {
	if (REGISTRY.has(id)) throw new RangeError(`boss pattern "${id}" is already registered`);
	REGISTRY.set(id, factory);
}

export function hasPattern(id: string): boolean {
	return REGISTRY.has(id);
}

/** Builds a handler per pattern of a boss definition, in data order. Unknown ids throw. */
export function buildPatterns(
	patterns: readonly BossPatternData[],
): { id: string; handler: PatternHandler }[] {
	return patterns.map((pattern) => {
		const factory = REGISTRY.get(pattern.id);
		if (!factory) throw new RangeError(`unknown boss pattern "${pattern.id}"`);
		return { id: pattern.id, handler: factory(pattern.params ?? {}) };
	});
}
