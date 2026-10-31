import { createInputState } from "@gc/core";
import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { heroData } from "../data";
import { Invulnerable, PlayerFaction, Position, Speed, Velocity } from "../ecs/components";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createDashSystem } from "./dash";
import { inputSystem } from "./input";
import { movementSystem } from "./movement";

const unlocked = { unlocked: true, charges: 1, cooldownReductionSeconds: 0 };

function setup(options = unlocked) {
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	addComponent(world, hero, Velocity);
	Speed.value[hero] = heroData.base.speed;
	const input = createInputState();
	const dash = createDashSystem(heroData.dash, options);
	const step = (): void => {
		inputSystem(world, hero, input);
		dash.run(hero, input);
		movementSystem(world);
		const ticks = Invulnerable.ticks[hero] ?? 0;
		if (ticks > 0) Invulnerable.ticks[hero] = ticks - 1;
	};
	return { world, hero, input, dash, step };
}

test("the hero has no dash until the Ossuary unlocks it", () => {
	const { hero, input, step } = setup({ ...unlocked, unlocked: false });
	input.moveX = 1;
	input.dash = true;
	for (let i = 0; i < 20; i++) step();
	expect(Position.x[hero]).toBeCloseTo(heroData.base.speed * (20 / 60), 3);
});

test("a dash moves 4 u in 0.15 s on top of normal movement and gives 0.2 s of i-frames", () => {
	const { hero, input, step } = setup();
	input.moveX = 1;
	input.dash = true;
	let invulnerableSteps = 0;
	for (let i = 0; i < 9; i++) {
		step();
		input.dash = false;
		if ((Invulnerable.ticks[hero] ?? 0) > 0) invulnerableSteps++;
	}
	expect(Position.x[hero]).toBeCloseTo(heroData.dash.distance, 1);
	input.moveX = 0;
	for (let i = 0; i < 20; i++) {
		step();
		if ((Invulnerable.ticks[hero] ?? 0) > 0) invulnerableSteps++;
	}
	// 0.2 s = exactly 12 steps in which a hit would be refused, counting the step that starts the dash.
	expect(invulnerableSteps).toBe(12);
});

test("the dash has a 3 s cooldown, holding the key does not repeat it", () => {
	const { hero, input, step, dash } = setup();
	input.moveX = 1;
	input.dash = true;
	for (let i = 0; i < 30; i++) step();
	expect(dash.charges).toBe(0);
	const x = Position.x[hero] ?? 0;
	input.dash = false;
	input.moveX = 0;
	for (let i = 0; i < 60 * 3 - 30 - 2; i++) step();
	expect(dash.charges).toBe(0);
	for (let i = 0; i < 4; i++) step();
	expect(dash.charges).toBe(1);
	input.dash = true;
	step();
	expect(Position.x[hero]).toBeGreaterThan(x);
});

test("two charges allow two dashes in a row and the cooldown reduction shortens the recharge", () => {
	const { input, step, dash } = setup({ unlocked: true, charges: 2, cooldownReductionSeconds: 1 });
	input.moveX = 1;
	for (const _ of [0, 1]) {
		input.dash = true;
		step();
		input.dash = false;
		for (let i = 0; i < 12; i++) step();
	}
	expect(dash.charges).toBe(0);
	for (let i = 0; i < 60 * 2 + 2; i++) step();
	expect(dash.charges).toBe(1);
});

test("standing still, the dash goes where the hero faces", () => {
	const { hero, input, step } = setup();
	input.dash = true;
	step();
	input.dash = false;
	for (let i = 0; i < 12; i++) step();
	expect(Math.hypot(Position.x[hero] ?? 0, Position.z[hero] ?? 0)).toBeCloseTo(heroData.dash.distance, 1);
});

test("stacked cooldown reductions stop at the 0.5 s floor", () => {
	const { input, step, dash } = setup({ unlocked: true, charges: 1, cooldownReductionSeconds: 10 });
	input.moveX = 1;
	input.dash = true;
	step();
	input.dash = false;
	expect(dash.charges).toBe(0);
	for (let i = 0; i < 29; i++) step();
	expect(dash.charges).toBe(0);
	step();
	expect(dash.charges).toBe(1);
});
