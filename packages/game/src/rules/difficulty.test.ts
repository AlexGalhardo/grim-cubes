import { mulberry32 } from "@gc/core";
import { expect, test } from "vitest";
import { bossesData, enemiesData, roundsData, toEnemyDefs } from "../data";
import { ContactDamage, Health } from "../ecs/components";
import { createGameWorld } from "../ecs/world";
import { bossMaxHp } from "../systems/boss";
import { createSpawnSystem } from "../systems/spawn";
import { chooseDifficulty, difficultyData, isUnlocked, parseSeed } from "./difficulty";

const list = roundsData.difficulties;
const records = (normal: number, grim: number) => ({ normal, grim, nightmare: 0 });

test("Grim is x1.25 and Nightmare x1.5 on enemy HP and damage, with soul multipliers 1.5 and 2", () => {
	const hpAt = (id: "normal" | "grim" | "nightmare"): { hp: number; dmg: number } => {
		const world = createGameWorld();
		const spawn = createSpawnSystem({
			config: roundsData.spawn,
			enemies: toEnemyDefs(enemiesData),
			rng: mulberry32(1),
		});
		spawn.startRound(5, {
			pool: [{ type: 0, weight: 1 }],
			difficultyMult: difficultyData(list, id).hpDamageMult,
		});
		const e = spawn.spawnEnemy(world, 0, 5, 0);
		return { hp: Health.max[e] ?? 0, dmg: ContactDamage.value[e] ?? 0 };
	};
	const normal = hpAt("normal");
	expect(hpAt("grim").hp).toBeCloseTo(normal.hp * 1.25);
	expect(hpAt("grim").dmg).toBeCloseTo(normal.dmg * 1.25);
	expect(hpAt("nightmare").hp).toBeCloseTo(normal.hp * 1.5);
	expect(difficultyData(list, "grim").soulsMult).toBe(1.5);
	expect(difficultyData(list, "nightmare").soulsMult).toBe(2);
});

test("the boss HP scales with the difficulty too", () => {
	const def = bossesData[0];
	if (!def) throw new Error("no boss");
	expect(bossMaxHp(def, roundsData.boss, def.round, 1.25)).toBeCloseTo(
		bossMaxHp(def, roundsData.boss, def.round, 1) * 1.25,
	);
});

test("Grim needs a Normal record of 20 and Nightmare a Grim record of 20", () => {
	const grim = difficultyData(list, "grim");
	const nightmare = difficultyData(list, "nightmare");
	expect(isUnlocked(grim, records(19, 0))).toBe(false);
	expect(isUnlocked(grim, records(20, 0))).toBe(true);
	expect(isUnlocked(nightmare, records(50, 19))).toBe(false);
	expect(isUnlocked(nightmare, records(20, 20))).toBe(true);
	expect(chooseDifficulty(list, "nightmare", records(50, 0))).toBe("normal");
	expect(chooseDifficulty(list, "grim", records(20, 0))).toBe("grim");
	expect(chooseDifficulty(list, "bogus", records(20, 20))).toBe("normal");
	expect(chooseDifficulty(list, null, records(20, 20))).toBe("normal");
});

test("a typed seed is repeatable; numbers are used as they are and words are hashed", () => {
	expect(parseSeed("")).toBeNull();
	expect(parseSeed("  ")).toBeNull();
	expect(parseSeed("42")).toBe(42);
	expect(parseSeed(" 42 ")).toBe(42);
	expect(parseSeed("grim")).toBe(parseSeed("grim"));
	expect(parseSeed("grim")).not.toBe(parseSeed("grin"));
	expect(parseSeed("99999999999")).toBe(parseSeed("99999999999"));
	const word = parseSeed("coveiro");
	expect(Number.isInteger(word) && (word ?? -1) >= 0 && (word ?? 2 ** 33) <= 0xffffffff).toBe(true);
});
