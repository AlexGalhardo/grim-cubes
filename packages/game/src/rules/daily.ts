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

/** The hero of the day, picked from all of them (locked or not: the challenge is the same for every player). */
export function dailyHero(date: string, heroes: readonly HeroDef[]): string {
	const hero = heroes[hash(date, HERO_SALT) % heroes.length];
	if (!hero) throw new Error("data/heroes.json is empty");
	return hero.id;
}
