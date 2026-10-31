import { createInputState } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { Facing, PlayerFaction, Position, PrevPosition, Speed, Velocity } from "../ecs/components";
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

test("movement updates Facing from the velocity direction and keeps it when stopped", () => {
	const { world, eid, input } = hero();
	input.moveX = 1;
	inputSystem(world, eid, input);
	movementSystem(world);
	expect(Facing.yaw[eid]).toBeCloseTo(Math.PI / 2);
	input.moveX = 0;
	input.moveZ = -1;
	inputSystem(world, eid, input);
	movementSystem(world);
	expect(Math.abs(Facing.yaw[eid] ?? 0)).toBeCloseTo(Math.PI);
	input.moveZ = 0;
	inputSystem(world, eid, input);
	movementSystem(world);
	expect(Math.abs(Facing.yaw[eid] ?? 0)).toBeCloseTo(Math.PI);
});
