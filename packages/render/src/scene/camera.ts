import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/**
 * GDD §5 / ADR-0017. Babylon measures beta from the zenith, so 55° of elevation is π/2 − 55° (D1).
 * Moves to data/render.json in P-02-01.
 */
export const CAMERA = {
	alpha: -Math.PI / 2,
	beta: Math.PI / 2 - (55 * Math.PI) / 180,
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
