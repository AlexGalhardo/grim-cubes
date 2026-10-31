import { createInputState } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { PlayerFaction, Position, PrevPosition, Speed, Velocity } from "../ecs/components";
import { createGameWorld, spawnBody } from "../ecs/world";
import { inputSystem } from "./input";
import { movementSystem } from "./movement";

function hero() {
	const world = createGameWorld();
	const eid = spawnBody(world, 0, 0);
	addComponent(world, eid, PlayerFaction);
	addComponent(world, eid, Velocity);
	Speed.value[eid] = 6;
	return { world, eid, input: createInputState() };
}

test("holding right for one second moves the hero 6 u and keeps the previous position", () => {
	const { world, eid, input } = hero();
	input.moveX = 1;
	for (let i = 0; i < 60; i++) {
		inputSystem(world, eid, input);
		movementSystem(world);
	}
	expect(Position.x[eid]).toBeCloseTo(6, 3);
	expect(Position.z[eid]).toBeCloseTo(0, 5);
	expect(Position.x[eid] ?? 0).toBeGreaterThan(PrevPosition.x[eid] ?? 0);
});

test("diagonal input keeps the same speed", () => {
	const { world, eid, input } = hero();
	input.moveX = Math.SQRT1_2;
	input.moveZ = Math.SQRT1_2;
	inputSystem(world, eid, input);
	expect(Math.hypot(Velocity.x[eid] ?? 0, Velocity.z[eid] ?? 0)).toBeCloseTo(6);
});

test("no input stops the hero", () => {
	const { world, eid, input } = hero();
	Velocity.x[eid] = 5;
	inputSystem(world, eid, input);
	expect(Velocity.x[eid]).toBe(0);
});
