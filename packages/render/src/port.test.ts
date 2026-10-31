import {
	applyOriginShift,
	createEventBuffer,
	createGameWorld,
	createOrigin,
	PlayerFaction,
	Position,
	PrevPosition,
	spawnBody,
	type WorldConfig,
} from "@gc/game";
import { addComponent } from "bitecs";
import { describe, expect, it } from "vitest";
import { createNullEngine } from "./engine";
import { createRenderPort } from "./port";
import { CAMERA } from "./scene/camera";
import { createGameScene } from "./scene/scene";

const config: Pick<WorldConfig, "chunkSize" | "originShiftThreshold"> = {
	chunkSize: 16,
	originShiftThreshold: 1024,
};

describe("render port", () => {
	it("interpolates the hero cube between PrevPosition and Position", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const hero = spawnBody(world, 0, 0);
		addComponent(world, hero, PlayerFaction);
		PrevPosition.x[hero] = 2;
		Position.x[hero] = 4;
		createRenderPort(game).sync(world, 0.5);
		expect(game.scene.getMeshByName("hero")?.position.x).toBeCloseTo(3, 6);
		expect(game.camera.target.x).toBeCloseTo(3, 6);
		game.dispose();
		dispose();
	});

	it("eases the camera target towards the hero at the configured rate", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const world = createGameWorld();
		const hero = spawnBody(world, 0, 0);
		addComponent(world, hero, PlayerFaction);
		const port = createRenderPort(game, undefined, { followRate: 8, deltaSeconds: () => 1 / 60 });
		port.sync(world, 1);
		expect(game.camera.target.x).toBe(0);

		PrevPosition.x[hero] = Position.x[hero] = 10;
		for (let frame = 1; frame <= 30; frame++) {
			port.sync(world, 1);
			// Exponential approach: after t seconds the remaining distance is 10 * exp(-8 t).
			expect(game.camera.target.x).toBeCloseTo(10 * (1 - Math.exp((-8 * frame) / 60)), 6);
		}
		// Angles and radius survive the target moving (the camera follows in place).
		expect(game.camera.alpha).toBeCloseTo(CAMERA.alpha, 9);
		expect(game.camera.beta).toBeCloseTo(CAMERA.beta, 9);
		expect(game.camera.radius).toBeCloseTo(CAMERA.radius, 9);
		game.dispose();
		dispose();
	});

	it.each([
		["consumeEvents before sync", true],
		["sync before consumeEvents", false],
	])(
		"keeps the eased camera continuous in absolute coordinates across an origin shift (%s)",
		(_name, consumeFirst) => {
			const { engine, dispose } = createNullEngine();
			const game = createGameScene(engine);
			const world = createGameWorld();
			const events = createEventBuffer();
			const origin = createOrigin();
			const hero = spawnBody(world, 0, 0);
			addComponent(world, hero, PlayerFaction);
			const port = createRenderPort(game, undefined, {
				origin,
				followRate: 8,
				deltaSeconds: () => 1 / 60,
			});
			port.sync(world, 1);

			// The hero is at absolute x = 1030 and the camera has eased to about 900.
			PrevPosition.x[hero] = Position.x[hero] = 1030;
			game.camera.target.x = 900;
			const absBefore = origin.x + game.camera.target.x;
			expect(applyOriginShift(world, origin, hero, events, config)).toBe(true);
			if (consumeFirst) {
				port.consumeEvents(events);
				port.sync(world, 1);
			} else {
				port.sync(world, 1);
				port.consumeEvents(events);
			}
			const absAfter = origin.x + game.camera.target.x;
			// One easing step towards the hero (k = 1 - exp(-8/60)) and nothing else: no jump from the shift.
			const k = 1 - Math.exp(-8 / 60);
			expect(absAfter).toBeCloseTo(absBefore + (1030 - absBefore) * k, 4);
			game.dispose();
			dispose();
		},
	);

	it.each([
		["consumeEvents before sync", true],
		["sync before consumeEvents", false],
	])(
		"keeps camera target and ground continuous in absolute coordinates across origin shifts (%s)",
		(_name, consumeFirst) => {
			const { engine, dispose } = createNullEngine();
			const game = createGameScene(engine);
			const port = createRenderPort(game);
			const world = createGameWorld();
			const events = createEventBuffer();
			const origin = createOrigin();
			const hero = spawnBody(world, 0, 0);
			addComponent(world, hero, PlayerFaction);
			const ground = game.scene.getMeshByName("ground");

			// 0.5 u per step covers 5000 u in 10k steps. Errors are accumulated and asserted once: two expect() calls
			// per step over 50k steps took ~400 ms alone and timed out when other agents saturated the CPU.
			const stepSize = 0.5;
			let shifts = 0;
			let previousAbs = 0;
			let worstCamera = 0;
			let worstGround = 0;
			for (let step = 0; step < 5000 / stepSize; step++) {
				PrevPosition.x[hero] = Position.x[hero] ?? 0;
				Position.x[hero] = (Position.x[hero] ?? 0) + stepSize;
				if (applyOriginShift(world, origin, hero, events, config)) shifts++;
				if (consumeFirst) {
					port.consumeEvents(events);
					port.sync(world, 1);
				} else {
					port.sync(world, 1);
					port.consumeEvents(events);
				}
				const abs = origin.x + game.camera.target.x;
				worstCamera = Math.max(worstCamera, Math.abs(abs - previousAbs - stepSize));
				worstGround = Math.max(worstGround, Math.abs(origin.x + (ground?.position.x ?? 0)));
				previousAbs = abs;
			}
			expect(worstCamera).toBeLessThan(0.01);
			expect(worstGround).toBeLessThan(0.01);
			expect(shifts).toBeGreaterThanOrEqual(4);
			game.dispose();
			dispose();
		},
	);
});
