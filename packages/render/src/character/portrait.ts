import "@babylonjs/core/Engines/AbstractEngine/abstractEngine.views";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { GameScene } from "../scene/scene";
import type { Character } from "./character";

export interface Portrait {
	/** Starts drawing the rig into the canvas every frame; safe to call twice. */
	start(): void;
	/** Stops drawing and releases the view; the canvas keeps its last frame. */
	stop(): void;
	readonly running: boolean;
}

/** A layer only the portrait camera sees, so the second pass draws the rig and nothing else of the scene. */
const PORTRAIT_LAYER = 0x10000000;
/** Camera offset from the rig, in u: in front of it (rig faces +z once posed) at bust height. */
const CAMERA_DISTANCE = 3.4;
const CAMERA_HEIGHT = 1.7;
const LOOK_HEIGHT = 1.4;
const FIELD_OF_VIEW = 0.6;

/**
 * Animated portrait of a rig (the Merchant in the Shop): a second camera of the same engine renders the rig that is
 * already animating in the scene into `canvas` through an engine view, so there is no second WebGL context, no second
 * copy of the atlas and no extra rig to animate. The extra pass costs only the rig's meshes.
 */
export function createPortrait(game: GameScene, canvas: HTMLCanvasElement, rig: Character): Portrait {
	const { scene } = game;
	const engine = scene.getEngine();
	let camera: FreeCamera | undefined;
	let observer: ReturnType<typeof scene.onBeforeRenderObservable.add> = null;

	function follow(): void {
		if (!camera) return;
		const at = rig.holder.getAbsolutePosition();
		const yaw = rig.holder.rotation.y;
		// Looks back at the rig from the side it faces.
		camera.position.set(
			at.x + Math.sin(yaw) * CAMERA_DISTANCE,
			at.y + CAMERA_HEIGHT,
			at.z + Math.cos(yaw) * CAMERA_DISTANCE,
		);
		camera.setTarget(new Vector3(at.x, at.y + LOOK_HEIGHT, at.z));
	}

	return {
		get running(): boolean {
			return camera !== undefined;
		},
		start(): void {
			if (camera) return;
			camera = new FreeCamera("portrait", Vector3.Zero(), scene, false);
			camera.fov = FIELD_OF_VIEW;
			camera.layerMask = PORTRAIT_LAYER;
			for (const mesh of rig.holder.getChildMeshes()) mesh.layerMask |= PORTRAIT_LAYER;
			follow();
			observer = scene.onBeforeRenderObservable.add(follow);
			engine.registerView(canvas, camera);
		},
		stop(): void {
			if (!camera) return;
			engine.unRegisterView(canvas);
			scene.onBeforeRenderObservable.remove(observer);
			observer = null;
			camera.dispose();
			camera = undefined;
		},
	};
}
