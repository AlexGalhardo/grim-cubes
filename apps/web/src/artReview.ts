import { createEngine, startModelReview } from "@gc/render";

/**
 * Debug route `?art=<model id>[&silhouette=1]`: renders one model alone for the art review captures. It only exists
 * in builds made with GC_DEBUG_API=1.
 */
export async function bootArtReview(canvas: HTMLCanvasElement, params: URLSearchParams): Promise<void> {
	const id = params.get("art");
	if (!id) throw new Error("Missing ?art=<model id>");
	const render = await createEngine(canvas);
	const scene = await startModelReview(render.engine, {
		baseUrl: "/assets/",
		id,
		silhouette: params.get("silhouette") === "1",
	});
	render.engine.runRenderLoop(() => scene.render());
	scene.executeWhenReady(() => {
		window.gc.ready = true;
	});
}
