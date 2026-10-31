import { createInputState, createLogger, createStore, createVirtualStick } from "@gc/core";
import {
	createEventBuffer,
	createGameWorld,
	createLoop,
	Health,
	inputSystem,
	movementSystem,
	Position,
	spawnHero,
} from "@gc/game";
import { createInputSources, detectPlatform } from "@gc/platform";
import { createEngine, createGameScene, createRenderPort } from "@gc/render";
import { App, type HudState } from "@gc/ui";
import { createRoot } from "react-dom/client";
import heroData from "../../../data/hero.json";
import "./main.css";

const log = createLogger("boot");
const HUD_HZ = 12;

async function boot(): Promise<void> {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const uiRoot = document.querySelector<HTMLElement>("#ui");
	if (!canvas || !uiRoot) throw new Error("Missing #game or #ui element");

	window.gc = { ready: false };
	const platform = detectPlatform();
	const stick = platform.touch ? createVirtualStick() : undefined;
	const hud = createStore<HudState>({ hp: heroData.base.maxHp, maxHp: heroData.base.maxHp, round: 1 });
	createRoot(uiRoot).render(<App store={hud} stick={stick} />);

	const world = createGameWorld();
	const hero = spawnHero(world, {
		speed: heroData.base.speed,
		maxHp: heroData.base.maxHp,
		radius: heroData.base.radius,
	});

	const input = createInputState();
	const sources = createInputSources({
		target: window,
		getGamepads: () => navigator.getGamepads(),
		...(stick ? { stick } : {}),
	});
	const events = createEventBuffer();

	const render = await createEngine(canvas);
	const game = createGameScene(render.engine, platform.mobile);
	const port = createRenderPort(game);

	let lastHud = Number.NEGATIVE_INFINITY;
	const loop = createLoop({
		simulate: () => {
			sources.poll(input);
			inputSystem(world, hero, input);
			movementSystem(world);
		},
		render: (alpha) => {
			port.sync(world, alpha);
			port.consumeEvents(events);
			game.scene.render();
		},
		publish: (now) => {
			if (now - lastHud < 1000 / HUD_HZ) return;
			lastHud = now;
			const hp = Math.max(0, Math.ceil(Health.hp[hero] ?? 0));
			const current = hud.get();
			if (current.hp !== hp) hud.publish({ ...current, hp });
		},
	});

	if (__DEBUG_API__ && new URLSearchParams(location.search).has("debug")) {
		window.gc.debug = { hero: () => ({ x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 }) };
	}

	render.engine.runRenderLoop(() => loop.frame(performance.now()));
	window.addEventListener("resize", () => render.engine.resize());
	game.scene.executeWhenReady(() => {
		window.gc.ready = true;
		log.info("ready", { version: __APP_VERSION__, target: __BUILD_TARGET__, demo: __IS_DEMO__ });
	});
}

boot().catch((error: unknown) => log.error("boot failed", error));
