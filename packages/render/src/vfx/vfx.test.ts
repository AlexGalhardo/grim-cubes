import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
	Boss,
	createEnemyShotPool,
	createEventBuffer,
	createGameWorld,
	createProjectilePool,
	dropFragment,
	EventType,
	Position,
	renderData,
	spawnBody,
} from "@gc/game";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createEliteView } from "./elite";
import { createFragmentRenderer } from "./fragments";
import { createHitStop } from "./hitStop";
import { createEnemyShotRenderer, createProjectileRenderer } from "./projectiles";
import { createVfx } from "./vfx";

const config = renderData.vfx;

function setup(options: Parameters<typeof createVfx>[1] = {}) {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const vfx = createVfx(game, options);
	const world = createGameWorld();
	return { game, vfx, world, dispose };
}

describe("vfx events", () => {
	it("a hit throws 3-6 blood cubes and shows a damage number", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 2, 3);
		vfx.onEvent(EventType.Damaged, 125, 0, 0, e);
		expect(vfx.particles.stats.live).toBeGreaterThanOrEqual(config.bloodCubesPerHit[0] ?? 0);
		expect(vfx.particles.stats.live).toBeLessThanOrEqual(config.bloodCubesPerHit[1] ?? 0);
		expect(vfx.numbers.live).toBe(1);
		dispose();
	});

	it("a death throws 8-14 cubes and leaves a decal; a purged one does nothing", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 2, 3);
		vfx.onEvent(EventType.Died, 0, 1, 0, e);
		expect(vfx.particles.stats.live).toBe(0);
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		expect(vfx.particles.stats.live).toBeGreaterThanOrEqual(config.bloodCubesPerDeath[0] ?? 0);
		expect(vfx.particles.stats.live).toBeLessThanOrEqual(config.bloodCubesPerDeath[1] ?? 0);
		expect(vfx.decals.live).toBe(1);
		dispose();
	});

	it("an explosion throws 6-10 ember cubes", () => {
		const { vfx, dispose } = setup();
		vfx.onEvent(EventType.Exploded, 1, 1, 2, 0);
		expect(vfx.particles.stats.live).toBeGreaterThanOrEqual(config.explosionCubes[0] ?? 0);
		expect(vfx.particles.stats.live).toBeLessThanOrEqual(config.explosionCubes[1] ?? 0);
		dispose();
	});

	it("asks for a 30 ms hit-stop on a critical hit and 80 ms when a boss dies", () => {
		const stops: number[] = [];
		const { vfx, world, dispose } = setup({
			onHitStop: (ms) => stops.push(ms),
			isBoss: (entity) => (Boss.id[entity] ?? 0) > 0,
		});
		const e = spawnBody(world, 0, 0);
		vfx.onEvent(EventType.Damaged, 10, 0, 0, e);
		expect(stops).toEqual([]);
		vfx.onEvent(EventType.Damaged, 20, 1, 0, e);
		Boss.id[e] = 1;
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		Boss.id[e] = 0;
		expect(stops).toEqual([config.hitStopCritMs, config.hitStopBossDeathMs]);
		dispose();
	});
});

describe("pools", () => {
	it("never exceed their capacity: the particle pool drops, the decal pool recycles FIFO", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		for (let i = 0; i < 400; i++) {
			Position.x[e] = i * 0.1;
			vfx.onEvent(EventType.Died, 0, 0, 0, e);
			if (i % 10 === 0) vfx.update(1 / 60);
		}
		expect(vfx.particles.stats.peak).toBeLessThanOrEqual(config.particlePool);
		expect(vfx.particles.stats.live).toBeLessThanOrEqual(config.particlePool);
		expect(vfx.particles.stats.dropped).toBeGreaterThan(0);
		expect(vfx.decals.live).toBe(config.decalPool);
		expect(vfx.decals.recycled).toBeGreaterThanOrEqual(400 - config.decalPool);
		dispose();
	});

	it("particles fall, land and expire after their life", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		for (let i = 0; i < Math.ceil(config.particleLifeSeconds * 60) + 5; i++) vfx.update(1 / 60);
		expect(vfx.particles.stats.live).toBe(0);
		dispose();
	});

	it("reduced gore: no decals, no blood, grey cubes on death, and existing decals are cleared", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		expect(vfx.decals.live).toBe(1);
		vfx.setGore(false);
		expect(vfx.decals.live).toBe(0);
		expect(vfx.gore).toBe(false);
		for (let i = 0; i < 100; i++) vfx.update(1 / 60);
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		expect(vfx.particles.stats.live).toBe(config.reducedDeathCubes);
		for (let i = 0; i < 100; i++) vfx.update(1 / 60);
		expect(vfx.decals.live).toBe(0);
		dispose();
	});

	it("shifts everything with the origin", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 20, 0);
		vfx.onEvent(EventType.Died, 0, 0, 0, e);
		vfx.shift(16, 0);
		vfx.update(1 / 60);
		expect(vfx.decals.live).toBe(1);
		dispose();
	});
});

