import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
	Boss,
	bossesData,
	Consumable,
	createEnemyShotPool,
	createEventBuffer,
	createGameWorld,
	createProjectilePool,
	dropFragment,
	Egg,
	Elite,
	EventType,
	Position,
	Radius,
	renderData,
	spawnBody,
} from "@gc/game";
import { addComponent, removeEntity } from "bitecs";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import { createConsumableRenderer } from "./consumables";
import { createEggRenderer } from "./eggs";
import { createEliteView } from "./elite";
import { createEliteAuras } from "./eliteAura";
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
		view.onEvent(EventType.ChestOpened, -11, 7, 0);
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
	it("draws the charge as a line and the shovel as an arc by the pattern the event names, then clears them", () => {
		const { game, vfx, world, dispose } = setup();
		const boss = spawnBody(world, 0, 10);
		Boss.id[boss] = 1;
		const second = spawnBody(world, 0, 10);
		Boss.id[second] = 1;
		vfx.onEvent(EventType.BossPattern, 0, 0, 0, boss);
		vfx.onEvent(EventType.BossTelegraph, 0, -1, 1, boss);
		vfx.onEvent(EventType.BossPattern, 1, 0, 0, second);
		vfx.onEvent(EventType.BossTelegraph, 0, -1, 0.6, second);
		vfx.update(0.1);
		expect(vfx.telegraph.live).toBe(2);
		expect((game.scene.getMeshByName("vfx_telegraph_line") as Mesh | null)?.thinInstanceCount).toBe(1);
		expect((game.scene.getMeshByName("vfx_telegraph_arc") as Mesh | null)?.thinInstanceCount).toBe(1);
		vfx.update(2);
		expect(vfx.telegraph.live).toBe(0);
		Boss.id[boss] = 0;
		Boss.id[second] = 0;
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
	it("pulses on a PlayerHit and decays; warns at low HP; shakes the camera and settles", () => {
		let health = 1;
		const { game, vfx, world, dispose } = setup({ heroHealth: () => health });
		const hero = spawnBody(world, 0, 0);
		expect(vfx.vignette).toBe(0);
		vfx.onEvent(EventType.PlayerHit, 10, 0, 0, hero);
		expect(vfx.vignette).toBeCloseTo(config.vignetteHit, 5);
		expect(vfx.shaking).toBe(true);
		vfx.update(0.05);
		expect(game.camera.targetScreenOffset.x !== 0 || game.camera.targetScreenOffset.y !== 0).toBe(true);
		vfx.update(0);
		expect(Math.abs(game.camera.targetScreenOffset.x)).toBe(0);
		for (let i = 0; i < 60; i++) vfx.update(1 / 60);
		expect(vfx.vignette).toBe(0);
		expect(vfx.shaking).toBe(false);
		health = 0.1;
		expect(vfx.vignette).toBeGreaterThan(0);
		dispose();
	});

	it("ignores the leech drain (c = 1) and reduced motion; the low-HP vignette stays", () => {
		const { vfx, world, dispose } = setup({ heroHealth: () => 0.1, reducedMotion: () => false });
		const hero = spawnBody(world, 0, 0);
		const low = vfx.vignette;
		vfx.onEvent(EventType.PlayerHit, 2, 0, 1, hero);
		expect(vfx.vignette).toBe(low);
		expect(vfx.shaking).toBe(false);
		dispose();
		const calm = setup({ heroHealth: () => 0.1, reducedMotion: () => true });
		const other = spawnBody(calm.world, 0, 0);
		calm.vfx.onEvent(EventType.PlayerHit, 10, 0, 0, other);
		expect(calm.vfx.shaking).toBe(false);
		expect(calm.vfx.vignette).toBe(low);
		calm.dispose();
	});
});

