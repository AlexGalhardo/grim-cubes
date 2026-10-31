import type { BossPatternData } from "../data/types";
import { Boss, ContactDamage, Health, Position, Radius, Velocity } from "../ecs/components";
import type { EventBuffer } from "../ecs/events";
import { EventType } from "../ecs/events";
import type { GameWorld } from "../ecs/world";
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

/** Once, when HP falls to `atHpFraction`: the boss's minions appear around it (`Boss.phase` is the bar's 50% mark). */
const summon: PatternFactory = (p) => {
	return {
		tick(ctx): void {
			if ((Boss.phase[ctx.entity] ?? 0) !== 0) return;
			if ((Health.hp[ctx.entity] ?? 0) > ctx.maxHp * num(p, "atHpFraction", 0.5)) return;
			Boss.phase[ctx.entity] = 1;
			const count = num(p, "count", 6);
			const x = Position.x[ctx.entity] ?? 0;
			const z = Position.z[ctx.entity] ?? 0;
			for (let i = 0; i < count; i++) {
				const angle = (i / count) * Math.PI * 2;
				ctx.spawn.spawnEnemy(
					ctx.world,
					ctx.summonType,
					x + Math.cos(angle) * 2.5,
					z + Math.sin(angle) * 2.5,
				);
			}
			ctx.events.push(EventType.BossSummon, x, z, count, ctx.entity);
		},
	};
};

const REGISTRY = new Map<string, PatternFactory>([
	["line_charge", lineCharge],
	["shovel_arc", shovelArc],
	["summon", summon],
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
