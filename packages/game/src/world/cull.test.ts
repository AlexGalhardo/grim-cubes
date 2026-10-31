import { addComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import { Boss, Elite, EnemyFaction } from "../ecs/components";
import { createGameWorld, spawnBody } from "../ecs/world";
import { cullDistantEnemies } from "./cull";
import { queryEnemies } from "./queries";

function enemy(world: ReturnType<typeof createGameWorld>, x: number, z: number): number {
	const e = spawnBody(world, x, z);
	addComponent(world, e, EnemyFaction);
	return e;
}

describe("cullDistantEnemies", () => {
	it("removes an enemy 45 u away on the next step and keeps the ones inside 40 u", () => {
		const world = createGameWorld();
		enemy(world, 45, 0);
		enemy(world, 39, 0);
		enemy(world, 0, -40);
		expect(cullDistantEnemies(world, 0, 0, 40)).toBe(1);
		expect(queryEnemies(world).length).toBe(2);
	});

	it("never removes elites or bosses", () => {
		const world = createGameWorld();
		const elite = enemy(world, 90, 0);
		addComponent(world, elite, Elite);
		Elite.modifier[elite] = 1;
		const boss = enemy(world, 0, 90);
		addComponent(world, boss, Boss);
		Boss.id[boss] = 1;
		enemy(world, -90, 0);
		expect(cullDistantEnemies(world, 0, 0, 40)).toBe(1);
		expect(queryEnemies(world).length).toBe(2);
	});

	it("handles many removals in one pass", () => {
		const world = createGameWorld();
		for (let i = 0; i < 100; i++) enemy(world, i % 2 === 0 ? 50 : 5, 0);
		expect(cullDistantEnemies(world, 0, 0, 40)).toBe(50);
		expect(queryEnemies(world).length).toBe(50);
	});
});
