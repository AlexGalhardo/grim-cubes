import { murmur3x86_32 } from "@gc/core";
import type { HeroDef } from "../data/types";

const SEED_SALT = 0x44414c59;
const HERO_SALT = 0x4845524f;

const hash = (date: string, salt: number): number =>
	murmur3x86_32(new TextEncoder().encode(date), salt) >>> 0;

/** The UTC calendar day of `now` as `YYYY-MM-DD`: the day of the daily challenge changes at 00:00 UTC for everyone. */
export function utcDate(now: Date): string {
	return now.toISOString().slice(0, 10);
}

/** The seed of the daily challenge of `date`: the same text always gives the same run. */
export function dailySeed(date: string): number {
	return hash(date, SEED_SALT);
}

/**
 * The class of the day (ADR-0030), drawn from the ones the player has unlocked: a player with only the Warrior always
 * gets the Warrior. The same date and the same unlocked set give the same class.
 */
export function dailyHero(
	date: string,
	heroes: readonly HeroDef[],
	unlocked: (id: string) => boolean,
): string {
	const open = heroes.filter((h) => unlocked(h.id));
	const pool = open.length > 0 ? open : heroes.slice(0, 1);
	const hero = pool[hash(date, HERO_SALT) % pool.length];
	if (!hero) throw new Error("data/heroes.json is empty");
	return hero.id;
}
