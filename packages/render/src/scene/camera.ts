import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { renderData } from "@gc/game";

const data = renderData.camera;

/**
 * GDD §5 / ADR-0017, values from `data/render.json`. Babylon measures beta from the zenith, so 55 degrees of
 * elevation is pi/2 minus 55 degrees (D1).
 */
export const CAMERA = {
	alpha: data.alpha,
	beta: Math.PI / 2 - (data.elevationDegrees * Math.PI) / 180,
	fov: data.fov,
	radius: data.radius,
	radiusMobile: data.radiusMobile,
	/** Exponential follow rate per second of the camera target. */
	followRate: data.followRate,
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
