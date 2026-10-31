import type { InputState } from "@gc/core";
import { Facing, Invulnerable, Velocity } from "../ecs/components";
import { STEP } from "../loop";

export interface DashConfig {
	distance: number;
	durationSeconds: number;
	iFramesSeconds: number;
	cooldownSeconds: number;
}

export interface DashOptions {
	/** Ossuary `dash_unlock`: the hero starts without a dash (D34). */
	unlocked: boolean;
	/** Ossuary `dash_charges`. */
	charges: number;
	/** Ossuary `dash_cooldown_reduction`, in seconds. */
	cooldownReductionSeconds: number;
}

export interface DashSystem {
	/** Run right after `inputSystem`: overrides the hero velocity while a dash lasts. */
	run(hero: number, input: Readonly<InputState>): void;
	readonly unlocked: boolean;
	readonly charges: number;
	readonly maxCharges: number;
	/** 0..1 progress of the charge being recharged; 1 when all charges are ready. */
	readonly recharge: number;
}

/** Shortest cooldown the reduction can reach, so stacked reductions never make the dash free. */
const MIN_COOLDOWN_SECONDS = 0.5;

/**
 * GDD 13 / D34: a short burst along the move direction (or the facing when standing still) with i-frames and a
 * cooldown per charge. The distance is exact because `movementSystem` integrates `velocity * STEP`.
 */
export function createDashSystem(config: DashConfig, options: DashOptions): DashSystem {
	const dashTicks = Math.max(1, Math.round(config.durationSeconds / STEP));
	// +1: damageSystem decrements the counter in the same step the dash starts, which would cost one tick.
	const iFrameTicks = Math.round(config.iFramesSeconds / STEP) + 1;
	const speed = config.distance / (dashTicks * STEP);
	const cooldownTicks = Math.round(
		Math.max(MIN_COOLDOWN_SECONDS, config.cooldownSeconds - options.cooldownReductionSeconds) / STEP,
	);
	const maxCharges = options.unlocked ? Math.max(1, options.charges) : 0;

	let charges = maxCharges;
	let rechargeTicks = 0;
	let remaining = 0;
	let dirX = 0;
	let dirZ = 0;
	let wasDown = false;

	return {
		run(hero, input): void {
			if (maxCharges === 0) return;
			const pressed = input.dash && !wasDown;
			wasDown = input.dash;

			if (charges < maxCharges && ++rechargeTicks >= cooldownTicks) {
				charges++;
				rechargeTicks = 0;
			}

			if (pressed && remaining === 0 && charges > 0) {
				const length = Math.hypot(input.moveX, input.moveZ);
				if (length > 0) {
					dirX = input.moveX / length;
					dirZ = input.moveZ / length;
				} else {
					const yaw = Facing.yaw[hero] ?? 0;
					dirX = Math.sin(yaw);
					dirZ = Math.cos(yaw);
				}
				remaining = dashTicks;
				if (charges === maxCharges) rechargeTicks = 0;
				charges--;
				Invulnerable.ticks[hero] = Math.max(Invulnerable.ticks[hero] ?? 0, iFrameTicks);
			}

			if (remaining > 0) {
				Velocity.x[hero] = dirX * speed;
				Velocity.z[hero] = dirZ * speed;
				remaining--;
			}
		},
		get unlocked(): boolean {
			return maxCharges > 0;
		},
		get charges(): number {
			return charges;
		},
		get maxCharges(): number {
			return maxCharges;
		},
		get recharge(): number {
			return charges === maxCharges ? 1 : rechargeTicks / cooldownTicks;
		},
	};
}
