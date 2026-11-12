import type { InputState } from "@gc/core";
import { equipmentData } from "../data";
import { Health, Position } from "../ecs/components";
import type { GameSession } from "../session";
import { queryEnemies, queryFragments } from "../world/queries";
import { kiteSteer, type Policy, policyFor, tankSteer } from "./policy";

export interface BotHooks {
	/** The average price of the offers of the shop that just opened (0 without offers). */
	onShopOpened?: (averagePrice: number) => void;
	onItemBought?: () => void;
	/**
	 * Sidestep a prop the straight walk is stuck against. Off by default: the balance reports were calibrated with a
	 * bot that can get stuck; the soak (which has to reach every boss) turns it on.
	 */
	unstick?: boolean;
}

export interface Bot {
	readonly policy: Policy;
	/** Takes the pending level-up card, then sets the movement and dash of `input` for this step. */
	prepare(input: InputState): void;
	/** Spends the gold in an open shop by equipment value per gold (the caller closes the shop). */
	shop(): void;
}

/** The hero stopped by a prop for this long tries a way round (a bot walks in a straight line, a player walks around). */
const STUCK_STEPS = 45;
const DETOUR_STEPS = 90;
const MOVED_EPSILON = 0.02;

/**
 * An automatic player (GDD 25): the simulator's bots, shared with the browser soak test. `greedy` buys and picks for
 * damage and holds the weapon's range from the nearest enemy; `tank` prefers survival (see `policy.ts`). Not part of
 * the game: nothing in `session` depends on it.
 */
