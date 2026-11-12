import type { IconRef } from "../Icon/Icon";

/** The weapon in hand. */
export interface HudWeapon {
	id: string;
	name: string;
	/** 1-4: the tier pips lit on the weapon frame. */
	tier: number;
	/** Weapon icon from the atlas; the frame falls back to a glyph while the assets load. */
	icon?: IconRef | undefined;
}
