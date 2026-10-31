import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import type { Character } from "./character";

export interface Portrait {
	/** Starts drawing the rig into the canvas every few frames; safe to call twice. */
	start(): void;
	/** Stops drawing and releases the texture; the canvas keeps its last frame. */
	stop(): void;
	readonly running: boolean;
}

/** Camera offset from the rig, in u: in front of it (rig faces +z once posed) at bust height. */
const CAMERA_DISTANCE = 3.4;
const CAMERA_HEIGHT = 1.7;
const LOOK_HEIGHT = 1.4;
const FIELD_OF_VIEW = 0.6;
/** The texture renders and is copied once every this many frames. */
const REFRESH_EVERY = 2;
/** A light that only the rig sees, from the camera's side and a little above: the Merchant's palette is very dark. */
const LIGHT_INTENSITY = 1.6;
const LIGHT_DROP = 0.4;
const BYTES_PER_PIXEL = 4;

/**
 * Animated portrait of a rig (the Merchant in the Shop): a small render-target texture of the same engine, seen by a
 * second camera and holding only the rig's meshes, copied into `canvas` with `putImageData`. The game canvas and its
 * size are never touched (an engine view would resize it), there is no second WebGL context, no second atlas and no
 * extra rig to animate. `canvas.width` is the texture size.
 */
export function createPortrait(game: GameScene, canvas: HTMLCanvasElement, rig: Character): Portrait {
	const { scene } = game;
	let camera: FreeCamera | undefined;
	let light: DirectionalLight | undefined;
	let target: RenderTargetTexture | undefined;
	let observer: ReturnType<typeof scene.onBeforeRenderObservable.add> = null;
	let copying = false;

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
		light?.direction.set(-Math.sin(yaw), -LIGHT_DROP, -Math.cos(yaw));
	}

	function copy(): void {
		const texture = target;
		const context = canvas.getContext("2d");
		if (copying || !texture || !context) return;
		copying = true;
		const size = canvas.width;
		void texture
			.readPixels()
			?.then((pixels) => {
				if (target !== texture || !pixels) return;
				const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
				const image = context.createImageData(size, size);
				const row = size * BYTES_PER_PIXEL;
				// Texture rows run bottom-up.
				for (let y = 0; y < size; y++)
					image.data.set(bytes.subarray((size - 1 - y) * row, (size - y) * row), y * row);
				context.putImageData(image, 0, 0);
			})
			.catch(() => undefined)
			.finally(() => {
				copying = false;
			});
	}

	return {
		get running(): boolean {
			return target !== undefined;
		},
		start(): void {
			if (target) return;
			camera = new FreeCamera("portrait", Vector3.Zero(), scene, false);
			camera.fov = FIELD_OF_VIEW;
			const meshes = rig.holder.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
			light = new DirectionalLight("portrait", Vector3.Down(), scene);
			light.intensity = LIGHT_INTENSITY;
			light.diffuse = Color3.FromHexString(PALETTE.bone);
			light.specular = Color3.Black();
			light.includedOnlyMeshes = meshes;
			follow();
			const texture = new RenderTargetTexture("portrait", canvas.width, scene, {
				generateDepthBuffer: true,
			});
			texture.activeCamera = camera;
			texture.renderList = meshes;
			texture.clearColor = Color4.FromHexString(`${PALETTE.night}FF`);
			texture.refreshRate = REFRESH_EVERY;
			texture.onAfterRenderObservable.add(copy);
			scene.customRenderTargets.push(texture);
			target = texture;
			observer = scene.onBeforeRenderObservable.add(follow);
		},
		stop(): void {
			if (!target) return;
			scene.onBeforeRenderObservable.remove(observer);
			observer = null;
			const index = scene.customRenderTargets.indexOf(target);
			if (index >= 0) scene.customRenderTargets.splice(index, 1);
			target.dispose();
			target = undefined;
			camera?.dispose();
			camera = undefined;
			light?.dispose();
			light = undefined;
		},
	};
}