describe("damage numbers", () => {
	it("draw one digit instance per digit, spread over the ten digit meshes", () => {
		const { game, vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		vfx.onEvent(EventType.Damaged, 1205, 0, 0, e);
		vfx.update(0.1);
		const counts = ["1", "2", "0", "5"].map(
			(d) => (game.scene.getMeshByName(`vfx_digit_${d}`) as Mesh | null)?.thinInstanceCount,
		);
		expect(counts).toEqual([1, 1, 1, 1]);
		for (let i = 0; i < 60; i++) vfx.update(0.1);
		expect(vfx.numbers.live).toBe(0);
		dispose();
	});
});

describe("projectile renderer", () => {
	it("instances only the live slots of the projectile pool", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const pool = createProjectilePool(world, createEventBuffer(), 8);
		const view = createProjectileRenderer(game, 8, config.projectileSize);
		view.sync(world, 1);
		expect(view.live).toBe(0);
		const spec = {
			x: 1,
			z: 2,
			vx: 0,
			vz: 10,
			damage: 5,
			critChance: 0,
			knockback: 0,
			pierce: 0,
			lifeSteps: 60,
			radius: 0.1,
			explosionRadius: 0,
			selfFraction: 0,
		};
		for (let i = 0; i < 3; i++) pool.acquire(spec);
		view.sync(world, 0.5);
		expect(view.live).toBe(3);
		expect((game.scene.getMeshByName("vfx_projectiles") as Mesh | null)?.thinInstanceCount).toBe(3);
		dispose();
	});
});

describe("hit-stop", () => {
	it("pauses once, extends instead of stacking, and resumes when the time is up", () => {
		let now = 0;
		const calls: string[] = [];
		const stop = createHitStop({
			pause: () => calls.push("pause"),
			resume: () => calls.push("resume"),
			now: () => now,
		});
		stop.request(30);
		now = 10;
		stop.request(30);
		expect(calls).toEqual(["pause"]);
		now = 39;
		stop.update();
		expect(stop.active).toBe(true);
		now = 41;
		stop.update();
		expect(calls).toEqual(["pause", "resume"]);
		expect(stop.active).toBe(false);
	});
});

describe("allocation", () => {
	it("update allocates no arrays or strings with particles and numbers alive", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		const burst = (): void => {
			vfx.onEvent(EventType.Damaged, 987, 1, 0, e);
			vfx.onEvent(EventType.Died, 0, 0, 0, e);
		};
		for (let i = 0; i < 20; i++) {
			burst();
			vfx.update(1 / 60);
		}
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
			for (let i = 0; i < 300; i++) {
				if (i % 10 === 0) burst();
				vfx.update(1 / 60);
			}
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
		dispose();
	});
});

describe("fragment renderer", () => {
	it("draws every pile in one instanced mesh and allocates nothing per sync", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const view = createFragmentRenderer(game, 64);
		for (let i = 0; i < 50; i++) dropFragment(world, i, 2, 5 + i);
		view.sync(world, 1, 0);
		expect(view.live).toBe(50);
		const mesh = game.scene.getMeshByName("vfx_fragments") as Mesh | null;
		expect(mesh?.thinInstanceCount).toBe(50);
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
			for (let i = 0; i < 300; i++) view.sync(world, 0.5, i / 60);
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
		expect(mesh?.thinInstanceCount).toBe(50);
		dispose();
	});

	it("renders 200 projectiles and 50 piles as one draw-call mesh each", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const pool = createProjectilePool(world, createEventBuffer(), 256);
		const shots = createProjectileRenderer(game, 256, config.projectileSize);
		const piles = createFragmentRenderer(game, 64);
		const spec = {
			x: 0,
			z: 0,
			vx: 1,
			vz: 0,
			damage: 1,
			critChance: 0,
			knockback: 0,
			pierce: 0,
			lifeSteps: 60,
			radius: 0.1,
			explosionRadius: 0,
			selfFraction: 0,
		};
		for (let i = 0; i < 200; i++) pool.acquire(spec);
		for (let i = 0; i < 50; i++) dropFragment(world, i, 0, 3);
		shots.sync(world, 1);
		piles.sync(world, 1, 0);
		expect(shots.live).toBe(200);
		expect(piles.live).toBe(50);
		expect(game.scene.getMeshByName("vfx_projectiles")?.subMeshes.length).toBe(1);
		expect(game.scene.getMeshByName("vfx_fragments")?.subMeshes.length).toBe(1);
		dispose();
	});
});

