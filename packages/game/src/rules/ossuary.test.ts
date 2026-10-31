import { createMetaState } from "@gc/core";
import { expect, test } from "vitest";
import { ossuaryData } from "../data";
import { applyOssuary, buyNode, findNode, nodeState, resetOssuary, totalCost } from "./ossuary";

const metaWith = (souls: number) => ({ ...createMetaState(), souls });

test("the tree has 5 branches of 6 nodes and costs 10,250 souls in total", () => {
	expect(ossuaryData.branches).toHaveLength(5);
	for (const branch of ossuaryData.branches) {
		expect(branch.nodes.map((n) => n.cost)).toEqual([50, 100, 200, 350, 550, 800]);
	}
	expect(totalCost(ossuaryData)).toBe(10_250);
});

test("a node needs the previous one and enough souls", () => {
	const meta = metaWith(60);
	expect(buyNode(ossuaryData, meta, "flesh_2", false)).toEqual({ ok: false, reason: "requires" });
	expect(buyNode(ossuaryData, meta, "flesh_1", false)).toEqual({ ok: true });
	expect(meta.souls).toBe(10);
	expect(meta.ossuary.flesh_1).toBe(true);
	expect(buyNode(ossuaryData, meta, "flesh_2", false)).toEqual({ ok: false, reason: "souls" });
	expect(buyNode(ossuaryData, meta, "flesh_1", false)).toEqual({ ok: false, reason: "owned" });
	expect(buyNode(ossuaryData, meta, "nope", false)).toEqual({ ok: false, reason: "unknown" });
	expect(meta.souls).toBe(10);
});

test("the demo sells only the first two nodes of each branch", () => {
	const meta = metaWith(10_000);
	for (const branch of ossuaryData.branches) {
		for (const node of branch.nodes) {
			const result = buyNode(ossuaryData, meta, node.id, true);
			expect(result.ok, node.id).toBe(node.index <= ossuaryData.demoMaxNodeIndex);
		}
	}
	const third = findNode(ossuaryData, "flesh_3");
	expect(third && nodeState(ossuaryData, meta, third, true)).toBe("demo");
});

test("reset gives back 100% of the souls spent and clears the tree", () => {
	const meta = metaWith(10_250);
	for (const branch of ossuaryData.branches) {
		for (const n of branch.nodes) buyNode(ossuaryData, meta, n.id, false);
	}
	expect(meta.souls).toBe(0);
	expect(Object.keys(meta.ossuary)).toHaveLength(30);
	expect(resetOssuary(ossuaryData, meta)).toBe(10_250);
	expect(meta.souls).toBe(10_250);
	expect(meta.ossuary).toEqual({});
	expect(resetOssuary(ossuaryData, meta)).toBe(0);
});

test("owned nodes become run modifiers and flags", () => {
	const meta = metaWith(0);
	meta.ossuary = { flesh_1: true, steel_6: true, gold_6: true, ruin_1: true, shadow_2: true };
	const bonus = applyOssuary(ossuaryData, meta);
	expect(bonus.modifiers).toContainEqual({ stat: "max_hp", op: "add", value: 10 });
	expect(bonus.critMult).toBe(2.3);
	expect(bonus.startGold).toBe(30);
	expect(bonus.soulGain).toBeCloseTo(0.1);
	expect(bonus.dashUnlocked).toBe(true);
	expect(applyOssuary(ossuaryData, metaWith(0)).modifiers).toEqual([]);
});

test("every effect id in the tree is understood", () => {
	const meta = metaWith(0);
	for (const branch of ossuaryData.branches) {
		for (const n of branch.nodes) meta.ossuary[n.id] = true;
	}
	expect(() => applyOssuary(ossuaryData, meta)).not.toThrow();
});
