/** Rarity colours by tier 1-5 (Art Bible 3.3); the literal class names keep Tailwind's scanner happy. */
export const TIER_BORDER: Readonly<Record<number, string>> = {
	1: "border-rarity-1",
	2: "border-rarity-2",
	3: "border-rarity-3",
	4: "border-rarity-4",
	5: "border-rarity-5",
};

export const TIER_TEXT: Readonly<Record<number, string>> = {
	1: "text-rarity-1",
	2: "text-rarity-2",
	3: "text-rarity-3",
	4: "text-rarity-4",
	5: "text-rarity-5",
};

/** A riveted iron plate, the frame of every block of the shop and the level-up. */
export const PLATE =
	"panel-riveted border-2 border-iron-dark bg-linear-to-b from-iron-black to-night-2 shadow-[inset_0_1px_0_var(--color-iron),0_4px_10px_var(--color-night)]";
