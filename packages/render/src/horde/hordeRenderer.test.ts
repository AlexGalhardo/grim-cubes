import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
	Attacking,
	Boss,
	createEventBuffer,
	createGameWorld,
	Elite,
	EnemyFaction,
	EnemyType,
	EventType,
	Facing,
	HitFlash,
	PlayerFaction,
	Position,
	PrevPosition,
	spawnBody,
	Velocity,
} from "@gc/game";
import { addComponent, removeComponent } from "bitecs";
import { describe, expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createRenderPort } from "../port";
import { createGameScene } from "../scene/scene";
import { createVat, type VatMeta } from "../vat/loader";
import { createHordeRenderer } from "./hordeRenderer";

const meta: VatMeta = {
	format: "rgba32f",
	fps: 12,
	boneCount: 1,
	width: 8,
	height: 20,
	clips: {
		idle: { from: 0, to: 1 },
		walk: { from: 2, to: 7 },
		attack: { from: 8, to: 10 },
		hit: { from: 11, to: 12 },
		death: { from: 13, to: 19 },
	},
};

function skinnedBox(name: string, scene: Parameters<typeof CreateBox>[2]): Mesh {
	const mesh = CreateBox(name, { size: 1 }, scene);
	const count = mesh.getTotalVertices();
	mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, new Float32Array(count * 4));
	const weights = new Float32Array(count * 4);
	for (let i = 0; i < count; i++) weights[i * 4] = 1;
	mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, weights);
	return mesh;
}

function setup(typeCount = 2, capacity = 120) {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const types = Array.from({ length: typeCount }, (_, t) => ({
		mesh: skinnedBox(`enemy${t}`, game.scene),
		vat: createVat(game.scene, `enemy${t}`, new Float32Array(meta.width * meta.height * 4).buffer, meta),
		walkRefSpeed: 3,
	}));
	const horde = createHordeRenderer(types, {
		capacity,
		ghostCapacity: 8,
		deltaSeconds: () => 1 / 60,
	});
	const world = createGameWorld();
	return { game, types, horde, world, dispose };
}

function spawnEnemy(world: ReturnType<typeof createGameWorld>, x: number, z: number, type = 0): number {
	const eid = spawnBody(world, x, z);
	addComponent(world, eid, EnemyFaction);
	EnemyType.id[eid] = type;
	return eid;
}

