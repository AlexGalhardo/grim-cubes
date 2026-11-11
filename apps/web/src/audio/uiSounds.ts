interface Offer {
	id: string;
	rarity: number;
}

/**
 * The part of the published HUD state the UI sounds react to, kept structural so `HudState` fits it as is and a
 * test builds one in a line. Screens only matter by being open (non-null).
 */
export interface UiSoundState {
	cards: readonly Offer[];
	chest: readonly Offer[];
	shop: { slots: readonly { kind: string; id: string; tier: number; sold: boolean }[] } | null;
	results: { souls: number } | null;
	ossuary: { branches: readonly { nodes: readonly { state: string }[] }[] } | null;
	menu: object | null;
	slots: object | null;
	difficulty: object | null;
	heroes: object | null;
	daily: object | null;
	options: object | null;
	pause: object | null;
	demoEnd: boolean;
	secondsLeft: number;
	synergies: readonly { id: string; reached: number }[];
}

/** Rarity 2 to 5 (Rare, Epic, Legendary, Mythic); Normal reveals in silence. */
const RARITY_SFX: Readonly<Record<number, string>> = {
	2: "sfx_ui_rarity_rare",
	3: "sfx_ui_rarity_epic",
	4: "sfx_ui_rarity_legendary",
	5: "sfx_ui_rarity_mythic",
};

/** The countdown ticks once per second over the last five seconds of a round. */
const TICK_FROM_SECONDS = 5;

/** Which full screen is up; the order is the stacking order of the App (an overlay above wins). */
export function screenOf(s: UiSoundState): string {
	if (s.options) return "options";
	if (s.pause) return "pause";
	if (s.results) return "results";
	if (s.demoEnd) return "demoEnd";
	if (s.ossuary) return "ossuary";
	if (s.heroes) return "heroes";
	if (s.daily) return "daily";
	if (s.difficulty) return "difficulty";
	if (s.slots) return "slots";
	if (s.menu) return "menu";
	if (s.cards.length > 0) return "levelup";
	if (s.chest.length > 0) return "chest";
	if (s.shop) return "shop";
	return "run";
}

const offerKey = (offers: readonly { id: string }[]): string => offers.map((o) => o.id).join("|");

function bestRarity(offers: readonly { rarity: number }[]): string | null {
	let best = 0;
	for (const offer of offers) if (offer.rarity > best) best = offer.rarity;
	return RARITY_SFX[best] ?? null;
}

const ownedNodes = (s: UiSoundState): number =>
	s.ossuary?.branches.reduce((n, b) => n + b.nodes.filter((node) => node.state === "owned").length, 0) ?? 0;

/**
 * The UI sounds a change of the published HUD state calls for (S-10-01), in play order. Pure, so each event is
 * tested without an audio engine; button clicks, hover, buy and reroll stay on their DOM and shop handlers.
 */
export function uiSounds(prev: UiSoundState, next: UiSoundState): string[] {
	const out: string[] = [];
	const from = screenOf(prev);
	const to = screenOf(next);

	if (prev.cards.length === 0 && next.cards.length > 0) out.push("sfx_ui_levelup_open");
	else if (prev.cards.length > 0 && next.cards.length === 0) out.push("sfx_ui_card");
	if (next.cards.length > 0 && offerKey(prev.cards) !== offerKey(next.cards)) {
		const reveal = bestRarity(next.cards);
		if (reveal) out.push(reveal);
	}
	if (next.chest.length > 0 && offerKey(prev.chest) !== offerKey(next.chest)) {
		const reveal = bestRarity(next.chest);
		if (reveal) out.push(reveal);
	}
	if (next.shop) {
		// Sold slots stay in the key, so a purchase does not count as a new reveal.
		const items = next.shop.slots.filter((slot) => slot.kind === "item");
		const before = prev.shop?.slots.filter((slot) => slot.kind === "item") ?? [];
		if (offerKey(items) !== offerKey(before)) {
			const reveal = bestRarity(
				items.filter((slot) => !slot.sold).map((slot) => ({ rarity: slot.tier })),
			);
			if (reveal) out.push(reveal);
		}
	}

	if (to !== from) {
		if (from === "heroes" && to === "difficulty") {
			out.push("sfx_ui_hero_select");
		} else if (to === "results") {
			out.push("sfx_ui_results");
			if ((next.results?.souls ?? 0) > 0) out.push("sfx_ui_souls");
		} else if (
			to !== "levelup" &&
			to !== "chest" &&
			to !== "run" &&
			from !== "levelup" &&
			from !== "chest"
		) {
			out.push("sfx_ui_transition");
		}
	}

	// A tag that was already listed gaining a tier; a restored run lists tags with tiers at once and stays silent.
	if (
		next.synergies.some((s) => {
			const before = prev.synergies.find((p) => p.id === s.id);
			return before !== undefined && s.reached > before.reached;
		})
	)
		out.push("sfx_ui_synergy");

	if (prev.ossuary && next.ossuary && ownedNodes(next) > ownedNodes(prev)) out.push("sfx_ui_unlock");

	if (
		to === "run" &&
		next.secondsLeft > 0 &&
		next.secondsLeft <= TICK_FROM_SECONDS &&
		next.secondsLeft < prev.secondsLeft
	)
		out.push("sfx_ui_timer_tick");

	return out;
}