export function createBot(session: GameSession, policyId: Policy["id"], hooks: BotHooks = {}): Bot {
	const policy = policyFor(policyId);
	const { world, hero, progress, run, shop, levelUp, weapon, origin, dash } = session;
	let dashHeld = false;
	let ticks = 0;
	let lastX = Number.NaN;
	let lastZ = Number.NaN;
	let stuckFor = 0;
	let detourLeft = 0;
	let detourSide = 1;
	const spots: { x: number; z: number }[] = [];

	function pickBest(count: number, scoreOf: (index: number) => number): number {
		let best = 0;
		for (let i = 1; i < count; i++) if (scoreOf(i) > scoreOf(best)) best = i;
		return best;
	}

	function choose(): void {
		while (levelUp.offer) {
			const offer = levelUp.offer;
			if (
				!levelUp.choose(
					pickBest(offer.length, (i) => policy.modifierValue(offer[i]?.modifiers ?? [])),
				)
			)
				break;
		}
	}

	/** Holds the weapon's range from the nearest enemy, backing off when closer (the tank also runs and dashes). */
	function steer(input: InputState): void {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		// The bot roams outwards as the run goes on (20 u + 8 u per round): ring 1 starts at 120 u, so a median run
		// meets the Swamp from round ~13, the Forge from ~30. Beyond that radius it walks back towards the centre.
		const fromCentreX = origin.x + hx;
		const fromCentreZ = origin.z + hz;
		const fromCentre = Math.hypot(fromCentreX, fromCentreZ);
		if (fromCentre > 20 + 8 * run.round) {
			input.moveX = -fromCentreX / fromCentre;
			input.moveZ = -fromCentreZ / fromCentre;
			return;
		}
		if (policy.id === "tank") {
			spots.length = 0;
			for (const e of queryEnemies(world)) spots.push({ x: Position.x[e] ?? 0, z: Position.z[e] ?? 0 });
			const move = tankSteer({
				hero: { x: hx, z: hz },
				hpFraction: (Health.hp[hero] ?? 0) / Math.max(1, Health.max[hero] ?? 1),
				range: weapon.range,
				enemies: spots,
				canDash: dash.unlocked && dash.charges > 0,
			});
			input.moveX = move.moveX;
			input.moveZ = move.moveZ;
			// The dash fires on the press edge: hold it one step, then let go.
			input.dash = move.dash && !dashHeld;
			dashHeld = move.dash;
			return;
		}
		if (policy.id === "kite") {
			spots.length = 0;
			for (const e of queryEnemies(world)) spots.push({ x: Position.x[e] ?? 0, z: Position.z[e] ?? 0 });
			const enemyCount = spots.length;
			for (const f of queryFragments(world))
				spots.push({ x: Position.x[f] ?? 0, z: Position.z[f] ?? 0 });
			const move = kiteSteer({
				hero: { x: hx, z: hz },
				range: weapon.range,
				enemies: spots.slice(0, enemyCount),
				fragments: spots.slice(enemyCount),
				tick: ticks,
			});
			input.moveX = move.moveX;
			input.moveZ = move.moveZ;
			return;
		}
		let best = Number.POSITIVE_INFINITY;
		let dx = 0;
		let dz = 0;
		const list = queryEnemies(world);
		for (let i = 0; i < list.length; i++) {
			const e = list[i] ?? 0;
			const ex = (Position.x[e] ?? 0) - hx;
			const ez = (Position.z[e] ?? 0) - hz;
			const d = ex * ex + ez * ez;
			if (d < best) {
				best = d;
				dx = ex;
				dz = ez;
			}
		}
		const length = Math.sqrt(best);
		if (!(length > 0) || !Number.isFinite(length)) {
			input.moveX = 0;
			input.moveZ = 0;
			return;
		}
		const want = Math.max(1, weapon.range * 0.8);
		const sign = length > want + 0.5 ? 1 : length < want - 0.5 ? -1 : 0;
		input.moveX = (sign * dx) / length;
		input.moveZ = (sign * dz) / length;
		if (hooks.unstick) detour(input, hx, hz);
	}

	/** Heals below half HP and casts the super as soon as it is charged; the press is an edge, so it toggles every other step. */
	function casts(input: InputState): void {
		const { playerSpells } = session;
		const low = (Health.hp[hero] ?? 0) < (Health.max[hero] ?? 1) * 0.5;
		input.heal = low && ticks % 2 === 0;
		input.super = playerSpells.superKills >= playerSpells.superNeeded && ticks % 2 === 0;
	}

	/** A hero pushing against a prop for a while sidesteps it for a moment, alternating sides: the boss may be behind a wall. */
	function detour(input: InputState, hx: number, hz: number): void {
		const wantsToMove = input.moveX !== 0 || input.moveZ !== 0;
		if (Math.hypot(hx - lastX, hz - lastZ) > MOVED_EPSILON || !wantsToMove) stuckFor = 0;
		else stuckFor++;
		lastX = hx;
		lastZ = hz;
		if (detourLeft === 0 && stuckFor >= STUCK_STEPS) {
			detourLeft = DETOUR_STEPS;
			detourSide = -detourSide;
			stuckFor = 0;
		}
		if (detourLeft > 0) {
			detourLeft--;
			// Perpendicular to the way it wanted to go.
			const mx = input.moveX;
			input.moveX = -input.moveZ * detourSide;
			input.moveZ = mx * detourSide;
		}
	}

	return {
		policy,
		prepare(input): void {
			choose();
			ticks++;
			if (run.state === "Round" || run.state === "BossRound") {
				steer(input);
				casts(input);
			} else {
				input.dash = false;
				input.heal = false;
				input.super = false;
			}
		},
		shop(): void {
			const prices = shop.slots.map((s) => s.price);
			hooks.onShopOpened?.(prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0);
			for (;;) {
				let bestIndex = -1;
				let bestRatio = 0;
				for (const [i, slot] of shop.slots.entries()) {
					if (slot.sold || slot.price > progress.gold) continue;
					const levelsOf = equipmentData.slots[slot.slot]?.levels;
					const benefit =
						policy.modifierValue(levelsOf?.[slot.level - 1]?.modifiers ?? []) -
						policy.modifierValue(levelsOf?.[(shop.levels[slot.slot] ?? 0) - 1]?.modifiers ?? []);
					const ratio = benefit / Math.max(1, slot.price);
					if (benefit > 0 && ratio > bestRatio) {
						bestRatio = ratio;
						bestIndex = i;
					}
				}
				if (bestIndex < 0 || !shop.buy(bestIndex)) break;
				hooks.onItemBought?.();
			}
			// Materials have no other use: every slot goes up as far as they allow, from the first one.
			for (let slot = 0; slot < shop.levels.length; slot++)
				while (shop.upgrade(slot)) hooks.onItemBought?.();
		},
	};
}
