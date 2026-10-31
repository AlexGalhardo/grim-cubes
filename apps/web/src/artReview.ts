import { createEngine, startModelReview } from "@gc/render";

/**
 * Debug route `?art=<model id>[&silhouette=1][&ingame=1[&biome=<id>]]`: renders one model alone for the art review captures. It only exists
 * in builds made with GC_DEBUG_API=1.
 */
/** Screens this wide or narrower take the mobile camera radius in the in-game captures (800x360). */
const MOBILE_WIDTH = 900;

export async function bootArtReview(canvas: HTMLCanvasElement, params: URLSearchParams): Promise<void> {
	const id = params.get("art");
	if (!id) throw new Error("Missing ?art=<model id>");
	const render = await createEngine(canvas);
	const scene = await startModelReview(render.engine, {
		baseUrl: "/assets/",
		id,
		silhouette: params.get("silhouette") === "1",
		ingame: params.get("ingame") === "1",
		mobile: window.innerWidth <= MOBILE_WIDTH,
		...(params.get("biome") ? { biome: params.get("biome") as string } : {}),
	});
	render.engine.runRenderLoop(() => scene.render());
	scene.executeWhenReady(() => {
		window.gc.ready = true;
	});
}