describe("horde renderer", () => {
	it("draws 100 instances as one draw call per type", () => {
		const { game, types, horde, world, dispose } = setup();
		for (let i = 0; i < 100; i++) spawnEnemy(world, i, -i, i % 2);
		horde.sync(world, 1);
		game.scene.render();
		for (const { mesh } of types) {
			expect(mesh.thinInstanceCount).toBe(50);
			expect(mesh.subMeshes.length).toBe(1);
			expect(game.scene.getActiveMeshes().data.includes(mesh)).toBe(true);
			expect(mesh.bakedVertexAnimationManager).not.toBeNull();
		}
		dispose();
	});

	it("updates each instance buffer exactly once per frame", () => {
		const { types, horde, world, dispose } = setup();
		for (let i = 0; i < 10; i++) spawnEnemy(world, i, 0);
		const spies = types.map(({ mesh }) => vi.spyOn(mesh, "thinInstanceBufferUpdated"));
		horde.sync(world, 0.5);
		for (const spy of spies) {
			expect(spy.mock.calls.map((c) => c[0])).toEqual([
				"matrix",
				"bakedVertexAnimationSettingsInstanced",
			]);
		}
		dispose();
	});

	it("interpolates Prev to Pos in loader-local coordinates", () => {
		const { types, horde, world, dispose } = setup(1);
		const eid = spawnEnemy(world, 0, 0);
		PrevPosition.x[eid] = 2;
		Position.x[eid] = 4;
		horde.sync(world, 0.5);
		// The glTF loader mirrors X under its __root__, so the instance stores -x (see coords.ts).
		expect(types[0]?.mesh.thinInstanceGetWorldMatrices()[0]?.m[12]).toBeCloseTo(-3, 6);
		dispose();
	});

	describe("clips", () => {
		const settings = (mesh: Mesh | undefined): number[] => {
			const storage = mesh?._userThinInstanceBuffersStorage?.data.bakedVertexAnimationSettingsInstanced;
			return Array.from((storage as Float32Array).subarray(0, 4));
		};

		it("plays walk by default, scaling speed with |velocity| / walkRefSpeed", () => {
			const { types, horde, world, dispose } = setup(1);
			const eid = spawnEnemy(world, 0, 0);
			Velocity.x[eid] = 0;
			Velocity.z[eid] = 3;
			horde.sync(world, 1);
			const [from, to, , speed] = settings(types[0]?.mesh);
			expect([from, to, speed]).toEqual([2, 7, 12]);
			Velocity.z[eid] = 1.5;
			horde.sync(world, 1);
			expect(settings(types[0]?.mesh)[3]).toBe(6);
			Velocity.z[eid] = 0;
			dispose();
		});

		it("runs the hit clip on its own timer even if HitFlash lasts a single step", () => {
			const { types, horde, world, dispose } = setup(1);
			const eid = spawnEnemy(world, 0, 0);
			horde.sync(world, 1);
			HitFlash.ticks[eid] = 2;
			horde.sync(world, 1);
			HitFlash.ticks[eid] = 0;
			const seen = new Set<number>();
			for (let i = 0; i < 20; i++) {
				const s = settings(types[0]?.mesh);
				if (s[0] === 11) seen.add(Math.floor(s[2] ?? 0));
				horde.sync(world, 1);
			}
			// Frame 0 then frame 1 of the 2-frame hit clip (83 ms each), then back to walk.
			expect([...seen]).toEqual([0, 1]);
			expect(settings(types[0]?.mesh)[0]).toBe(2);
			dispose();
		});

		it("plays the attack clip once, whole, then holds its last frame while Attacking lasts", () => {
			const { types, horde, world, dispose } = setup(1);
			const eid = spawnEnemy(world, 0, 0);
			Attacking.ticks[eid] = 30;
			const frames: number[] = [];
			for (let i = 0; i < 30; i++) {
				horde.sync(world, 1);
				const s = settings(types[0]?.mesh);
				expect([s[0], s[1], s[3]]).toEqual([8, 10, 0]);
				frames.push(Math.floor(s[2] ?? 0));
			}
			expect([...new Set(frames)]).toEqual([0, 1, 2]);
			expect(frames).toEqual([...frames].sort((a, b) => a - b));
			Attacking.ticks[eid] = 0;
			dispose();
		});

		it("gives hit priority over attack, and attack over walk", () => {
			const { types, horde, world, dispose } = setup(1);
			const eid = spawnEnemy(world, 0, 0);
			Attacking.ticks[eid] = 4;
			horde.sync(world, 1);
			expect(settings(types[0]?.mesh)[0]).toBe(8);
			HitFlash.ticks[eid] = 2;
			horde.sync(world, 1);
			expect(settings(types[0]?.mesh)[0]).toBe(11);
			HitFlash.ticks[eid] = 0;
			Attacking.ticks[eid] = 0;
			dispose();
		});
	});

	it("rotates each instance about Y by Facing.yaw", () => {
		const { types, horde, world, dispose } = setup(1);
		const eid = spawnEnemy(world, 1, 2);
		Facing.yaw[eid] = Math.PI / 2;
		horde.sync(world, 1);
		const m = types[0]?.mesh.thinInstanceGetWorldMatrices()[0]?.m;
		// Loader-local: yaw and x are conjugated by the root mirror, so +90 degrees is stored as -90.
		expect(m?.[8]).toBeCloseTo(-1, 6);
		expect(m?.[10]).toBeCloseTo(0, 6);
		expect(m?.[0]).toBeCloseTo(0, 6);
		expect(m?.[2]).toBeCloseTo(1, 6);
		expect([m?.[12], m?.[14]]).toEqual([-1, 2]);
		Facing.yaw[eid] = 0;
		dispose();
	});

	it("keeps a ghost playing death after Died, shifts it with the origin, then releases it", () => {
		const { game, types, horde, world, dispose } = setup(1);
		const events = createEventBuffer();
		const port = createRenderPort(game, horde);
		const eid = spawnEnemy(world, 5, 6);
		port.sync(world, 1);
		expect(types[0]?.mesh.thinInstanceCount).toBe(1);

		events.push(EventType.Died, 0, 0, 0, eid);
		events.push(EventType.OriginShifted, 16, 0, 0, 0);
		port.consumeEvents(events);
		removeComponent(world, eid, EnemyFaction);
		port.sync(world, 1);
		const mesh = types[0]?.mesh;
		expect(mesh?.thinInstanceCount).toBe(1);
		expect(horde.stats.ghosts).toBe(1);
		expect(mesh?.thinInstanceGetWorldMatrices()[0]?.m[12]).toBeCloseTo(-(5 - 16), 6);
		const settings = mesh?._userThinInstanceBuffersStorage?.data
			.bakedVertexAnimationSettingsInstanced as Float32Array;
		expect([settings[0], settings[1], settings[3]]).toEqual([13, 19, 0]);

		// Held on explicit frames (speed 0): never wraps back to the first frame while it lives.
		let last = -1;
		for (let i = 0; i < 40 && (mesh?.thinInstanceCount ?? 0) > 0; i++) {
			const frame = Math.floor(settings[2] ?? 0);
			expect(frame).toBeGreaterThanOrEqual(last);
			last = frame;
			port.sync(world, 1);
		}
		expect(last).toBe(6);
		for (let i = 0; i < 40; i++) port.sync(world, 1);
		expect(mesh?.thinInstanceCount).toBe(0);
		expect(horde.stats.ghosts).toBe(0);
		dispose();
	});

	it("ignores Died for entities that were never enemies", () => {
		const { game, horde, world, dispose } = setup(1);
		const events = createEventBuffer();
		const port = createRenderPort(game, horde);
		const hero = spawnBody(world, 0, 0);
		events.push(EventType.Died, 0, 0, 0, hero);
		port.consumeEvents(events);
		expect(horde.stats.ghosts).toBe(0);
		dispose();
	});

	it("allocates no arrays or strings per frame once warm", () => {
		const { horde, world, dispose } = setup();
		for (let i = 0; i < 100; i++) spawnEnemy(world, i, i, i % 2);
		for (let i = 0; i < 200; i++) horde.sync(world, 0.5);

		let calls = 0;
		const arrayProto = Array.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
		const typedProto = Float32Array.prototype as unknown as Record<
			string,
			(...args: unknown[]) => unknown
		>;
		const patched: [
			Record<string, (...args: unknown[]) => unknown>,
			string,
			(...args: unknown[]) => unknown,
		][] = [];
		const count = (proto: Record<string, (...args: unknown[]) => unknown>, name: string): void => {
			const original = proto[name];
			if (!original) return;
			patched.push([proto, name, original]);
			proto[name] = function (this: unknown, ...args: unknown[]): unknown {
				calls++;
				return original.apply(this, args);
			};
		};
		for (const name of ["filter", "map", "slice", "concat", "join"]) count(arrayProto, name);
		count(typedProto, "subarray");
		try {
			for (let i = 0; i < 1000; i++) horde.sync(world, 0.5);
		} finally {
			for (const [proto, name, original] of patched) proto[name] = original;
		}
		expect(calls).toBe(0);
		dispose();
	});
});

