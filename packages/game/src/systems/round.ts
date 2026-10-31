import { removeEntity } from "bitecs";
import { EnemyFaction, Fragment } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { dropFragment } from "../ecs/fragments";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { SpawnSystem, SpawnWeight } from "./spawn";

export type RunState =
	| "Idle"
	| "RoundIntro"
	| "Round"
	| "BossIntro"
	| "BossRound"
	| "RoundOutro"
	| "Shop"
	| "Paused"
	| "Dying"
	| "Results";

/** Slices of `data/rounds.json`. */
export interface RunConfig {
	flow: { introSeconds: number; outroSeconds: number; bossIntroSeconds: number; dyingSeconds: number };
	duration: {
		firstRoundSeconds: number;
		stepSeconds: number;
		stepUntilRound: number;
		maxSeconds: number;
		bossEveryRounds: number;
	};
	boss: { remainingHordeFraction: number; hordeIntervalMult: number };
}

export interface RunSystemDeps {
	config: RunConfig;
	spawn: SpawnSystem;
	events: EventBuffer;
	poolFor: (round: number) => readonly SpawnWeight[];
	difficultyMult: number;
	/** Called once at the end of every round, after enemies and floor piles were handled (e.g. harvest). */
	onRoundEnd?: (round: number) => void;
	/** Called when combat begins (after the intro), with whether it is a boss round. */
	onRoundStart?: (round: number, boss: boolean) => void;
}

/** Fragments left on the floor at round end; released one per spawn in the next round, never lost. */
export interface Bag {
	value: number;
}

export interface RunSystem {
	readonly state: RunState;
	readonly round: number;
	/** Steps left in the current timed state (intro, round, outro, dying). */
	readonly ticksLeft: number;
	readonly bag: Bag;
	newRun(): void;
	closeShop(): void;
	/** Ends the current combat round now (used by the debug API and tests); no-op outside a round. */
	forceEnd(world: GameWorld): void;
	pause(): void;
	resume(): void;
	bossDied(): void;
	heroDied(): void;
	/** Wire as `onSpawn` of the spawn system: each new enemy frees one fragment from the bag. */
	releaseFromBag(world: GameWorld, x: number, z: number): void;
	run(world: GameWorld, hero: number): void;
}

export const isBossRound = (config: RunConfig, round: number): boolean =>
	config.duration.bossEveryRounds > 0 && round % config.duration.bossEveryRounds === 0;

/** GDD 13.1: 20 s, +5 s per round up to `stepUntilRound`, then `maxSeconds`. Boss rounds have no timer. */
export function roundDurationSeconds(config: RunConfig, round: number): number {
	const d = config.duration;
	return round > d.stepUntilRound
		? d.maxSeconds
		: Math.min(d.maxSeconds, d.firstRoundSeconds + d.stepSeconds * (round - 1));
}

const toSteps = (seconds: number): number => Math.max(1, Math.round(seconds / STEP));

export function createRunSystem(deps: RunSystemDeps): RunSystem {
	const { config, spawn, events, poolFor, difficultyMult, onRoundEnd, onRoundStart } = deps;
	const bag: Bag = { value: 0 };
	const enemies = createQueryCache([EnemyFaction]);
	const fragments = createQueryCache([Fragment]);
	const scratch = new Uint16Array(4096);
	let state: RunState = "Idle";
	let resumeState: RunState = "Round";
	let round = 1;
	let ticks = 0;
	let bossKilled = false;

	function enter(next: RunState, seconds = 0): void {
		state = next;
		ticks = seconds > 0 ? toSteps(seconds) : 0;
	}

	function startCombat(): void {
		const boss = isBossRound(config, round);
		spawn.startRound(round, {
			pool: poolFor(round),
			difficultyMult,
			totalScale: boss ? config.boss.remainingHordeFraction : 1,
			intervalScale: boss ? config.boss.hordeIntervalMult : 1,
		});
		events.push(EventType.RoundStarted, round, 0, 0, 0);
		onRoundStart?.(round, boss);
		if (boss) enter("BossRound");
		else enter("Round", roundDurationSeconds(config, round));
	}

	function startIntro(): void {
		if (isBossRound(config, round)) enter("BossIntro", config.flow.bossIntroSeconds);
		else enter("RoundIntro", config.flow.introSeconds);
	}

	function endCombat(world: GameWorld): void {
		const live = enemies(world);
		const count = Math.min(live.length, scratch.length);
		for (let i = 0; i < count; i++) scratch[i] = live[i] ?? 0;
		for (let i = 0; i < count; i++) {
			const e = scratch[i] ?? 0;
			events.push(EventType.Died, 0, 1, 0, e);
			removeEntity(world, e);
		}
		const piles = fragments(world);
		const pileCount = Math.min(piles.length, scratch.length);
		for (let i = 0; i < pileCount; i++) scratch[i] = piles[i] ?? 0;
		for (let i = 0; i < pileCount; i++) {
			const e = scratch[i] ?? 0;
			bag.value += Fragment.value[e] ?? 0;
			removeEntity(world, e);
		}
		events.push(EventType.RoundEnded, round, 0, 0, 0);
		onRoundEnd?.(round);
		enter("RoundOutro", config.flow.outroSeconds);
	}

	return {
		get state(): RunState {
			return state;
		},
		get round(): number {
			return round;
		},
		get ticksLeft(): number {
			return ticks;
		},
		bag,
		newRun(): void {
			if (state !== "Idle" && state !== "Results") return;
			round = 1;
			bag.value = 0;
			startIntro();
		},
		closeShop(): void {
			if (state !== "Shop") return;
			round++;
			startIntro();
		},
		forceEnd(world: GameWorld): void {
			if (state === "Round" || state === "BossRound") endCombat(world);
		},
		pause(): void {
			if (state !== "Round" && state !== "BossRound") return;
			resumeState = state;
			state = "Paused";
		},
		resume(): void {
			if (state === "Paused") state = resumeState;
		},
		bossDied(): void {
			if (state === "BossRound") bossKilled = true;
		},
		heroDied(): void {
			if (state === "Idle" || state === "Dying" || state === "Results" || state === "Shop") return;
			enter("Dying", config.flow.dyingSeconds);
		},
		releaseFromBag(world: GameWorld, x: number, z: number): void {
			if (bag.value <= 0) return;
			bag.value -= 1;
			dropFragment(world, x, z, 1);
		},
		run(world: GameWorld, hero: number): void {
			switch (state) {
				case "RoundIntro":
				case "BossIntro":
					if (--ticks <= 0) startCombat();
					break;
				case "Round":
					spawn.run(world, hero);
					if (--ticks <= 0) endCombat(world);
					break;
				case "BossRound":
					spawn.run(world, hero);
					if (bossKilled) {
						bossKilled = false;
						endCombat(world);
					}
					break;
				case "RoundOutro":
					if (--ticks <= 0) enter("Shop");
					break;
				case "Dying":
					if (--ticks <= 0) enter("Results");
					break;
				default:
					break;
			}
		},
	};
}
