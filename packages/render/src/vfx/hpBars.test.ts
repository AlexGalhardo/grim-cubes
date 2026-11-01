import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Boss, createGameWorld, EnemyFaction, Health, PlayerFaction, spawnBody } from "@gc/game";
import { addComponent } from "bitecs";
import { expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createHpBars } from "./hpBars";

function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	Health.hp[hero] = 50;
	Health.max[hero] = 100;
	const enemy = (hp: number, max: number): number => {
		const e = spawnBody(world, 3, 3);
		addComponent(world, e, EnemyFaction);
		Health.hp[e] = hp;
		Health.max[e] = max;
		return e;
	};
	return { game, world, enemy, bars: createHpBars(game), dispose };
}

const count = (game: ReturnType<typeof setup>["game"], name: string): number =>
	(game.scene.getMeshByName(name) as Mesh | null)?.thinInstanceCount ?? -1;

it("draws the hero's bar always and an enemy's only once it is hurt, never a boss's or a dead one's", () => {
	const { game, world, enemy, bars, dispose } = setup();
	enemy(10, 10);
	enemy(4, 10);
	enemy(0, 10);
	const boss = enemy(5, 10);
	Boss.id[boss] = 1;
	bars.sync(world, 1);
	expect(bars.live).toBe(2);
	expect([count(game, "hp_plates"), count(game, "hp_fills")]).toEqual([2, 2]);
	dispose();
});

it("setHpBars switches the hero's and the enemies' bars independently", () => {
	const { world, enemy, bars, dispose } = setup();
	enemy(4, 10);
	bars.setHpBars({ hero: false, enemies: true });
	bars.sync(world, 1);
	expect(bars.live).toBe(1);
	bars.setHpBars({ hero: true, enemies: false });
	bars.sync(world, 1);
	expect(bars.live).toBe(1);
	bars.setHpBars({ hero: false, enemies: false });
	bars.sync(world, 1);
	expect(bars.live).toBe(0);
	dispose();
});

it("fills the bar by the health ratio, anchored on its left edge", () => {
	const { game, world, bars, dispose } = setup();
	bars.sync(world, 1);
	const read = (name: string): Float32Array =>
		(
			game.scene.getMeshByName(name) as unknown as {
				_thinInstanceDataStorage: { matrixData: Float32Array };
			}
		)._thinInstanceDataStorage.matrixData;
	const plate = read("hp_plates");
	const fill = read("hp_fills");
	expect((fill[0] ?? 0) / (plate[0] ?? 1)).toBeCloseTo(0.5, 5);
	expect(fill[12] ?? 0).toBeLessThan(plate[12] ?? 0);
	dispose();
});