describe("elite look", () => {
	it("scales elite instances by elitesData.scale and tints them per modifier", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const mesh = skinnedBox("elite_enemy", game.scene);
		const vat = createVat(
			game.scene,
			"elite_enemy",
			new Float32Array(meta.width * meta.height * 4).buffer,
			meta,
		);
		const tints = [
			[2, 0, 0],
			[0, 2, 0],
		] as const;
		const horde = createHordeRenderer([{ mesh, vat, walkRefSpeed: 3 }], {
			capacity: 8,
			ghostCapacity: 2,
			deltaSeconds: () => 1 / 60,
			elite: { scale: 1.6, tints },
		});
		const world = createGameWorld();
		const plain = spawnEnemy(world, 0, 0);
		const first = spawnEnemy(world, 3, 0);
		const second = spawnEnemy(world, 6, 0);
		for (const [eid, modifier] of [
			[first, 1],
			[second, 2],
		] as const) {
			addComponent(world, eid, Elite);
			Elite.modifier[eid] = modifier;
		}
		horde.sync(world, 1);
		const matrix = mesh.thinInstanceGetWorldMatrices();
		expect(mesh.thinInstanceCount).toBe(3);
		const scaleOf = (n: number): number => matrix[n]?.m[5] ?? 0;
		expect(scaleOf(0)).toBeCloseTo(1, 5);
		expect(scaleOf(1)).toBeCloseTo(1.6, 5);
		expect(scaleOf(2)).toBeCloseTo(1.6, 5);
		const colors = mesh.getVertexBuffer("instanceColor")?.getData() as Float32Array | null;
		expect(Array.from(colors?.slice(0, 3) ?? [])).toEqual([1, 1, 1]);
		expect(Array.from(colors?.slice(4, 7) ?? [])).toEqual([2, 0, 0]);
		expect(Array.from(colors?.slice(8, 11) ?? [])).toEqual([0, 2, 0]);
		expect(plain).toBeGreaterThanOrEqual(0);
		dispose();
	});
});