describe("boss zones", () => {
	it("draws a mud pool for its duration and a scream ring that expands and fades", () => {
		const { game, vfx, dispose } = setup();
		vfx.onEvent(EventType.BossPool, 3, 4, 2.5, 0);
		vfx.onEvent(EventType.BossScream, 0, 0, 6, 0);
		vfx.update(0.1);
		expect(vfx.zones.poolsLive).toBe(1);
		expect(vfx.zones.ringsLive).toBe(1);
		expect((game.scene.getMeshByName("vfx_mud") as Mesh | null)?.thinInstanceCount).toBe(1);
		expect((game.scene.getMeshByName("vfx_scream") as Mesh | null)?.thinInstanceCount).toBe(1);
		vfx.update(1);
		expect(vfx.zones.ringsLive).toBe(0);
		expect(vfx.zones.poolsLive).toBe(1);
		vfx.shift(16, 0);
		vfx.update(8);
		expect(vfx.zones.poolsLive).toBe(0);
		dispose();
	});
});

describe("Matriarch and Forgemaster telegraphs", () => {
	it("warns with a disc at the pool target, a ring for the scream and a disc under the hammer", () => {
		const { vfx, world, dispose } = setup();
		const matriarch = spawnBody(world, 0, 0);
		Boss.id[matriarch] = 2;
		vfx.onEvent(EventType.BossPattern, 1, 0, 0, matriarch);
		vfx.onEvent(EventType.BossTelegraph, 8, 5, 1, matriarch);
		vfx.onEvent(EventType.BossPattern, 2, 0, 0, matriarch);
		vfx.onEvent(EventType.BossTelegraph, 0, 1, 1, matriarch);
		vfx.update(0.1);
		expect(vfx.zones.poolsLive).toBe(1);
		expect(vfx.zones.ringsLive).toBe(1);
		const forger = spawnBody(world, 0, 0);
		Boss.id[forger] = 3;
		vfx.onEvent(EventType.BossPattern, 0, 0, 0, forger);
		vfx.onEvent(EventType.BossTelegraph, 0, 1, 1.2, forger);
		vfx.update(0.1);
		expect(vfx.zones.poolsLive).toBe(2);
		Boss.id[matriarch] = 0;
		Boss.id[forger] = 0;
		dispose();
	});
});

describe("shockwave", () => {
	it("draws a ring and shakes the camera on BossShockwave", () => {
		const { vfx, dispose } = setup();
		vfx.onEvent(EventType.BossShockwave, 2, 3, 7, 0);
		vfx.update(0.05);
		expect(vfx.zones.ringsLive).toBe(1);
		expect(vfx.shaking).toBe(true);
		dispose();
	});
});

describe("breakables and consumables", () => {
	it("throws dust when a prop breaks and cubes when a consumable is picked up", () => {
		const { vfx, dispose } = setup();
		vfx.onEvent(EventType.PropBroken, 4, 5, 2, 0);
		const dust = vfx.particles.stats.live;
		expect(dust).toBeGreaterThanOrEqual(config.explosionCubes[0] ?? 0);
		vfx.onEvent(EventType.ConsumablePicked, 1, 0, 0, 0);
		expect(vfx.particles.stats.live).toBeGreaterThan(dust);
		dispose();
	});

	it("draws vials and magnets as one mesh per kind", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const view = createConsumableRenderer(game);
		for (const kind of [1, 1, 2]) {
			const e = spawnBody(world, kind, 0);
			addComponent(world, e, Consumable);
			Consumable.kind[e] = kind;
		}
		view.sync(world, 1, 0);
		expect(view.live).toBe(3);
		expect((game.scene.getMeshByName("vfx_vials") as Mesh | null)?.thinInstanceCount).toBe(2);
		expect((game.scene.getMeshByName("vfx_magnets") as Mesh | null)?.thinInstanceCount).toBe(1);
		dispose();
	});
});

describe("chain shot telegraph", () => {
	it("draws one warning line per direction of the volley", () => {
		const { game, vfx, world, dispose } = setup();
		const forger = spawnBody(world, 0, 0);
		Boss.id[forger] = 3;
		vfx.onEvent(EventType.BossPattern, 1, 0, 0, forger);
		vfx.onEvent(EventType.BossTelegraph, 0, 1, 0.8, forger);
		vfx.update(0.1);
		expect(vfx.telegraph.live).toBe(4);
		expect((game.scene.getMeshByName("vfx_telegraph_line") as Mesh | null)?.thinInstanceCount).toBe(4);
		vfx.update(1);
		expect(vfx.telegraph.live).toBe(0);
		Boss.id[forger] = 0;
		dispose();
	});
});

