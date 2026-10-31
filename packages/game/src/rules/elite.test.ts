import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { elitesData } from "../data";
import { createEliteRoller, eliteStats } from "./elite";

test("the raw roll hits the configured 20% over 10,000 rounds (19% to 21%)", () => {
	const rng = mulberry32(21);
	let hits = 0;
	for (let i = 0; i < 10_000; i++) if (rng.chance(elitesData.chance)) hits++;
	expect(hits / 10_000).toBeGreaterThan(0.19);
	expect(hits / 10_000).toBeLessThan(0.21);
});

test("round 1 never has an elite and 6 common rounds never pass without one", () => {
	for (let seed = 1; seed <= 20; seed++) {
		const roller = createEliteRoller(mulberry32(seed), elitesData);
		expect(roller.next(1, false)).toBe(false);
		let dry = 1;
		let elites = 0;
		let rounds = 1;
		for (let round = 2; round <= 500; round++) {
			if (round % 10 === 0) {
				expect(roller.next(round, true)).toBe(false);
				continue;
			}
			rounds++;
			if (roller.next(round, false)) {
				elites++;
				dry = 0;
			} else {
				dry++;
				expect(dry).toBeLessThanOrEqual(elitesData.pityRounds);
			}
		}
		expect(elites / rounds).toBeGreaterThan(0.2);
	}
});

test("with pity the long-run rate matches the analytic value near 27%", () => {
	const roller = createEliteRoller(mulberry32(5), elitesData);
	let elites = 0;
	const rounds = 10_000;
	for (let i = 0; i < rounds; i++) if (roller.next(i + 2, false)) elites++;
	// Mean gap = 1 + 0.8 + 0.8^2 + ... + 0.8^5 = 3.69 rounds.
	expect(Math.abs(elites / rounds - 1 / 3.6893)).toBeLessThan(0.015);
});

test("the four modifiers expose their numbers", () => {
	const [armored, swift, vampiric, explosive] = elitesData.modifiers.map((m) => eliteStats(m, 10));
	expect(armored).toMatchObject({ hpMult: 10, armorAdd: 20 });
	expect(swift).toMatchObject({ hpMult: 8, speedMult: 1.6 });
	expect(vampiric).toMatchObject({ hpMult: 10, lifesteal: 0.1 });
	expect(explosive?.explosion).toEqual({ radius: 3, damage: 15 + 2 * 10 });
	expect(elitesData.scale).toBe(1.6);
});
