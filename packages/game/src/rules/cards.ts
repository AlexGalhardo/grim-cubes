import type { Modifier } from "./stats";

export interface CardData {
	id: string;
	name: string;
	modifiers: readonly Modifier[];
}

export interface CardsConfig {
	doubleCard: { minLevel: number; chance: number; bonuses: number };
	cards: readonly CardData[];
}

export interface CardOffer {
	/** Joined ids; stable key for the UI. */
	id: string;
	name: string;
	modifiers: Modifier[];
	double: boolean;
}

export interface CardRng {
	int(n: number): number;
	chance(p: number): boolean;
}

/** Fisher-Yates prefix: `count` distinct indices out of `n`. */
function pickDistinct(rng: CardRng, n: number, count: number): number[] {
	const pool = Array.from({ length: n }, (_, i) => i);
	const out: number[] = [];
	for (let i = 0; i < Math.min(count, n); i++) {
		const j = i + rng.int(n - i);
		const picked = pool[j] as number;
		pool[j] = pool[i] as number;
		pool[i] = picked;
		out.push(picked);
	}
	return out;
}

/**
 * GDD 16.2: 3 distinct stat cards, equal weight. From `doubleCard.minLevel` each slot has `chance` to be a
 * double card: `bonuses` different cards merged at half value each.
 */
export function drawCards(rng: CardRng, config: CardsConfig, level: number, count = 3): CardOffer[] {
	const picks = pickDistinct(rng, config.cards.length, count);
	const spare = pickDistinct(rng, config.cards.length, config.cards.length);
	let spareAt = 0;
	return picks.map((index) => {
		const card = config.cards[index] as CardData;
		const makeDouble = level >= config.doubleCard.minLevel && rng.chance(config.doubleCard.chance);
		if (!makeDouble || config.doubleCard.bonuses < 2) {
			return {
				id: card.id,
				name: card.name,
				modifiers: card.modifiers.map((m) => ({ ...m })),
				double: false,
			};
		}
		const parts: CardData[] = [card];
		while (parts.length < config.doubleCard.bonuses && spareAt < spare.length) {
			const other = config.cards[spare[spareAt++] as number] as CardData;
			if (!parts.includes(other)) parts.push(other);
		}
		return {
			id: parts.map((p) => p.id).join("+"),
			name: parts.map((p) => p.name).join(" / "),
			modifiers: parts.flatMap((p) =>
				p.modifiers.map((m) => ({ ...m, value: m.value / parts.length })),
			),
			double: true,
		};
	});
}
