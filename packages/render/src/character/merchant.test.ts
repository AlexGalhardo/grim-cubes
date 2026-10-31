import { createGameWorld, PlayerFaction, Position, spawnBody } from "@gc/game";
import { addComponent } from "bitecs";
import { expect, it, vi } from "vitest";
import { createNullEngine } from "../engine";
import { createGameScene } from "../scene/scene";
import type { Character } from "./character";
import { createCharacters, type MerchantLook } from "./characters";

function setup() {
	const { engine, dispose } = createNullEngine();
	const game = createGameScene(engine);
	const world = createGameWorld();
	const hero = spawnBody(world, 0, 0);
	addComponent(world, hero, PlayerFaction);
	const calls: string[] = [];
	const rig = {
		setPose: vi.fn(),
		setSpeed: vi.fn(),
		setVisible: vi.fn((v: boolean) => calls.push(v ? "show" : "hide")),
		playOnce: vi.fn((clip: string) => {
			calls.push(clip);
			return true;
		}),
		update: vi.fn(),
		holdPose: vi.fn(),
	} as unknown as Character;
	let look: MerchantLook | null = null;
	const characters = createCharacters(game, {
		hero: {
			setPose: vi.fn(),
			setSpeed: vi.fn(),
			setVisible: vi.fn(),
			update: vi.fn(),
		} as unknown as Character,
		merchant: rig,
		merchantView: () => look,
		bosses: [],
		executionZoom: 0.2,
		executionSeconds: 1.5,
	});
	return {
		game,
		world,
		hero,
		calls,
		rig,
		characters,
		set: (next: MerchantLook | null) => {
			look = next;
		},
		dispose,
	};
}

it("stays at its fixed spot: emerge while arriving, idle while waiting, submerge while leaving, hidden when away", () => {
	const { game, world, calls, rig, characters, set, dispose } = setup();
	const ring = () => game.scene.getMeshByName("merchant_ring")?.isEnabled();
	characters.sync(world, 1, 1 / 60, false);
	expect(calls).toEqual(["hide"]);
	set({ x: 20, z: 5, state: "arriving" });
	characters.sync(world, 1, 1 / 60, false);
	expect(calls).toEqual(["hide", "show", "emerge"]);
	expect(rig.setPose).toHaveBeenLastCalledWith(20, 5, expect.any(Number));
	set({ x: 20, z: 5, state: "waiting" });
	characters.sync(world, 1, 1 / 60, false);
	expect(calls).toEqual(["hide", "show", "emerge"]);
	expect(ring()).toBe(false);
	set({ x: 20, z: 5, state: "leaving" });
	characters.sync(world, 1, 1 / 60, false);
	expect(calls.at(-1)).toBe("submerge");
	set(null);
	characters.sync(world, 1, 1 / 60, false);
	expect(calls.at(-1)).toBe("hide");
	expect(ring()).toBe(false);
	dispose();
});

it("shows the 1.8 u interaction ring only while waiting with the hero within 4 u", () => {
	const { game, world, hero, characters, set, dispose } = setup();
	const ring = () => game.scene.getMeshByName("merchant_ring");
	set({ x: 3, z: 0, state: "waiting" });
	characters.sync(world, 1, 1 / 60, false);
	expect(ring()?.isEnabled()).toBe(true);
	expect(ring()?.position.x).toBe(3);
	Position.x[hero] = -10;
	characters.sync(world, 1, 1 / 60, false);
	expect(ring()?.isEnabled()).toBe(false);
	dispose();
});
