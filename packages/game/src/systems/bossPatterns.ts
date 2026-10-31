import type { BossPatternData } from "../data/types";
import { Armor, Boss, ContactDamage, Health, Position, Radius, Velocity } from "../ecs/components";
import type { EventBuffer } from "../ecs/events";
import { EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
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
		start(ctx): void {
			phase = 0;
			timer = ctx.steps(num(p, "telegraphSeconds", 1));
			targetX = Position.x[ctx.hero] ?? 0;
			targetZ = Position.z[ctx.hero] ?? 0;
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

const REGISTRY = new Map<string, PatternFactory>([
	["line_charge", lineCharge],
	["shovel_arc", shovelArc],
	["summon", summon],
	["mud_pool", mudPool],
	["scream", scream],
	["hammer_shockwave", hammerShockwave],
	["chain_shot", chainShot],
	["phase_armor", phaseArmor],
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
