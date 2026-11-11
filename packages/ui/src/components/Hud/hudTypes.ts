import type { IconRef } from "../Icon/Icon";

/** One kind of item the hero carries, with how many (GDD 21.2: items grouped with a counter). */
export interface HudItem {
	id: string;
	name: string;
	/** 1-5, the rarity of the item. */
	tier: number;
	count: number;
	icon?: IconRef | undefined;
}

/** The weapon in hand. */
export interface HudWeapon {
	id: string;
	name: string;
	/** 1-4: the tier pips lit on the weapon frame. */
	tier: number;
	/** Weapon icon from the atlas; the frame falls back to a glyph while the assets load. */
	icon?: IconRef | undefined;
}

/** Progress on one item tag (GDD 15.5): the HUD and the shop list the tags the hero has at least one item of. */
export interface SynergyView {
	id: string;
	name: string;
	/** Distinct owned items with the tag. */
	count: number;
	/** Tiers active now. */
	reached: number;
	/** Count of the next tier; null when every tier is active. */
	nextAt: number | null;
}
