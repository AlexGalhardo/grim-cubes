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

	it("keeps the camera target continuous in absolute coordinates across origin shifts", () => {
		const { engine, dispose } = createNullEngine();
		const game = createGameScene(engine);
		const port = createRenderPort(game);
		const world = createGameWorld();
		const events = createEventBuffer();
		const origin = createOrigin();
		const hero = spawnBody(world, 0, 0);
		addComponent(world, hero, PlayerFaction);

		let shifts = 0;
		let previousAbs = 0;
		for (let step = 0; step < Math.ceil(5000 / 0.1); step++) {
			PrevPosition.x[hero] = Position.x[hero] ?? 0;
			Position.x[hero] = (Position.x[hero] ?? 0) + 0.1;
			const originBefore = origin.x;
			const targetBefore = game.camera.target.x;
			const shifted = applyOriginShift(world, origin, hero, events, config);
			port.consumeEvents(events);
			if (shifted) {
				shifts++;
				const moved = origin.x - originBefore;
				expect(Math.abs(game.camera.target.x - (targetBefore - moved))).toBeLessThan(0.01);
				expect(
					Math.abs(origin.x + game.camera.target.x - (originBefore + targetBefore)),
				).toBeLessThan(0.01);
			}
			port.sync(world, 1);
			const abs = origin.x + game.camera.target.x;
			expect(Math.abs(abs - previousAbs - 0.1)).toBeLessThan(0.01);
			previousAbs = abs;
		}
		expect(shifts).toBeGreaterThanOrEqual(4);
		game.dispose();
		dispose();
	});
});
