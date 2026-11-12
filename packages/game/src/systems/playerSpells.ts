import type { InputState, SpatialHash } from "@gc/core";
import type { SpellsData } from "../data/types";
import { Health, Position, Radius } from "../ecs/components";
import { type EventBuffer, EventType, SpellVfx } from "../ecs/events";
import { isHittable } from "../ecs/hittable";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import { DamageOrigin } from "../rules/runstats";
import type { HealSpell, SuperSpell } from "../rules/spells";
import type { DamageQueue } from "./damage";

export interface PlayerSpellsDeps {
	heal: HealSpell;
	super: SuperSpell;
	config: SpellsData["super"];
	queue: DamageQueue;
	enemies: SpatialHash;
	events: EventBuffer;
	round: () => number;
	/** Kills of the run so far; the super charges from the ones after the round start or its last cast. */
	kills: () => number;
}

export interface PlayerSpells {
	/** One fixed step of a fight: reads the heal and super buttons (the press, not the hold) and runs the effects. */
	run(world: GameWorld, hero: number, input: Readonly<InputState>): void;
	/** A round begins: the charge starts from zero, the heal is ready and a super still running ends. */
	onRoundStart(): void;
	/** Seconds until the heal can be cast again; 0 when ready. */
	readonly healCooldown: number;
	readonly healCooldownMax: number;
	/** Kills counted towards the next super, and how many it needs (`baseKills` plus `killsPerUse` per cast so far). */
	readonly superKills: number;
	readonly superNeeded: number;
	/** Seconds the running super has left; 0 when idle. */
	readonly superActive: number;
	/** Casts in the current round. */
	readonly superUses: number;
}

const MAX_NEAR = 128;

/**
 * The two spells the player casts (S-20-02). The heal restores a fraction of the max HP and then waits its cooldown;
 * the super charges with kills (100 in the round, 5 more for every cast already made), lasts a few seconds and hits
 * everything around the hero every tick. Neither allocates after `create`.
 */
export function createPlayerSpells(deps: PlayerSpellsDeps): PlayerSpells {
	const { heal, config, queue, enemies, events, round, kills } = deps;
	const near = new Uint16Array(MAX_NEAR);
	const healSteps = Math.max(1, Math.round(heal.cooldownSeconds / STEP));
	const superSteps = Math.max(1, Math.round(config.durationSeconds / STEP));
	const tickSteps = Math.max(1, Math.round(config.tickSeconds / STEP));
	let healLeft = 0;
	let activeLeft = 0;
	let tickLeft = 0;
	let uses = 0;
	let chargeFrom = kills();
	let wasHeal = false;
	let wasSuper = false;

	const needed = (): number => config.baseKills + config.killsPerUse * uses;

	function castHeal(hero: number): void {
		const hp = Health.hp[hero] ?? 0;
		const max = Health.max[hero] ?? 0;
		// A full bar would waste the cooldown.
		if (healLeft > 0 || hp <= 0 || hp >= max) return;
		Health.hp[hero] = Math.min(max, hp + max * heal.healFraction);
		healLeft = healSteps;
		events.push(EventType.SpellCast, Position.x[hero] ?? 0, Position.z[hero] ?? 0, 0, SpellVfx.Heal);
	}

	function castSuper(): void {
		if (activeLeft > 0 || kills() - chargeFrom < needed()) return;
		uses++;
		chargeFrom = kills();
		activeLeft = superSteps;
		tickLeft = 0;
	}

	function tick(world: GameWorld, hero: number): void {
		const x = Position.x[hero] ?? 0;
		const z = Position.z[hero] ?? 0;
		const { radius } = deps.super;
		const amount = deps.super.damageBase + deps.super.damagePerRound * round();
		events.push(EventType.SpellCast, x, z, radius, SpellVfx.Super);
		const n = enemies.queryCircle(x, z, radius + 1, near);
		for (let i = 0; i < n; i++) {
			const e = near[i] ?? 0;
			if ((Health.hp[e] ?? 0) <= 0 || !isHittable(world, e)) continue;
			const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
			if (dist <= radius + (Radius.r[e] ?? 0)) queue.push(e, amount, hero, 0, 0, 0, DamageOrigin.Spell);
		}
	}

	return {
		run(world, hero, input): void {
			if (healLeft > 0) healLeft--;
			if (input.heal && !wasHeal) castHeal(hero);
			if (input.super && !wasSuper) castSuper();
			wasHeal = input.heal;
			wasSuper = input.super;
			if (activeLeft > 0) {
				activeLeft--;
				if (tickLeft <= 0) {
					tick(world, hero);
					tickLeft = tickSteps;
				}
				tickLeft--;
			}
		},
		onRoundStart(): void {
			healLeft = 0;
			activeLeft = 0;
			tickLeft = 0;
			uses = 0;
			chargeFrom = kills();
		},
		get healCooldown(): number {
			return healLeft * STEP;
		},
		get healCooldownMax(): number {
			return heal.cooldownSeconds;
		},
		get superKills(): number {
			return Math.min(needed(), Math.max(0, kills() - chargeFrom));
		},
		get superNeeded(): number {
			return needed();
		},
		get superActive(): number {
			return activeLeft * STEP;
		},
		get superUses(): number {
			return uses;
		},
	};
}
