import {
	Boss,
	bossesData,
	createGameWorld,
	EnemyFaction,
	EventType,
	PlayerFaction,
	spawnBody,
} from "@gc/game";
import { addComponent } from "bitecs";
import { describe, expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import type { Character } from "./character";
import { createCharacters } from "./characters";

function fakeRig(): Character & { calls: string[]; alpha: number; lift: number; visible: boolean } {
	const state = { calls: [] as string[], alpha: 1, lift: 0, visible: true };
	const rig = {
		...state,
		setPose: vi.fn(),
		setSpeed: vi.fn(),
		playOnce: vi.fn((clip: string) => {
			rig.calls.push(`once:${clip}`);
			return true;
		}),
		playFinal: vi.fn((clip: string) => {
			rig.calls.push(`final:${clip}`);
			return true;
		}),
		clearFinal: vi.fn(),
		holdPose: vi.fn(() => true),
		update: vi.fn(),
		setTint: vi.fn(),
		setVisible: vi.fn((v: boolean) => {
			rig.visible = v;
		}),
		setAlpha: vi.fn((a: number) => {
			rig.alpha = a;
		}),
		setLift: vi.fn((y: number) => {
			rig.lift = y;
		}),
	};
	return rig as unknown as Character & { calls: string[]; alpha: number; lift: number; visible: boolean };
}

function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	const rigs = bossesData.map(() => fakeRig());
	const characters = createCharacters(game, {
		hero: fakeRig(),
		bosses: rigs,
		executionZoom: 0.2,
		executionSeconds: 1.5,
	});
	const boss = (id: string) => {
		const e = spawnBody(world, 5, 5);
		addComponent(world, e, EnemyFaction);
		Boss.id[e] = bossesData.findIndex((b) => b.id === id) + 1;
		return e;
	};
	return {
		game,
		world,
		rigs,
		characters,
		boss,
		dispose,
		indexOf: (id: string) => bossesData.findIndex((b) => b.id === id),
	};
}

describe("boss rigs", () => {
	it("fades the Alpha Hunter while stealthed and restores it on the reveal and on death", () => {
		const { world, rigs, characters, boss, indexOf, dispose } = setup();
		boss("alpha_hunter");
		characters.sync(world, 1, 0.016, false);
		const rig = rigs[indexOf("alpha_hunter")];
		characters.onEvent(EventType.BossStealth, 1, 0.15, 3, 0);
		expect(rig?.alpha).toBe(0.15);
		characters.onEvent(EventType.BossStealth, 0, 1, 0, 0);
		expect(rig?.alpha).toBe(1);
		characters.onEvent(EventType.BossStealth, 1, 0.15, 3, 0);
		characters.onEvent(EventType.BossDied, 0, 0, 0, 0);
		expect(rig?.alpha).toBe(1);
		expect(rig?.calls).toContain("final:death_execution");
		dispose();
	});

	it("shimmers a stealthed boss for a moment every half second", () => {
		const { world, rigs, characters, boss, indexOf, dispose } = setup();
		boss("alpha_hunter");
		characters.sync(world, 1, 0.016, false);
		const rig = rigs[indexOf("alpha_hunter")];
		characters.onEvent(EventType.BossStealth, 1, 0.15, 3, 0);
		const seen = new Set<number>();
		for (let i = 0; i < 90; i++) {
			characters.sync(world, 1, 1 / 60, false);
			seen.add(rig?.alpha ?? 0);
		}
		expect([...seen].sort()).toEqual([0.15, 0.45]);
		characters.onEvent(EventType.BossStealth, 0, 1, 0, 0);
		characters.sync(world, 1, 1 / 60, false);
		expect(rig?.alpha).toBe(1);
		dispose();
	});

	it("arcs the leap up and back down over its airtime", () => {
		const { world, rigs, characters, boss, indexOf, dispose } = setup();
		boss("alpha_hunter");
		characters.sync(world, 1, 0.016, false);
		characters.onEvent(EventType.BossLeap, 8, 8, 0.5, 0);
		characters.sync(world, 1, 0.25, false);
		const peak = rigs[indexOf("alpha_hunter")]?.lift ?? 0;
		expect(peak).toBeGreaterThan(2);
		characters.sync(world, 1, 0.3, false);
		expect(rigs[indexOf("alpha_hunter")]?.lift).toBeCloseTo(0, 5);
		dispose();
	});

	it("lifts the Nest Queen in phase 2 and keeps the other bosses on the ground", () => {
		const { world, rigs, characters, boss, indexOf, dispose } = setup();
		const queen = boss("nest_queen");
		characters.sync(world, 1, 0.016, false);
		expect(rigs[indexOf("nest_queen")]?.lift).toBe(0);
		Boss.phase[queen] = 1;
		for (let i = 0; i < 60; i++) characters.sync(world, 1, 0.05, false);
		expect(rigs[indexOf("nest_queen")]?.lift).toBeGreaterThan(1.5);
		dispose();
	});
});

it("grows the hero's weapon with the reach a swing reports, never below its own size", () => {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const setWeaponScale = vi.fn();
	const hero = {
		setPose: vi.fn(),
		setSpeed: vi.fn(),
		setVisible: vi.fn(),
		update: vi.fn(),
		playOnce: vi.fn(),
		setWeaponScale,
	};
	const characters = createCharacters(game, {
		hero: hero as unknown as Character,
		bosses: [],
		executionZoom: 0.2,
		executionSeconds: 1.5,
	});
	characters.onEvent(EventType.Swung, 0, 1, 3.4, 0);
	expect(setWeaponScale).toHaveBeenLastCalledWith(2);
	characters.onEvent(EventType.Swung, 0, 1, 1, 0);
	expect(setWeaponScale).toHaveBeenLastCalledWith(1);
	dispose();
});
