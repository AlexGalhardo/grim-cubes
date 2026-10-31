import type { Camera } from "@babylonjs/core/Cameras/camera";
import { Frustum } from "@babylonjs/core/Maths/math.frustum";
import type { Plane } from "@babylonjs/core/Maths/math.plane";
import { Matrix } from "@babylonjs/core/Maths/math.vector";

/** `Frustum.GetPlanesToRef` orders the planes near, far, left, right, top, bottom: only the four sides are tested. */
const FIRST_SIDE = 2;
const PLANES = 6;
/** The camera follows the hero with a lag and the horde syncs before it moves: extra room in u (follow rate 8/s at hero speed 6 trails by 0.75 u). */
const FOLLOW_SLACK = 1;
/** Height at which an enemy is tested: about the middle of a body. */
const BODY_HEIGHT = 0.8;

export interface FrustumCuller {
	/** Recomputes the side planes from the camera; once per frame, no allocation. */
	update(): void;
	/** True when a sphere of `radius` u at (x, BODY_HEIGHT, z) touches the widened frustum. */
	visible(x: number, z: number, radius: number): boolean;
}

export function createFrustumCuller(camera: Camera): FrustumCuller {
	const transform = new Matrix();
	const planes = Frustum.GetPlanes(Matrix.Identity());
	return {
		update(): void {
			camera.getViewMatrix().multiplyToRef(camera.getProjectionMatrix(), transform);
			Frustum.GetPlanesToRef(transform, planes as Plane[]);
		},
		visible(x, z, radius): boolean {
			const reach = radius + FOLLOW_SLACK;
			for (let i = FIRST_SIDE; i < PLANES; i++) {
				const plane = planes[i];
				if (
					plane &&
					plane.normal.x * x + plane.normal.y * BODY_HEIGHT + plane.normal.z * z + plane.d < -reach
				) {
					return false;
				}
			}
			return true;
		},
	};
}
