import { expect, test } from "vitest";
import { heroesData, spellsData } from "../data";
import { buildClassSpells, spellLevel, spellNodeId } from "./spells";

test("every class has four automatic spells, a heal and a super, and the ids belong to the class", () => {
	expect(spellsData.classes.map((c) => c.id)).toEqual(heroesData.map((h) => h.id));
	for (const cls of spellsData.classes) {
		const built = buildClassSpells(spellsData, cls.id, () => 1);
		expect(built.auto).toHaveLength(4);
		expect(built.ids).toHaveLength(6);
		for (const id of built.ids) expect(id.startsWith(`${cls.id}_`)).toBe(true);
	}
});

test("the spell level is one above the highest Ossuary node owned, up to the maximum", () => {
	const id = "warrior_shockwave";
	expect(spellLevel({}, id, 10)).toBe(1);
	expect(spellLevel({ [spellNodeId(id, 2)]: true }, id, 10)).toBe(2);
	expect(spellLevel({ [spellNodeId(id, 2)]: true, [spellNodeId(id, 3)]: true }, id, 10)).toBe(3);
	expect(spellLevel({ [spellNodeId(id, 10)]: true }, id, 10)).toBe(10);
	expect(spellLevel({ [spellNodeId(id, 11)]: true, other_2: true }, id, 10)).toBe(1);
	expect(spellLevel({ [spellNodeId(id, 2)]: false }, id, 10)).toBe(1);
});

test("level 10 hits harder, casts sooner and heals more than level 1, by the per-level numbers", () => {
	const { damagePerLevel, cooldownPerLevel, healPerLevel } = spellsData.levels;
	const one = buildClassSpells(spellsData, "mage", () => 1);
	const ten = buildClassSpells(spellsData, "mage", () => 10);
	for (let i = 0; i < one.auto.length; i++) {
		const a = one.auto[i];
		const b = ten.auto[i];
		expect(b?.damageBase).toBeCloseTo((a?.damageBase ?? 0) * (1 + damagePerLevel * 9));
		expect(b?.interval).toBeCloseTo((a?.interval ?? 0) * (1 - cooldownPerLevel * 9));
	}
	expect(ten.heal.healFraction).toBeCloseTo(one.heal.healFraction * (1 + healPerLevel * 9));
	expect(ten.heal.cooldownSeconds).toBeLessThan(one.heal.cooldownSeconds);
	expect(ten.super.damageBase).toBeGreaterThan(one.super.damageBase);
	// Beyond the maximum the level stops growing.
	expect(buildClassSpells(spellsData, "mage", () => 99).super.damageBase).toBe(ten.super.damageBase);
});

test("an unknown class is refused", () => {
	expect(() => buildClassSpells(spellsData, "bard", () => 1)).toThrow("bard");
});
