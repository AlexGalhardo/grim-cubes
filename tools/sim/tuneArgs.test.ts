import { expect, it } from "vitest";
import { parseTuneArgs, TUNE_DEFAULTS } from "./tuneArgs";

it("keeps the defaults and parses numbers, lists, pattern overrides and rounds.json patches", () => {
	expect(parseTuneArgs([])).toEqual(TUNE_DEFAULTS);
	const parsed = parseTuneArgs([
		"--damage-base",
		"0.2",
		"--boss-hp",
		"4800,9000,10000",
		"--boss-mult",
		"1,2,2",
		"--pattern",
		"mud_pool.damageMult=2",
		"--rounds-data",
		'{"xp":{"base":8}}',
		"--runs",
		"8",
	]);
	expect(parsed.damageBase).toBe(0.2);
	expect(parsed.bossHp).toEqual([4800, 9000, 10000]);
	expect(parsed.bossMult).toEqual([1, 2, 2]);
	expect(parsed.patterns).toEqual([{ pattern: "mud_pool", param: "damageMult", value: 2 }]);
	expect(parsed.rounds_data).toEqual({ xp: { base: 8 } });
	expect(parsed.runs).toBe(8);
});

it("rejects typos instead of tuning nothing", () => {
	expect(() => parseTuneArgs(["--damage-bas", "1"])).toThrow(/unknown option/);
	expect(() => parseTuneArgs(["--runs", "many"])).toThrow(/needs a number/);
	expect(() => parseTuneArgs(["--pattern", "mud_pool"])).toThrow(/pattern\.param=value/);
	expect(() => parseTuneArgs(["--runs"])).toThrow();
});
