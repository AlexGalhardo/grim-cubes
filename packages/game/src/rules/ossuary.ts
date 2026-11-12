import type { MetaState } from "@gc/core";
import type { OssuaryData, SpellsData } from "../data/types";
import { spellNodeId } from "./spells";

export type NodeState = "owned" | "available" | "locked" | "demo";

/** One square of the tree: the level `level` of one spell of one class. */
export interface OssuaryNode {
	id: string;
	classId: string;
	spellId: string;
	/** The spell level the square reaches, 2 to the maximum (level 1 is free). */
	level: number;
	cost: number;
	/** The square below it, or null for level 2. */
	requires: string | null;
	/** The demo does not sell it. */
	demoLocked: boolean;
}

/**
 * The Ossuary as a tree of linked squares per class (S-22-01): one column for each of the class's six spells and one
 * square per level from 2 up, each needing the one below. Built from `data/spells.json` and the prices in
 * `data/ossuary.json`, in class and spell order.
 */
export function buildOssuaryTree(data: OssuaryData, spells: SpellsData): OssuaryNode[] {
	const tree: OssuaryNode[] = [];
	for (const cls of spells.classes) {
		for (const spell of cls.spells) {
			for (let level = 2; level <= spells.levels.max; level++) {
				tree.push({
					id: spellNodeId(spell.id, level),
					classId: cls.id,
					spellId: spell.id,
					level,
					cost: data.levelCosts[level - 2] ?? Number.POSITIVE_INFINITY,
					requires: level === 2 ? null : spellNodeId(spell.id, level - 1),
					demoLocked: level > data.demoMaxLevel,
				});
			}
		}
	}
	return tree;
}

/** Total cost of every square of the tree. */
export function totalCost(tree: readonly OssuaryNode[]): number {
	return tree.reduce((sum, n) => sum + n.cost, 0);
}

export function findNode(tree: readonly OssuaryNode[], id: string): OssuaryNode | undefined {
	return tree.find((n) => n.id === id);
}

const owns = (meta: MetaState, id: string): boolean => meta.ossuary[id] === true;

/** `owned`, buyable now (`available`), waiting on the square below (`locked`) or cut by the demo (`demo`). */
export function nodeState(meta: MetaState, node: OssuaryNode, demo: boolean): NodeState {
	if (owns(meta, node.id)) return "owned";
	if (demo && node.demoLocked) return "demo";
	if (node.requires !== null && !owns(meta, node.requires)) return "locked";
	return "available";
}

export type BuyResult =
	| { ok: true }
	| { ok: false; reason: "unknown" | "owned" | "requires" | "demo" | "souls" };

/** Spends souls on a square, mutating `meta`. Nothing changes when it refuses. */
export function buyNode(tree: readonly OssuaryNode[], meta: MetaState, id: string, demo: boolean): BuyResult {
	const node = findNode(tree, id);
	if (!node) return { ok: false, reason: "unknown" };
	const state = nodeState(meta, node, demo);
	if (state === "owned") return { ok: false, reason: "owned" };
	if (state === "demo") return { ok: false, reason: "demo" };
	if (state === "locked") return { ok: false, reason: "requires" };
	if (meta.souls < node.cost) return { ok: false, reason: "souls" };
	meta.souls -= node.cost;
	meta.ossuary[id] = true;
	return { ok: true };
}

/** What `resetOssuary` would give back right now. */
export function refundValue(tree: readonly OssuaryNode[], meta: MetaState): number {
	let total = 0;
	for (const node of tree) if (owns(meta, node.id)) total += node.cost;
	return total;
}

/** GDD 19.2: resets the tree and gives back 100% of the souls spent. Returns the refund. */
export function resetOssuary(tree: readonly OssuaryNode[], meta: MetaState): number {
	const refund = refundValue(tree, meta);
	meta.souls += refund;
	meta.ossuary = {};
	return refund;
}
