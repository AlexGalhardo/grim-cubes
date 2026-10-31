import { readFileSync } from "node:fs";
import { createStreams } from "@gc/core";
import { addComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import { PlayerFaction, Position, PrevPosition } from "../ecs/components";
import { createEventBuffer, EventType } from "../ecs/events";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createChunkSystem, type WorldConfig } from "./chunkSystem";
import { applyOriginShift, createOrigin } from "./originShift";
import { findHero } from "./queries";

const config = JSON.parse(
	readFileSync(new URL("../../../../data/world.json", import.meta.url), "utf8"),
) as WorldConfig;

const SPEED = 6 / 60;
const TOLERANCE = 0.01;

interface Run {
	shifts: number;
	finalOrigin: number;
	finalHeroX: number;
	maxRelative: number;
}

function walk(distance: number, steps = Math.ceil(distance / SPEED)): Run {
	const world = createGameWorld();
	const events = createEventBuffer();
	const origin = createOrigin();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);

	// Fixed fixture: seed 42 scatters entity props and chunk props (absolute, never shifted) along the path.
	const rng = createStreams(42).world;
	const bodyProps: number[] = [];
	for (let i = 0; i < 10; i++) bodyProps.push(spawnBody(world, rng.float(0, 1500), rng.float(-20, 20)));
	const chunkProps = Array.from({ length: 10 }, () => ({
		x: rng.float(0, distance),
		z: rng.float(-20, 20),
	}));

	const chunks = createChunkSystem(config, () => {});
	let shifts = 0;
	let maxRelative = 0;
	for (let step = 0; step < steps; step++) {
		PrevPosition.x[hero] = Position.x[hero] ?? 0;
		Position.x[hero] = (Position.x[hero] ?? 0) + SPEED;

		const bodyBefore = bodyProps.map((p) => (Position.x[p] ?? 0) - (Position.x[hero] ?? 0));
		const chunkBefore = chunkProps.map((p) => p.x - origin.x - (Position.x[hero] ?? 0));
		const heroAbsBefore = origin.x + (Position.x[hero] ?? 0);
		const bodyAbsBefore = bodyProps.map((p) => origin.x + (Position.x[p] ?? 0));

		if (applyOriginShift(world, origin, hero, events, config)) {
			shifts++;
			bodyProps.forEach((p, i) => {
				expect(
					Math.abs((Position.x[p] ?? 0) - (Position.x[hero] ?? 0) - (bodyBefore[i] ?? 0)),
				).toBeLessThan(TOLERANCE);
				expect(Math.abs(origin.x + (Position.x[p] ?? 0) - (bodyAbsBefore[i] ?? 0))).toBeLessThan(
					TOLERANCE,
				);
			});
			chunkProps.forEach((p, i) => {
				expect(
					Math.abs(p.x - origin.x - (Position.x[hero] ?? 0) - (chunkBefore[i] ?? 0)),
				).toBeLessThan(TOLERANCE);
			});
			expect(Math.abs(origin.x + (Position.x[hero] ?? 0) - heroAbsBefore)).toBeLessThan(TOLERANCE);
			expect(Math.abs((PrevPosition.x[hero] ?? 0) - (Position.x[hero] ?? 0))).toBeLessThan(
				SPEED + TOLERANCE,
			);
			expect(origin.x % config.chunkSize).toBe(0);
		}
		maxRelative = Math.max(maxRelative, Math.abs(Position.x[hero] ?? 0));

		const generatedBefore = chunks.stats.generated;
		chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
		expect(chunks.stats.generated - generatedBefore).toBeLessThanOrEqual(config.chunksPerStep);
	}
	return { shifts, finalOrigin: origin.x, finalHeroX: Position.x[hero] ?? 0, maxRelative };
}

describe("applyOriginShift", () => {
	it("keeps hero/prop distances continuous over 5000 u in relative and absolute coordinates", () => {
		const run = walk(5000);
		expect(run.shifts).toBeGreaterThanOrEqual(4);
		expect(run.maxRelative).toBeLessThanOrEqual(config.originShiftThreshold + 16);
		// Position is f32, so 50k additions of 0.1 drift by rounding; a shift bug would show as a multiple of 16.
		expect(Math.abs(run.finalOrigin + run.finalHeroX - 5000)).toBeLessThan(1);
	});

	it("is deterministic", () => {
		expect(walk(3000)).toEqual(walk(3000));
	});

	it("emits OriginShifted with the applied delta and ignores a hero inside the threshold", () => {
		const world = createGameWorld();
		const events = createEventBuffer();
		const origin = createOrigin();
		const hero = spawnBody(world, 1100, -3);
		addComponent(world, hero, PlayerFaction);
		expect(findHero(world)).toBe(hero);
		expect(applyOriginShift(world, origin, hero, events, config)).toBe(true);
		const seen: number[] = [];
		events.consume((type, a, b) => seen.push(type, a, b));
		expect(seen).toEqual([EventType.OriginShifted, 1104, 0]);
		expect(Position.x[hero]).toBe(-4);
		expect(PrevPosition.x[hero]).toBe(-4);
		expect(origin).toEqual({ x: 1104, z: 0 });
		expect(applyOriginShift(world, origin, hero, events, config)).toBe(false);
		expect(events.size).toBe(0);
	});

	it("does not allocate arrays or strings per step, including the shift path and findHero", () => {
		const world = createGameWorld();
		const events = createEventBuffer();
		const origin = createOrigin();
		const hero = spawnBody(world, 0, 0);
		addComponent(world, hero, PlayerFaction);
		for (let i = 0; i < 20; i++) spawnBody(world, i, i);
		const step = (): void => {
			Position.x[hero] = 1100;
			findHero(world);
			applyOriginShift(world, origin, hero, events, config);
		};
		for (let i = 0; i < 100; i++) step();

		// bitecs query() builds arrays with filter/map and a cache key with join; count them as a proxy for allocation.
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
			for (let i = 0; i < 1000; i++) step();
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
	});
});
