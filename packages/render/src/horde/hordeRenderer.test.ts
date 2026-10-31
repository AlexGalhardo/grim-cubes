import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
	Attacking,
	createEventBuffer,
	createGameWorld,
	EnemyFaction,
	EnemyType,
	EventType,
	Facing,
	HitFlash,
	Position,
	PrevPosition,
	spawnBody,
} from "@gc/game";
import { addComponent, removeComponent } from "bitecs";
import { describe, expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createRenderPort } from "../port";
import { createGameScene } from "../scene/scene";
import { createVat, type VatMeta } from "../vat/loader";
import { createHordeRenderer, startOffset } from "./hordeRenderer";

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

	it("interpolates Prev to Pos and picks hit while HitFlash is active", () => {
		const { types, horde, world, dispose } = setup(1);
		const eid = spawnEnemy(world, 0, 0);
		PrevPosition.x[eid] = 2;
		Position.x[eid] = 4;
		horde.sync(world, 0.5);
		const buffers = types[0]?.mesh.thinInstanceGetWorldMatrices();
		expect(buffers?.[0]?.m[12]).toBeCloseTo(3, 6);
		const settings = (): number[] => {
			const storage =
				types[0]?.mesh._userThinInstanceBuffersStorage?.data.bakedVertexAnimationSettingsInstanced;
			return Array.from((storage as Float32Array).subarray(0, 2));
		};
		expect(settings()).toEqual([2, 7]);
		HitFlash.ticks[eid] = 3;
		horde.sync(world, 0.5);
		expect(settings()).toEqual([11, 12]);
		HitFlash.ticks[eid] = 0;
		horde.sync(world, 0.5);
		expect(settings()).toEqual([2, 7]);
		Attacking.ticks[eid] = 4;
		horde.sync(world, 0.5);
		expect(settings()).toEqual([8, 10]);
		HitFlash.ticks[eid] = 2;
		horde.sync(world, 0.5);
		expect(settings()).toEqual([11, 12]);
		HitFlash.ticks[eid] = 0;
		Attacking.ticks[eid] = 0;
		horde.sync(world, 0.5);
		expect(settings()).toEqual([2, 7]);
		dispose();
	});

	it("rotates each instance about Y by Facing.yaw", () => {
		const { types, horde, world, dispose } = setup(1);
		const eid = spawnEnemy(world, 1, 2);
		Facing.yaw[eid] = Math.PI / 2;
		horde.sync(world, 1);
		const m = types[0]?.mesh.thinInstanceGetWorldMatrices()[0]?.m;
		// +z (yaw 0) turns to +x: the row for z maps to (sin, 0, cos).
		expect(m?.[8]).toBeCloseTo(1, 6);
		expect(m?.[10]).toBeCloseTo(0, 6);
		expect(m?.[0]).toBeCloseTo(0, 6);
		expect(m?.[2]).toBeCloseTo(-1, 6);
		expect([m?.[12], m?.[14]]).toEqual([1, 2]);
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
		expect(mesh?.thinInstanceGetWorldMatrices()[0]?.m[12]).toBeCloseTo(5 - 16, 6);
		const settings = mesh?._userThinInstanceBuffersStorage?.data
			.bakedVertexAnimationSettingsInstanced as Float32Array;
		expect([settings[0], settings[1]]).toEqual([13, 19]);

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

describe("startOffset", () => {
	it("lands the clip on its first frame at the start time", () => {
		for (const [time, frames] of [
			[0, 2],
			[0.37, 7],
			[5.123, 6],
			[100.01, 7],
		] as const) {
			const speed = 12;
			const t = (time * speed) / frames;
			const num = frames - (t < 1 ? 0 : 1);
			const frame = Math.floor((t - Math.floor(t)) * num + startOffset(time, speed, frames)) % num;
			expect(Math.floor(frame)).toBe(0);
		}
	});
});
