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

			let shifts = 0;
			let previousAbs = 0;
			for (let step = 0; step < Math.ceil(5000 / 0.1); step++) {
				PrevPosition.x[hero] = Position.x[hero] ?? 0;
				Position.x[hero] = (Position.x[hero] ?? 0) + 0.1;
				if (applyOriginShift(world, origin, hero, events, config)) shifts++;
				if (consumeFirst) {
					port.consumeEvents(events);
					port.sync(world, 1);
				} else {
					port.sync(world, 1);
					port.consumeEvents(events);
				}
				const abs = origin.x + game.camera.target.x;
				expect(Math.abs(abs - previousAbs - 0.1)).toBeLessThan(0.01);
				expect(Math.abs(origin.x + (ground?.position.x ?? 0))).toBeLessThan(0.01);
				previousAbs = abs;
			}
			expect(shifts).toBeGreaterThanOrEqual(4);
			game.dispose();
			dispose();
		},
	);
});