describe("elite view", () => {
	it("places a chest at the ChestDropped point, removes it when opened and shifts with the origin", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const view = createEliteView(game);
		view.onEvent(EventType.ChestDropped, 5, 7, 0);
		view.update(0.016, 0, 0);
		const mesh = game.scene.getMeshByName("vfx_chests") as Mesh | null;
		expect(view.chests).toBe(1);
		expect(mesh?.thinInstanceCount).toBe(1);
		expect(view.chestAt(0)).toEqual({ x: 5, z: 7 });
		view.shift(16, 0);
		view.update(0.016, -11, 7);
		expect(view.chestAt(0)?.x).toBeCloseTo(-11, 5);
		view.onEvent(EventType.ChestOpened, 0, 0, 0);
		view.update(0.016, -11, 7);
		expect(view.chests).toBe(0);
		dispose();
	});

	it("shows the edge marker for an elite out of frame until it spawns", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const view = createEliteView(game);
		view.onEvent(EventType.EliteIncoming, 40, 0, 0);
		let shown = 0;
		for (let i = 0; i < 60; i++) {
			view.update(1 / 60, 0, 0);
			shown += (game.scene.getMeshByName("vfx_elite_marker") as Mesh | null)?.thinInstanceCount ?? 0;
		}
		expect(shown).toBeGreaterThan(0);
		// Clamped to the edge ring along +x, not drawn at the 40 u arrival point.
		expect(view.markerDrawnX).toBeLessThan(15);
		expect(view.markerDrawnX).toBeGreaterThan(5);
		view.onEvent(EventType.EliteSpawned, 40, 0, 1);
		view.update(1 / 60, 0, 0);
		expect(view.markerVisible).toBe(false);
		expect((game.scene.getMeshByName("vfx_elite_marker") as Mesh | null)?.thinInstanceCount).toBe(0);
		dispose();
	});
});

describe("hit allocation", () => {
	it("100 Damaged events allocate no arrays", () => {
		const { vfx, world, dispose } = setup();
		const e = spawnBody(world, 0, 0);
		for (let i = 0; i < 20; i++) vfx.onEvent(EventType.Damaged, 50, 0, 0, e);
		vfx.update(1);
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
			for (let i = 0; i < 100; i++) vfx.onEvent(EventType.Damaged, 50, i % 2, 0, e);
		} finally {
			for (const [name, original] of originals) proto[name] = original;
		}
		expect(calls).toBe(0);
		dispose();
	});
});

describe("boss and enemy telegraphs", () => {
	it("draws the charge as a line from afar and the shovel as an arc next to the hero, then clears them", () => {
		const { game, vfx, world, dispose } = setup();
		const boss = spawnBody(world, 0, 10);
		game.hero.position.set(0, 0, 0);
		vfx.onEvent(EventType.BossTelegraph, 0, -1, 1, boss);
		game.hero.position.set(0, 0, 8);
		const second = spawnBody(world, 0, 10);
		vfx.onEvent(EventType.BossTelegraph, 0, -1, 0.6, second);
		vfx.update(0.1);
		expect((game.scene.getMeshByName("vfx_telegraph_line") as Mesh | null)?.thinInstanceCount).toBe(1);
		expect((game.scene.getMeshByName("vfx_telegraph_arc") as Mesh | null)?.thinInstanceCount).toBe(1);
		vfx.update(2);
		expect(vfx.telegraph.live).toBe(0);
		expect((game.scene.getMeshByName("vfx_telegraph_line") as Mesh | null)?.thinInstanceCount).toBe(0);
		dispose();
	});

	it("starts a hunter wind-up line and a 1.5 s boss execution of cubes", () => {
		const { vfx, world, dispose } = setup();
		const hunter = spawnBody(world, 1, 1);
		vfx.onEvent(EventType.EnemyTelegraph, 1, 0, 0.5, hunter);
		expect(vfx.telegraph.live).toBe(0);
		vfx.update(0.01);
		expect(vfx.telegraph.live).toBe(1);
		vfx.onEvent(EventType.BossDied, 4, 4, 0, hunter);
		for (let i = 0; i < 100; i++) vfx.update(1 / 60);
		expect(vfx.particles.stats.peak).toBeGreaterThan(20);
		dispose();
	});
});

describe("enemy shot renderer", () => {
	it("instances only the shots with life above zero", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const pool = createEnemyShotPool(world, 16);
		const view = createEnemyShotRenderer(game, 16, 0.25);
		view.sync(world, 1);
		expect(view.live).toBe(0);
		for (let i = 0; i < 5; i++) pool.acquire(i, 0, 1, 0, 3, 60, 0.2);
		view.sync(world, 0.5);
		expect(view.live).toBe(5);
		expect((game.scene.getMeshByName("vfx_enemy_shots") as Mesh | null)?.thinInstanceCount).toBe(5);
		dispose();
	});
});

describe("vignette and shake", () => {
	it("pulses on a hero hit and decays; warns at low HP; shakes the camera and settles", () => {
		let health = 1;
		const { game, vfx, world, dispose } = setup({ isHero: () => true, heroHealth: () => health });
		const hero = spawnBody(world, 0, 0);
		expect(vfx.vignette).toBe(0);
		vfx.onEvent(EventType.Damaged, 10, 0, 0, hero);
		expect(vfx.vignette).toBeCloseTo(config.vignetteHit, 5);
		expect(vfx.shaking).toBe(true);
		vfx.update(0.05);
		expect(game.camera.targetScreenOffset.x !== 0 || game.camera.targetScreenOffset.y !== 0).toBe(true);
		for (let i = 0; i < 60; i++) vfx.update(1 / 60);
		expect(vfx.vignette).toBe(0);
		expect(vfx.shaking).toBe(false);
		expect(Math.abs(game.camera.targetScreenOffset.x)).toBe(0);
		health = 0.1;
		expect(vfx.vignette).toBeGreaterThan(0);
		dispose();
	});
});