describe("boss executions", () => {
	it("throws large pieces in the boss palette and a flash ring, one execution per boss", () => {
		for (const id of ["gravedigger", "swamp_matriarch", "forgemaster", "alpha_hunter", "nest_queen"]) {
			const { vfx, world, dispose } = setup();
			const boss = spawnBody(world, 2, 2);
			Boss.id[boss] = bossesData.findIndex((b) => b.id === id) + 1;
			vfx.onEvent(EventType.BossDied, 2, 2, 0, boss);
			vfx.update(0.01);
			expect([id, vfx.particles.stats.live >= 16]).toEqual([id, true]);
			expect([id, vfx.zones.ringsLive]).toEqual([id, 1]);
			Boss.id[boss] = 0;
			dispose();
		}
	});
});

describe("bosses 4 and 5", () => {
	const idOf = (id: string): number => bossesData.findIndex((b) => b.id === id) + 1;

	it("warns the leap landing and the bombs on the ground, and clears them", () => {
		const { game, vfx, world, dispose } = setup();
		const hunter = spawnBody(world, 0, 0);
		Boss.id[hunter] = idOf("alpha_hunter");
		vfx.onEvent(EventType.BossPattern, 1, 0, 0, hunter);
		vfx.onEvent(EventType.BossTelegraph, 6, 2, 0.8, hunter);
		vfx.onEvent(EventType.BossBomb, 1, 1, 1.2, hunter);
		vfx.update(0.1);
		expect(vfx.zones.warnsLive).toBe(2);
		expect((game.scene.getMeshByName("vfx_warn") as Mesh | null)?.thinInstanceCount).toBe(2);
		vfx.update(2);
		expect(vfx.zones.warnsLive).toBe(0);
		Boss.id[hunter] = 0;
		dispose();
	});

	it("draws the tail sweep as the wide 200 degree fan", () => {
		const { game, vfx, world, dispose } = setup();
		const queen = spawnBody(world, 0, 0);
		Boss.id[queen] = idOf("nest_queen");
		vfx.onEvent(EventType.BossPattern, 1, 0, 0, queen);
		vfx.onEvent(EventType.BossTelegraph, 0, 1, 0.9, queen);
		vfx.update(0.1);
		expect((game.scene.getMeshByName("vfx_telegraph_wide") as Mesh | null)?.thinInstanceCount).toBe(1);
		expect((game.scene.getMeshByName("vfx_telegraph_arc") as Mesh | null)?.thinInstanceCount).toBe(0);
		Boss.id[queen] = 0;
		dispose();
	});

	it("draws eggs from the Egg component and drops them when they leave the world", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const view = createEggRenderer(game);
		const world = createGameWorld();
		const egg = spawnBody(world, 3, 4);
		addComponent(world, egg, Egg);
		Egg.hatch[egg] = 60;
		Radius.r[egg] = 0.6;
		view.sync(world, 1);
		expect(view.live).toBe(1);
		expect((game.scene.getMeshByName("vfx_eggs") as Mesh | null)?.thinInstanceCount).toBe(1);
		removeEntity(world, egg);
		view.sync(world, 1);
		expect(view.live).toBe(0);
		dispose();
	});

	it("draws a ring of pads and motes per elite, in the layer of its modifier", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const auras = createEliteAuras(game, ["steel_gray", "amber", "wine", "orange"], 1);
		const world = createGameWorld();
		for (const modifier of [1, 3]) {
			const e = spawnBody(world, modifier, 0);
			addComponent(world, e, Elite);
			Elite.modifier[e] = modifier;
		}
		auras.sync(world, 1, 0.5);
		expect([0, 1, 2, 3].map((i) => auras.drawn(i))).toEqual([16, 0, 16, 0]);
		dispose();
	});
});
