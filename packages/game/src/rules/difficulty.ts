import { DIFFICULTIES, type Difficulty } from "@gc/core";
import type { DifficultyData } from "../data/types";

export type Records = Readonly<Record<Difficulty, number>>;

export function difficultyData(list: readonly DifficultyData[], id: Difficulty): DifficultyData {
	const found = list.find((d) => d.id === id);
	if (!found) throw new RangeError(`unknown difficulty "${id}"`);
	return found;
}

/** Grim opens with a Normal record of 20 and Nightmare with a Grim record of 20 (GDD 17). */
export function isUnlocked(def: DifficultyData, records: Records): boolean {
	if (!def.unlockedBy) return true;
	const needed = DIFFICULTIES.find((d) => d === def.unlockedBy?.difficulty);
	return needed !== undefined && records[needed] >= def.unlockedBy.round;
}

/** Reads a difficulty from a URL parameter; unknown or still locked values fall back to Normal. */
export function chooseDifficulty(
	list: readonly DifficultyData[],
	param: string | null,
	records: Records,
): Difficulty {
	const id = DIFFICULTIES.find((d) => d === param);
	const def = list.find((d) => d.id === id);
	return id && def && isUnlocked(def, records) ? id : "normal";
}

/**
 * Turns what the player typed into a run seed. Whole numbers are used as they are (so `?seed=42` and typing 42
 * agree); any other text is hashed (FNV-1a) so a word is a valid, repeatable seed. Empty input means "random".
 */
export function parseSeed(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	if (/^\d{1,10}$/.test(trimmed) && Number(trimmed) <= 0xffffffff) return Number(trimmed) >>> 0;
	let hash = 0x811c9dc5;
	for (let i = 0; i < trimmed.length; i++) {
		hash = Math.imul(hash ^ trimmed.charCodeAt(i), 0x01000193);
	}
	return hash >>> 0;
}
