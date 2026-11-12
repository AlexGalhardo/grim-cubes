import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { ossuaryData, spellsData } from "../data";
import {
	buildOssuaryTree,
	buyNode,
	findNode,
	nodeState,
	refundValue,
	resetOssuary,
	totalCost,
} from "./ossuary";
import { buildClassSpells, spellLevel, spellNodeId } from "./spells";

const tree = buildOssuaryTree(ossuaryData, spellsData);
const metaWith = (souls: number) => ({ ...createMetaState(), souls });
const levels = spellsData.levels.max;
const column = (spellId: string) => tree.filter((n) => n.spellId === spellId);

test("each class has 6 columns of 9 squares (levels 2 to 10), 162 squares in all", () => {
	expect(spellsData.classes).toHaveLength(3);
	expect(tree).toHaveLength(3 * 6 * (levels - 1));
	for (const cls of spellsData.classes) {
		for (const spell of cls.spells) {
			expect(column(spell.id).map((n) => n.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
		}
	}
	const perSpell = ossuaryData.levelCosts.reduce((a, b) => a + b, 0);
	expect(totalCost(tree)).toBe(perSpell * 18);
});

test("the squares of a column are linked: level 2 is free to reach, every other one needs the one below", () => {
	for (const node of tree) {
		expect(node.requires).toBe(node.level === 2 ? null : spellNodeId(node.spellId, node.level - 1));
	}
	expect(ossuaryData.levelCosts).toHaveLength(levels - 1);
	for (let i = 1; i < ossuaryData.levelCosts.length; i++)
		expect(ossuaryData.levelCosts[i]).toBeGreaterThan(ossuaryData.levelCosts[i - 1] ?? 0);
});

test("a square needs the one below and enough souls", () => {
	const spell = "warrior_shockwave";
	const meta = metaWith(ossuaryData.levelCosts[0] ?? 0);
	expect(buyNode(tree, meta, spellNodeId(spell, 3), false)).toEqual({ ok: false, reason: "requires" });
	expect(buyNode(tree, meta, spellNodeId(spell, 2), false)).toEqual({ ok: true });
	expect(meta.souls).toBe(0);
	expect(meta.ossuary[spellNodeId(spell, 2)]).toBe(true);
	expect(buyNode(tree, meta, spellNodeId(spell, 3), false)).toEqual({ ok: false, reason: "souls" });
	expect(buyNode(tree, meta, spellNodeId(spell, 2), false)).toEqual({ ok: false, reason: "owned" });
	expect(buyNode(tree, meta, "nope", false)).toEqual({ ok: false, reason: "unknown" });
	expect(meta.souls).toBe(0);
});

test("buying squares raises the spell level the session reads, one level per square", () => {
	const spell = "mage_nova";
	const meta = metaWith(10_000);
	const levelOf = (): number => spellLevel(meta.ossuary, spell, levels);
	expect(levelOf()).toBe(1);
	for (let level = 2; level <= levels; level++) {
		expect(buyNode(tree, meta, spellNodeId(spell, level), false)).toEqual({ ok: true });
		expect(levelOf()).toBe(level);
	}
	const built = buildClassSpells(spellsData, "mage", (id) => spellLevel(meta.ossuary, id, levels));
	const base = buildClassSpells(spellsData, "mage", () => 1);
	// Only the bought spell grew; the others of the class stay at level 1.
	expect(built.auto[2]?.damageBase).toBeGreaterThan(base.auto[2]?.damageBase ?? 0);
	expect(built.auto[0]?.damageBase).toBe(base.auto[0]?.damageBase);
});

test("the demo sells only the squares up to its spell level", () => {
	const meta = metaWith(100_000);
	for (const node of column("ranged_volley")) {
		const result = buyNode(tree, meta, node.id, true);
		expect(result.ok, node.id).toBe(node.level <= ossuaryData.demoMaxLevel);
	}
	const beyond = findNode(tree, spellNodeId("ranged_volley", ossuaryData.demoMaxLevel + 1));
	expect(beyond && nodeState(meta, beyond, true)).toBe("demo");
	expect(beyond && nodeState(meta, beyond, false)).toBe("available");
});

test("reset gives back 100% of the souls spent and clears the tree", () => {
	const total = totalCost(tree);
	const meta = metaWith(total);
	for (const node of tree) buyNode(tree, meta, node.id, false);
	expect(meta.souls).toBe(0);
	expect(Object.keys(meta.ossuary)).toHaveLength(tree.length);
	expect(refundValue(tree, meta)).toBe(total);
	expect(resetOssuary(tree, meta)).toBe(total);
	expect(meta.souls).toBe(total);
	expect(meta.ossuary).toEqual({});
	expect(resetOssuary(tree, meta)).toBe(0);
});
