import type { MerchantConfig } from "../data/types";
import { Facing, Position } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { STEP } from "../loop";
import type { RunSystem } from "./round";

export type MerchantPhase = "arriving" | "waiting" | "leaving";

/** Public state of the Merchant NPC (A-05-01): a fixed spot in relative coordinates, read by the render and the HUD. */
export interface MerchantView {
	x: number;
	z: number;
	state: MerchantPhase;
}

export interface MerchantSystem {
	/** Null while he is not around. The same object is updated in place. */
	readonly view: Readonly<MerchantView> | null;
	/** Distance from the hero to him, or Infinity when he is away. */
	distance(): number;
	/** The talk action: opens the shop when the hero is within `talkRadius` of a waiting Merchant. */
	talk(): boolean;
	/** The world origin moved by (dx, dz): his spot moves with it. */
	shift(dx: number, dz: number): void;
	/** Call once per step, after the run system. */
	run(): void;
	readonly config: MerchantConfig;
}

const toSteps = (seconds: number): number => Math.max(1, Math.round(seconds / STEP));

/**
 * The Merchant waits for the hero where the round ended: `distance` u away, on the side opposite to where the horde
 * was (ahead of the hero when there was none). He walks free until the hero gets within `openRadius`, talks to him,
 * or `merchantWaitSeconds` pass. He leaves when the shop closes.
 */
export function createMerchantSystem(deps: {
	config: MerchantConfig;
	run: RunSystem;
	events: EventBuffer;
	hero: number;
	waitSeconds: number;
}): MerchantSystem {
	const { config, run, events, hero, waitSeconds } = deps;
	const view: MerchantView = { x: 0, z: 0, state: "arriving" };
	let present = false;
	let ticks = 0;
	let before = run.state;

	function place(): void {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		const away = run.lastEnemies;
		let dx = 0;
		let dz = 0;
		if (away.count > 0) {
			dx = hx - away.x;
			dz = hz - away.z;
		}
		let length = Math.hypot(dx, dz);
		if (length < 1e-3) {
			const yaw = Facing.yaw[hero] ?? 0;
			dx = Math.sin(yaw);
			dz = Math.cos(yaw);
			length = Math.hypot(dx, dz) || 1;
		}
		view.x = hx + (dx / length) * config.distance;
		view.z = hz + (dz / length) * config.distance;
		view.state = "arriving";
		ticks = toSteps(config.arriveSeconds);
		present = true;
		events.push(EventType.MerchantArrived, view.x, view.z, waitSeconds, 0);
	}

	const distance = (): number =>
		present
			? Math.hypot((Position.x[hero] ?? 0) - view.x, (Position.z[hero] ?? 0) - view.z)
			: Number.POSITIVE_INFINITY;

	return {
		config,
		get view(): Readonly<MerchantView> | null {
			return present ? view : null;
		},
		distance,
		talk(): boolean {
			if (run.state !== "MerchantWait" || view.state !== "waiting" || distance() > config.talkRadius)
				return false;
			run.enterShop();
			return true;
		},
		shift(dx, dz): void {
			view.x -= dx;
			view.z -= dz;
		},
		run(): void {
			const now = run.state;
			if (now === "MerchantWait" && before !== "MerchantWait") place();
			// He stays through the shop and leaves when the next round starts.
			if (
				present &&
				view.state !== "leaving" &&
				before === "Shop" &&
				(now === "RoundIntro" || now === "BossIntro")
			) {
				view.state = "leaving";
				ticks = toSteps(config.leaveSeconds);
			}
			if (present && (now === "Idle" || now === "Results" || now === "Dying")) present = false;
			if (present) {
				if (view.state === "arriving" && --ticks <= 0) view.state = "waiting";
				else if (view.state === "leaving" && --ticks <= 0) present = false;
				else if (
					view.state === "waiting" &&
					now === "MerchantWait" &&
					distance() <= config.openRadius
				)
					run.enterShop();
			}
			// After the possible `enterShop` above, so the shop closing later is seen as leaving it.
			before = run.state;
		},
	};
}