describe("boss look", () => {
	it("draws the boss larger and tints it once it is enraged", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const mesh = skinnedBox("boss_enemy", game.scene);
		const vat = createVat(
			game.scene,
			"boss_enemy",
			new Float32Array(meta.width * meta.height * 4).buffer,
			meta,
		);
		const horde = createHordeRenderer([{ mesh, vat, walkRefSpeed: 3 }], {
			capacity: 4,
			ghostCapacity: 1,
			deltaSeconds: () => 1 / 60,
			boss: { scale: 2.2, enrageTint: [1.7, 0.5, 0.5] },
		});
		const world = createGameWorld();
		const boss = spawnEnemy(world, 0, 0);
		addComponent(world, boss, Boss);
		Boss.id[boss] = 1;
		horde.sync(world, 1);
		const colors = (): Float32Array => mesh.getVertexBuffer("instanceColor")?.getData() as Float32Array;
		expect(Array.from(colors().slice(0, 3))).toEqual([1, 1, 1]);
		Boss.enrageStacks[boss] = 1;
		horde.sync(world, 1);
		expect(Array.from(colors().slice(0, 3)).map((v) => Number(v.toFixed(2)))).toEqual([1.7, 0.5, 0.5]);
		expect(mesh.thinInstanceGetWorldMatrices()[0]?.m[5]).toBeCloseTo(2.2, 5);
		dispose();
	});
});

describe("render culling", () => {
	it("leaves enemies beyond the cull radius out of the instance buffers", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const mesh = skinnedBox("cull_enemy", game.scene);
		const vat = createVat(
			game.scene,
			"cull_enemy",
			new Float32Array(meta.width * meta.height * 4).buffer,
			meta,
		);
		const horde = createHordeRenderer([{ mesh, vat, walkRefSpeed: 3 }], {
			capacity: 100,
			ghostCapacity: 2,
			deltaSeconds: () => 1 / 60,
			cullRadius: 30,
		});
		const world = createGameWorld();
		const hero = spawnBody(world, 0, 0);
		addComponent(world, hero, PlayerFaction);
		const visible = 60;
		for (let i = 0; i < 100; i++) spawnEnemy(world, i < visible ? 10 : 35, 0);
		horde.sync(world, 1);
		expect(mesh.thinInstanceCount).toBeLessThanOrEqual(visible * 1.1);
		expect(mesh.thinInstanceCount).toBeGreaterThanOrEqual(visible);
		dispose();
	});
});
