import { type EventBuffer, EventType } from "../ecs/events";
import { type CardOffer, type CardRng, type CardsConfig, drawCards } from "../rules/cards";
import type { Progress } from "./loot";
import type { RunSystem } from "./round";
import type { StatsSystem } from "./stats";

export interface LevelUpDeps {
	progress: Progress;
	run: RunSystem;
	cards: CardsConfig;
	/** The `cards` RNG stream. */
	rng: CardRng;
	stats: StatsSystem;
	events: EventBuffer;
}

export interface LevelUpSystem {
	/** The three cards on screen, or null. While set, the run is paused. */
	readonly offer: readonly CardOffer[] | null;
	run(): void;
	/** Applies card `index` of the current offer. Returns false when there is no such card. */
	choose(index: number): boolean;
}

/** GDD 16: a level-up pauses the round and offers 3 cards; with several pending they come one after another. */
export function createLevelUpSystem(deps: LevelUpDeps): LevelUpSystem {
	const { progress, run, cards, rng, stats, events } = deps;
	let offer: CardOffer[] | null = null;

	function present(): void {
		offer = drawCards(rng, cards, progress.level);
		events.push(EventType.LevelUp, progress.level, 0, 0, 0);
	}

	return {
		get offer(): readonly CardOffer[] | null {
			return offer;
		},
		run(): void {
			if (offer !== null || progress.pendingLevelUps <= 0) return;
			if (run.state !== "Round" && run.state !== "BossRound") return;
			run.pause();
			present();
		},
		choose(index: number): boolean {
			const picked = offer?.[index];
			if (!picked) return false;
			stats.add(picked.modifiers);
			progress.pendingLevelUps--;
			offer = null;
			if (progress.pendingLevelUps > 0) present();
			else run.resume();
			return true;
		},
	};
}
