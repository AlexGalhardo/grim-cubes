import { Engine } from "@babylonjs/core/Engines/engine";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";

export interface RenderEngine {
	readonly engine: Engine | NullEngine;
	dispose(): void;
}

export class EngineUnavailableError extends Error {
	constructor() {
		super("WebGL2 is not available");
		this.name = "EngineUnavailableError";
	}
}

// The WebGPU branch (ADR-0014, opt-in, desktop only) is deferred to ALPHA.
export async function createEngine(canvas: HTMLCanvasElement): Promise<RenderEngine> {
	const engine = new Engine(canvas, false, { powerPreference: "high-performance", stencil: false });
	if (engine.webGLVersion < 2) {
		engine.dispose();
		throw new EngineUnavailableError();
	}
	return { engine, dispose: () => engine.dispose() };
}

/** `size` sets the render target the picking rays and the aspect ratio are computed against. */
export function createNullEngine(size?: { width: number; height: number }): RenderEngine {
	const engine = new NullEngine(
		size
			? {
					renderWidth: size.width,
					renderHeight: size.height,
					textureSize: 512,
					deterministicLockstep: false,
					lockstepMaxSteps: 4,
				}
			: undefined,
	);
	return { engine, dispose: () => engine.dispose() };
}
