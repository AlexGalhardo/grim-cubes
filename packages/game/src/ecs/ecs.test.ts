import { hasComponent } from "bitecs";
import { expect, test } from "vitest";
import { MAX_ENTITIES, Position, PrevPosition } from "./components";
import { consumeEvents, createEventBuffer, EventType } from "./events";
import { createGameWorld, spawn, spawnBody } from "./world";

test("spawnBody sets matching position and previous position", () => {
	const world = createGameWorld();
	const eid = spawnBody(world, 3, -2);
	expect(hasComponent(world, eid, Position)).toBe(true);
	expect(Position.x[eid]).toBe(3);
	expect(PrevPosition.z[eid]).toBe(-2);
});

test("spawn refuses to exceed the component array size", () => {
	const world = createGameWorld();
	for (let i = 1; i < MAX_ENTITIES; i++) spawn(world); // ids start at 1
	expect(() => spawn(world)).toThrow(RangeError);
});

test("event buffer drops the oldest events and drains in order", () => {
	const events = createEventBuffer(3);
	for (let i = 1; i <= 5; i++) events.push(EventType.Damaged, i, 0, 0, i);
	const seen: number[] = [];
	consumeEvents(events, (_t, a) => seen.push(a));
	expect(seen).toEqual([3, 4, 5]);
	expect(events.size).toBe(0);
});

test("OriginShifted carries dx and dz", () => {
	const events = createEventBuffer();
	events.push(EventType.OriginShifted, 16, -32, 0, 0);
	let got: [number, number, number] | null = null;
	events.consume((t, a, b) => {
		got = [t, a, b];
	});
	expect(got).toEqual([EventType.OriginShifted, 16, -32]);
});
