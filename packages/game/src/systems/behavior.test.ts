import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import {
	Behavior,
	ContactCooldown,
	ContactDamage,
	EnemyFaction,
	Health,
	Invulnerable,
	PlayerFaction,
	Position,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, type GameWorld, spawn, spawnBody } from "../ecs/world";
import { STEP } from "../loop";
import { damageConfigFromHero, type HeroCombatData } from "../rules/damage";
import { BehaviorKind, createBehaviorSystem } from "./behavior";
import { createDamageSystem } from "./damage";

const hero = JSON.parse(readFileSync(new URL("../../../../data/hero.json", import.meta.url), "utf8")) as {
	combat: { contactCooldownSeconds: number };
} & HeroCombatData;

function setup() {
	const world = createGameWorld();
	const h = spawnBody(world, 0, 0);
	for (const c of [PlayerFaction, Velocity, Radius, Health, Invulnerable]) addComponent(world, h, c);
	Radius.r[h] = 0.5;
	Health.hp[h] = Health.max[h] = 1e6;
	const events = createEventBuffer(8192);
	const damage = createDamageSystem({
		config: damageConfigFromHero(hero),
		rng: { dodge: mulberry32(1), combat: mulberry32(2) },
		events,
		hero: h,
		stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
	});
	const behavior = createBehaviorSystem(
		{
			zigzag: { amplitude: 1.5, periodSeconds: 0.8 },
			contactCooldownSeconds: hero.combat.contactCooldownSeconds,
		},
		damage.queue,
	);
	return { world, h, events, damage, behavior };
}

function enemy(world: GameWorld, x: number, z: number, kind: number, speed: number): number {
	const e = spawn(world);
	for (const c of [EnemyFaction, Position, Velocity, Radius, Speed, Behavior, ContactDamage])
		addComponent(world, e, c);
	Position.x[e] = x;
	Position.z[e] = z;
	Radius.r[e] = 0.45;
	Speed.value[e] = speed;
	Behavior.kind[e] = kind;
	Behavior.timer[e] = 0;
	ContactDamage.value[e] = 3;
	ContactCooldown.ticks[e] = 0;
	return e;
}

function tick(ctx: ReturnType<typeof setup>): void {
	ctx.behavior.run(ctx.world, ctx.h);
	ctx.damage.run(ctx.world);
	for (const e of [...Array(2000).keys()]) {
		if ((Speed.value[e] ?? 0) > 0 && (Radius.r[e] ?? 0) > 0 && e !== ctx.h) {
			Position.x[e] = (Position.x[e] ?? 0) + (Velocity.x[e] ?? 0) * STEP;
			Position.z[e] = (Position.z[e] ?? 0) + (Velocity.z[e] ?? 0) * STEP;
		}
	}
}

test("a husk 10 u away reaches the idle hero within 3 s", () => {
	const ctx = setup();
	const husk = enemy(ctx.world, 10, 0, BehaviorKind.Chase, 3.5);
	let reached = -1;
	for (let step = 0; step < 180; step++) {
		tick(ctx);
		if (Math.hypot(Position.x[husk] ?? 0, Position.z[husk] ?? 0) <= 0.95) {
			reached = step;
			break;
		}
	}
	expect(reached).toBeGreaterThan(0);
	expect(reached * STEP).toBeLessThanOrEqual(3);
});

test("ten husks around the hero cause at most one hit per 0.3 s", () => {
	const ctx = setup();
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2;
		enemy(ctx.world, Math.cos(a) * 0.9, Math.sin(a) * 0.9, BehaviorKind.Chase, 3.5);
	}
	const hitSteps: number[] = [];
	for (let step = 0; step < 300; step++) {
		tick(ctx);
		ctx.events.consume((type) => {
			if (type === EventType.PlayerHit) hitSteps.push(step);
		});
	}
	expect(hitSteps.length).toBeGreaterThan(5);
	for (let i = 1; i < hitSteps.length; i++) {
		expect(((hitSteps[i] ?? 0) - (hitSteps[i - 1] ?? 0)) * STEP).toBeGreaterThanOrEqual(0.3 - 1e-6);
	}
});

test("a single husk hits at most once per contact cooldown", () => {
	const ctx = setup();
	const husk = enemy(ctx.world, 0.9, 0, BehaviorKind.Chase, 0);
	void husk;
	let hits = 0;
	for (let step = 0; step < 120; step++) {
		tick(ctx);
		ctx.events.consume((type) => {
			if (type === EventType.PlayerHit) hits++;
		});
	}
	expect(hits).toBe(4);
});

test("zigzag reaches the hero and moves sideways", () => {
	const ctx = setup();
	const wail = enemy(ctx.world, 10, 0, BehaviorKind.Zigzag, 5.5);
	let maxLateral = 0;
	let reached = false;
	for (let step = 0; step < 300 && !reached; step++) {
		tick(ctx);
		maxLateral = Math.max(maxLateral, Math.abs(Position.z[wail] ?? 0));
		reached = Math.hypot(Position.x[wail] ?? 0, Position.z[wail] ?? 0) < 1.2;
	}
	expect(reached).toBe(true);
	expect(maxLateral).toBeGreaterThan(0.2);
});
