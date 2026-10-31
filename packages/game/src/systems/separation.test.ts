import { addComponent } from "bitecs";
import { expect, test } from "vitest";
import { Boss, EnemyFaction, Position, Radius, Velocity } from "../ecs/components";
import { createGameWorld, spawnBody } from "../ecs/world";
import { createSeparationSystem } from "./separation";

function enemy(world: ReturnType<typeof createGameWorld>, x: number, z: number, vx = 1): number {
	const e = spawnBody(world, x, z);
	addComponent(world, e, EnemyFaction);
	addComponent(world, e, Radius);
	addComponent(world, e, Velocity);
	Radius.r[e] = 0.5;
	Velocity.x[e] = vx;
	Velocity.z[e] = 0;
	return e;
}

const config = { weight: 0.6, maxRadius: 1 };

test("overlapping enemies are pushed apart, distant ones are untouched", () => {
	const world = createGameWorld();
	const a = enemy(world, 0, 0);
	const b = enemy(world, 0.5, 0);
	const far = enemy(world, 10, 10);
	createSeparationSystem(config).run(world);
	expect(Velocity.x[a]).toBeLessThan(1);
	expect(Velocity.x[b]).toBeGreaterThan(1);
	expect(Velocity.x[far]).toBe(1);
});

test("bosses are not pushed and stacked enemies still separate", () => {
	const world = createGameWorld();
	const boss = enemy(world, 0, 0);
	addComponent(world, boss, Boss);
	const m = enemy(world, 0, 0);
	createSeparationSystem(config).run(world);
	expect(Velocity.x[boss]).toBe(1);
	expect(Velocity.x[m]).not.toBe(1);
	expect(Position.x[m]).toBe(0);
});
