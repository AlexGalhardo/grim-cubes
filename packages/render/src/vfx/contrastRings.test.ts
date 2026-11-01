import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Boss, createGameWorld, EnemyFaction, Health, PlayerFaction, spawnBody } from "@gc/game";
import { addComponent } from "bitecs";
import { expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createContrastRings } from "./contrastRings";

function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	Health.hp[hero] = 10;
	const enemy = (hp: number): number => {
		const e = spawnBody(world, 2, 2);
		addComponent(world, e, EnemyFaction);
		Health.hp[e] = hp;
		return e;
	};
	return { game, world, enemy, rings: createContrastRings(game), dispose };
}

it("draws one ring under the hero and one under each live enemy in a single instanced mesh", () => {
	const { game, world, enemy, rings, dispose } = setup();
	enemy(5);
	enemy(5);
	enemy(0);
	const boss = enemy(9);
	Boss.id[boss] = 1;
	rings.sync(world, 1);
	expect(rings.live).toBe(4);
	expect((game.scene.getMeshByName("vfx_contrast_rings") as Mesh | null)?.thinInstanceCount).toBe(4);
	dispose();
});

it("can be switched off", () => {
	const { world, enemy, rings, dispose } = setup();
	enemy(5);
	rings.setEnabled(false);
	rings.sync(world, 1);
	expect(rings.live).toBe(0);
	dispose();
});
