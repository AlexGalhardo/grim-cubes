import { applyRun, createMetaState, DAILY_HISTORY_DAYS, type RunResult } from "@gc/core";
import { expect, test } from "vitest";
import { heroesData, milestonesData } from "../data";
import { dailyHero, dailySeed, utcDate } from "./daily";
import { heroUnlocked } from "./heroes";

const all = (): boolean => true;
const only =
	(...ids: string[]) =>
	(id: string): boolean =>
		ids.includes(id);

test("the same date gives the same seed and the same hero; another date gives another seed", () => {
	expect(dailySeed("2026-11-11")).toBe(dailySeed("2026-11-11"));
	expect(dailyHero("2026-11-11", heroesData, all)).toBe(dailyHero("2026-11-11", heroesData, all));
	expect(dailySeed("2026-11-12")).not.toBe(dailySeed("2026-11-11"));
	expect(Number.isInteger(dailySeed("2026-11-11"))).toBe(true);
	expect(dailySeed("2026-11-11")).toBeGreaterThanOrEqual(0);
	expect(dailySeed("2026-11-11")).toBeLessThan(2 ** 32);
});

test("a month of days uses every unlocked class and never a locked one", () => {
	const month = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
	expect(new Set(month.map((d) => dailyHero(d, heroesData, all)))).toEqual(
		new Set(heroesData.map((h) => h.id)),
	);
	const first = heroesData[0]?.id ?? "";
	expect(new Set(month.map((d) => dailyHero(d, heroesData, only(first))))).toEqual(new Set([first]));
	const two = heroesData.slice(0, 2).map((h) => h.id);
	expect(new Set(month.map((d) => dailyHero(d, heroesData, only(...two))))).toEqual(new Set(two));
});

test("the class of the day follows what the account unlocked, and falls back to the first hero when nothing is open", () => {
	const meta = createMetaState();
	const open = (id: string): boolean => heroUnlocked(milestonesData, meta, id);
	const gated = heroesData.filter((h) => !open(h.id));
	expect(gated.length).toBeGreaterThan(0);
	for (let day = 1; day <= 30; day++) {
		const hero = dailyHero(`2026-12-${String(day).padStart(2, "0")}`, heroesData, open);
		expect(gated.map((h) => h.id)).not.toContain(hero);
	}
	expect(dailyHero("2026-12-01", heroesData, () => false)).toBe(heroesData[0]?.id);
});

test("the challenge day is the UTC date, whatever the local time zone", () => {
	expect(utcDate(new Date("2026-11-11T23:59:59Z"))).toBe("2026-11-11");
	expect(utcDate(new Date("2026-11-12T00:00:00Z"))).toBe("2026-11-12");
	expect(utcDate(new Date("2026-11-11T22:00:00-05:00"))).toBe("2026-11-12");
});

const result = (date: string, round: number): RunResult => ({
	souls: 5,
	round,
	difficulty: "normal",
	kills: round * 10,
	bossKills: 0,
	elitesKilled: 0,
	bestBossRound: 0,
	daily: { date, seconds: round * 60 },
});

test("only the first attempt of a day scores; the second still counts for the account but not the table", () => {
	const meta = createMetaState();
	applyRun(meta, result("2026-11-11", 7));
	applyRun(meta, result("2026-11-11", 20));
	expect(meta.daily).toEqual([{ date: "2026-11-11", round: 7, seconds: 420, kills: 70 }]);
	expect(meta.stats.runs).toBe(2);
	expect(meta.records.normal).toBe(20);
});

test("the table keeps the latest 30 days, newest first", () => {
	const meta = createMetaState();
	for (let day = 1; day <= 31; day++)
		applyRun(meta, result(`2026-10-${String(day).padStart(2, "0")}`, day));
	expect(meta.daily).toHaveLength(DAILY_HISTORY_DAYS);
	expect(meta.daily[0]?.date).toBe("2026-10-31");
	expect(meta.daily.at(-1)?.date).toBe("2026-10-02");
	// A day played out of order lands in its place.
	applyRun(meta, result("2026-11-05", 3));
	expect(meta.daily[0]?.date).toBe("2026-11-05");
	expect(meta.daily).toHaveLength(DAILY_HISTORY_DAYS);
});

test("a run that is not the daily challenge adds no row", () => {
	const meta = createMetaState();
	const { daily: _daily, ...plain } = result("2026-11-11", 4);
	applyRun(meta, plain);
	expect(meta.daily).toEqual([]);
});
