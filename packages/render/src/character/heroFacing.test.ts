import { createGameWorld, Health, PlayerFaction, spawnBody, Velocity } from "@gc/game";
import { addComponent } from "bitecs";
import { expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import type { Character } from "./character";
import { createCharacters } from "./characters";

it("turns the hero to its target while walking away, then follows the movement once it is gone", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const world = createGameWorld();
	const heroEntity = spawnBody(world, 0, 0);
	addComponent(world, heroEntity, PlayerFaction);
	addComponent(world, heroEntity, Velocity);
	Velocity.x[heroEntity] = -4;
	const enemy = spawnBody(world, 6, 0);
	Health.hp[enemy] = 10;
	const setPose = vi.fn();
	const rig = {
		setPose,
		setSpeed: vi.fn(),
		setVisible: vi.fn(),
		update: vi.fn(),
	} as unknown as Character;
	let target = enemy;
	const characters = createCharacters(game, {
		hero: rig,
		bosses: [],
		executionZoom: 0.2,
		executionSeconds: 1.5,
		heroTarget: () => target,
	});
	const yaw = (): number => (setPose.mock.lastCall?.[2] as number | undefined) ?? Number.NaN;
	const run = (steps: number): void => {
		for (let i = 0; i < steps; i++) characters.sync(world, 1, 1 / 60, false);
	};
	run(60);
	expect(yaw()).toBeCloseTo(Math.PI / 2, 1);
	expect(characters.heroYaw).toBeCloseTo(yaw(), 5);
	Health.hp[enemy] = 0;
	run(60);
	expect(yaw()).toBeCloseTo(-Math.PI / 2, 1);
	target = -1;
	Velocity.x[heroEntity] = 0;
	run(10);
	expect(yaw()).toBeCloseTo(-Math.PI / 2, 1);
	dispose();
});
