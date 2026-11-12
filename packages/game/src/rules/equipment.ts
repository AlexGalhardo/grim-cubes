import type { Modifier } from "./stats";

export interface EquipmentLevel {
	level: number;
	/** Gold price before the round and shop-price scaling; absent for the levels bought with materials. */
	price?: number | undefined;
	/** The whole bonus of the slot at this level (not a delta over the level below). */
	modifiers: readonly Modifier[];
}

export interface EquipmentSlot {
	id: string;
	name: string;
	/** Levels 1 to 10, in order. */
	levels: readonly EquipmentLevel[];
}

/** Materials that take a slot to `level` once the gold levels are done. */
export interface EquipmentUpgrade {
	level: number;
	/** Elite fragments. */
	fragments?: number | undefined;
	/** Boss relics. */
	relics?: number | undefined;
}

/** `data/equipment.json`. */
export interface EquipmentData {
	/** Highest level the shop sells for gold. */
	goldMaxLevel: number;
	upgrades: readonly EquipmentUpgrade[];
	slots: readonly EquipmentSlot[];
}

export const MAX_EQUIPMENT_LEVEL = 10;

/** The rarity tier (1 to 5) an equipment level is drawn with. */
export const levelTier = (level: number): number => Math.min(5, Math.max(1, Math.ceil(level / 2)));

/** Modifiers of every equipped slot; `levels[i]` is the level of `data.slots[i]`, 0 for an empty slot. */
export function equipmentModifiers(data: EquipmentData, levels: readonly number[]): Modifier[] {
	const out: Modifier[] = [];
	data.slots.forEach((slot, i) => {
		const level = levels[i] ?? 0;
		if (level > 0) out.push(...(slot.levels[level - 1]?.modifiers ?? []));
	});
	return out;
}
