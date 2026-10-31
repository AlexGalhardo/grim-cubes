import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/**
 * GDD §5 / ADR-0017 values, kept verbatim. Single place to change when the beta/elevation question
 * (Babylon beta is measured from the zenith) is settled for phase 2.
 */
export const CAMERA = {
	alpha: -Math.PI / 2,
	beta: 0.96,
	fov: 0.52,
	radius: 38,
	radiusMobile: 34,
} as const;

export function createCamera(scene: Scene, target: Vector3, mobile = false): ArcRotateCamera {
	const camera = new ArcRotateCamera(
		"camera",
		CAMERA.alpha,
		CAMERA.beta,
		mobile ? CAMERA.radiusMobile : CAMERA.radius,
		target,
		scene,
	);
	camera.fov = CAMERA.fov;
	camera.inputs.clear();
	return camera;
}
