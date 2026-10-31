import { readFileSync } from "node:fs";
import { mulberry32 } from "@gc/core";
import { addComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import {
	Armor,
	Behavior,
	ContactDamage,
	EnemyFaction,
	EnemyType,
	Health,
	Invulnerable,
	PlayerFaction,
	Position,
	PrevPosition,
	Radius,
	Speed,
	Velocity,
} from "../ecs/components";
import { createEventBuffer } from "../ecs/events";
import { createGameWorld, type GameWorld, spawn, spawnBody } from "../ecs/world";
import { damageConfigFromHero, type HeroCombatData } from "../rules/damage";
import { BehaviorKind, createBehaviorSystem } from "../systems/behavior";
import { createDamageSystem } from "../systems/damage";
import { movementSystem } from "../systems/movement";
import { createSeparationSystem } from "../systems/separation";
import { PROP_KIND } from "./chunkGen";
import { type ChunkData, type ChunkGenerator, createChunkSystem, type WorldConfig } from "./chunkSystem";
import { createOrigin } from "./originShift";
import { createPropCollision } from "./propCollision";

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const world$ = read("../../../../data/world.json") as WorldConfig;
const hero$ = read("../../../../data/hero.json") as {
	combat: { contactCooldownSeconds: number };
} & HeroCombatData;
const fixture = read("../../../../tests/fixtures/prop-field-20.json") as {
	radii: number[];
	props: { x: number; z: number; r: number; type: number }[];
};

interface PropAt {
	x: number;
	z: number;
	type: number;
}

/** Chunk generator placing the given absolute props into whichever chunk contains them. */
function generatorFor(props: readonly PropAt[]): ChunkGenerator {
	return (cx: number, cz: number, out: ChunkData): void => {
		out.propCount = 0;
		for (const p of props) {
			if (Math.floor(p.x / world$.chunkSize) !== cx || Math.floor(p.z / world$.chunkSize) !== cz)
				continue;
			const n = out.propCount++;
			out.propType[n] = p.type;
			out.propKind[n] = PROP_KIND.blocking;
			out.propX[n] = p.x - cx * world$.chunkSize;
			out.propZ[n] = p.z - cz * world$.chunkSize;
		}
	};
}

function setup(props: readonly PropAt[], radii: readonly number[]) {
	const chunks = createChunkSystem(world$, generatorFor(props));
	for (let i = 0; i < 60; i++) chunks.update(0, 0);
	const collision = createPropCollision(chunks, {
		chunkSize: world$.chunkSize,
		avoidLookahead: world$.propAvoidLookahead,
		steerGain: world$.propSteerGain,
		steerMargin: world$.propSteerMargin,
		radiusByType: Float32Array.from(radii),
	});
	return { chunks, collision, origin: createOrigin(), world: createGameWorld() };
}

function makeHero(world: GameWorld, x: number, z: number, radius: number): number {
	const h = spawnBody(world, x, z);
	for (const c of [PlayerFaction, Velocity, Radius, Health, Invulnerable]) addComponent(world, h, c);
	Radius.r[h] = radius;
	Health.hp[h] = Health.max[h] = 1e9;
	return h;
}

function makeEnemy(world: GameWorld, x: number, z: number, speed: number): number {
	const e = spawn(world);
	for (const c of [
		EnemyFaction,
		Position,
		PrevPosition,
		Velocity,
		Radius,
		Speed,
		Behavior,
		ContactDamage,
		EnemyType,
		Health,
		Armor,
	]) {
		addComponent(world, e, c);
	}
	Position.x[e] = PrevPosition.x[e] = x;
	Position.z[e] = PrevPosition.z[e] = z;
	Radius.r[e] = 0.45;
	Speed.value[e] = speed;
	Behavior.kind[e] = BehaviorKind.Chase;
	ContactDamage.value[e] = 1;
	Health.hp[e] = Health.max[e] = 10;
	return e;
}

describe("hero collision", () => {
	it("never crosses a tombstone and keeps r_prop + r_hero apart", () => {
		const { collision, origin, world } = setup([{ x: 0.5, z: 0, type: 0 }], [0.45]);
		const hero = makeHero(world, -3, 0.15, 0.4);
		Velocity.x[hero] = 6;
		let closest = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		for (let step = 0; step < 240; step++) {
			movementSystem(world);
			collision.resolve(world, origin, hero);
			const dx = (Position.x[hero] ?? 0) - 0.5;
			const dz = (Position.z[hero] ?? 0) - 0;
			closest = Math.min(closest, Math.hypot(dx, dz));
			maxX = Math.max(maxX, Position.x[hero] ?? 0);
		}
		expect(closest).toBeGreaterThanOrEqual(0.45 + 0.4 - 0.01);
		// Pushing straight into it while slightly off-centre slides the hero around instead of through.
		expect(maxX).toBeGreaterThan(0.5);
	});

	it("works across chunk borders and after an origin shift", () => {
		const { collision, world } = setup([{ x: 16.2, z: 0, type: 0 }], [0.45]);
		const origin = { x: 16, z: 0 };
		const hero = makeHero(world, -1, 0.1, 0.4);
		Position.x[hero] = -1;
		PrevPosition.x[hero] = -1;
		Velocity.x[hero] = 5;
		let closest = Number.POSITIVE_INFINITY;
		for (let step = 0; step < 90; step++) {
			movementSystem(world);
			collision.resolve(world, origin, hero);
			closest = Math.min(closest, Math.hypot((Position.x[hero] ?? 0) - 0.2, Position.z[hero] ?? 0));
		}
		expect(closest).toBeGreaterThanOrEqual(0.45 + 0.4 - 0.01);
	});
});

describe("enemy steering", () => {
	it("bends the heading around a prop dead ahead and keeps the speed", () => {
		const { collision, origin, world } = setup([{ x: 2, z: 0.05, type: 0 }], [0.45]);
		const e = makeEnemy(world, 0, 0, 3.5);
		Velocity.x[e] = 3.5;
		Velocity.z[e] = 0;
		collision.steer(world, origin);
		expect(Math.hypot(Velocity.x[e] ?? 0, Velocity.z[e] ?? 0)).toBeCloseTo(3.5, 6);
		expect(Math.abs(Velocity.z[e] ?? 0)).toBeGreaterThan(0.3);
		// The prop is slightly on the +z side of the heading, so the enemy turns towards -z.
		expect(Velocity.z[e] ?? 0).toBeLessThan(0);
	});

	it("leaves props behind or far to the side alone", () => {
		const { collision, origin, world } = setup(
			[
				{ x: -3, z: 0, type: 0 },
				{ x: 3, z: 4, type: 0 },
			],
			[0.45],
		);
		const e = makeEnemy(world, 0, 0, 3.5);
		Velocity.x[e] = 3.5;
		collision.steer(world, origin);
		expect(Velocity.x[e]).toBe(3.5);
		expect(Velocity.z[e] ?? 0).toBe(0);
	});
});

const CROWD_RADIUS = 3;

describe("horde through a 20-prop field", () => {
	it("100 chasing enemies reach the hero within 15 simulated seconds, none inside a prop", () => {
		const props = fixture.props.map((p) => ({ x: p.x, z: p.z, type: p.type }));
		const { chunks, collision, origin, world } = setup(props, fixture.radii);
		const hero = makeHero(world, 0, 0, 0.4);
		const events = createEventBuffer(8192);
		const damage = createDamageSystem({
			config: damageConfigFromHero(hero$),
			rng: { dodge: mulberry32(1), combat: mulberry32(2) },
			events,
			hero,
			stats: { armor: 0, dodge: 0, critMult: 2, lifeSteal: 0 },
		});
		const behavior = createBehaviorSystem(
			{
				zigzag: { amplitude: 1.5, periodSeconds: 0.8 },
				contactCooldownSeconds: hero$.combat.contactCooldownSeconds,
				attackAnimationSeconds: 0.4,
			},
			damage.queue,
		);
		const separation = createSeparationSystem({ weight: 1, maxRadius: 0.45 });

		const enemies: number[] = [];
		for (let i = 0; i < 100; i++) {
			const angle = (i / 100) * 2 * Math.PI;
			enemies.push(makeEnemy(world, Math.cos(angle) * 13, Math.sin(angle) * 13, 3.5));
		}
		const reached = new Set<number>();
		let worstOverlap = 0;
		const steps = 15 * 60;
		for (let step = 0; step < steps; step++) {
			chunks.update(0, 0);
			behavior.run(world, hero);
			collision.steer(world, origin);
			separation.run(world);
			movementSystem(world);
			collision.resolveEnemies(world, origin);
			damage.run(world);
			for (const e of enemies) {
				const d = Math.hypot(Position.x[e] ?? 0, Position.z[e] ?? 0);
				// Contact plus the crowd packed around the hero: 100 bodies cannot all touch it.
				if (d <= CROWD_RADIUS) reached.add(e);
			}
		}
		for (const e of enemies) {
			for (const p of fixture.props) {
				const gap = Math.hypot((Position.x[e] ?? 0) - p.x, (Position.z[e] ?? 0) - p.z) - (p.r + 0.45);
				worstOverlap = Math.min(worstOverlap, gap);
			}
		}
		expect(reached.size).toBe(100);
		expect(worstOverlap).toBeGreaterThanOrEqual(-0.01);
	});
});

describe("allocation", () => {
	it("steer and resolve allocate no arrays per call", () => {
		const props = fixture.props.map((p) => ({ x: p.x, z: p.z, type: p.type }));
		const { collision, origin, world } = setup(props, fixture.radii);
		const enemies: number[] = [];
		for (let i = 0; i < 50; i++) {
			const e = makeEnemy(world, Math.cos(i) * 8, Math.sin(i) * 8, 3.5);
			Velocity.x[e] = -3;
			enemies.push(e);
		}
		for (let i = 0; i < 20; i++) {
			collision.steer(world, origin);
			collision.resolveEnemies(world, origin);
		}
		let calls = 0;
		const proto = Array.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
		const originals = new Map<string, (...args: unknown[]) => unknown>();
		for (const name of ["filter", "map", "slice", "concat", "join"]) {
			const original = proto[name];
			if (!original) continue;
			originals.set(name, original);
			proto[name] = function (this: unknown, ...args: unknown[]): unknown {
				calls++;
				return original.apply(this, args);
			};
		}
		try {
			for (let i = 0; i < 300; i++) {
				collision.steer(world, origin);
				collision.resolveEnemies(world, origin);
			}
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
	});
});
