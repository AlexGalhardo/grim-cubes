export interface FacingInput {
	/** Position of the hero. */
	x: number;
	z: number;
	/** Position of the current target, when it is alive and in range. */
	target?: { x: number; z: number } | undefined;
	vx: number;
	vz: number;
}

const TWO_PI = Math.PI * 2;
/** Beyond this angle (rad) between the facing and the velocity the hero is backing away (110 degrees). */
export const BACKPEDAL_ANGLE = (110 * Math.PI) / 180;

/** True when the hero travels more than `BACKPEDAL_ANGLE` away from where it looks. */
export function isBackpedaling(yaw: number, vx: number, vz: number): boolean {
	const speed = Math.hypot(vx, vz);
	if (speed <= STILL) return false;
	return (vx * Math.sin(yaw) + vz * Math.cos(yaw)) / speed < Math.cos(BACKPEDAL_ANGLE);
}

/** Below this speed (u/s) the hero counts as standing still and keeps its last yaw. */
const STILL = 0.05;

/** Wraps an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
	const w = (((a + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI;
	return w === 0 ? Math.PI : w - Math.PI;
}

/**
 * The yaw the hero wants (0 looks along +z): at the target when there is one (twin-stick, whatever the movement), else
 * along the movement, else null to keep the current yaw.
 */
export function desiredYaw(input: FacingInput): number | null {
	if (input.target) {
		const dx = input.target.x - input.x;
		const dz = input.target.z - input.z;
		if (dx !== 0 || dz !== 0) return Math.atan2(dx, dz);
	}
	if (Math.hypot(input.vx, input.vz) > STILL) return Math.atan2(input.vx, input.vz);
	return null;
}

/** Turns `current` towards `desired` by the shortest way with an exponential approach of time constant `tau` seconds. */
export function turnTowards(current: number, desired: number, dt: number, tau: number): number {
	if (tau <= 0) return desired;
	const delta = wrapAngle(desired - current);
	return wrapAngle(current + delta * (1 - Math.exp(-Math.max(dt, 0) / tau)));
}
