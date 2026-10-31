import { createLogger, createStore } from "@gc/core";
import { createEngine, createGameScene } from "@gc/render";
import { App, type HudState } from "@gc/ui";
import { createRoot } from "react-dom/client";
import "./main.css";

const log = createLogger("boot");

async function boot(): Promise<void> {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const uiRoot = document.querySelector<HTMLElement>("#ui");
	if (!canvas || !uiRoot) throw new Error("Missing #game or #ui element");

	window.gc = { ready: false };
	const hud = createStore<HudState>({ hp: 100, maxHp: 100, round: 1 });
	createRoot(uiRoot).render(<App store={hud} />);

	const render = await createEngine(canvas);
	const game = createGameScene(render.engine);
	render.engine.runRenderLoop(() => game.scene.render());
	window.addEventListener("resize", () => render.engine.resize());
	game.scene.executeWhenReady(() => {
		window.gc.ready = true;
		log.info("ready", { version: __APP_VERSION__, target: __BUILD_TARGET__, demo: __IS_DEMO__ });
	});
}

boot().catch((error: unknown) => log.error("boot failed", error));
