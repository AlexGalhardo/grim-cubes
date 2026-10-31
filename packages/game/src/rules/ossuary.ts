import type { MetaState } from "@gc/core";
import type { OssuaryData, OssuaryNodeData } from "../data/types";
import type { Modifier } from "./stats";

export type NodeState = "owned" | "available" | "locked" | "demo";

/** Total cost of every node (GDD 19.1: 10,250 souls on the 1.0 tree). */
export function totalCost(data: OssuaryData): number {
	return data.branches.reduce((sum, b) => sum + b.nodes.reduce((s, n) => s + n.cost, 0), 0);
}

export function findNode(data: OssuaryData, id: string): OssuaryNodeData | undefined {
	for (const branch of data.branches) {
		const node = branch.nodes.find((n) => n.id === id);
		if (node) return node;
	}
	return undefined;
}

const owns = (meta: MetaState, id: string): boolean => meta.ossuary[id] === true;

/** `owned`, buyable now (`available`), waiting on the previous node (`locked`) or cut by the demo (`demo`). */
export function nodeState(
	data: OssuaryData,
	meta: MetaState,
	node: OssuaryNodeData,
	demo: boolean,
): NodeState {
	if (owns(meta, node.id)) return "owned";
	if (demo && node.index > data.demoMaxNodeIndex) return "demo";
	if (node.requires !== null && !owns(meta, node.requires)) return "locked";
	return "available";
}

export type BuyResult =
	| { ok: true }
	| { ok: false; reason: "unknown" | "owned" | "requires" | "demo" | "souls" };

/** Spends souls on a node, mutating `meta`. Nothing changes when it refuses. */
export function buyNode(data: OssuaryData, meta: MetaState, id: string, demo: boolean): BuyResult {
	const node = findNode(data, id);
	if (!node) return { ok: false, reason: "unknown" };
	const state = nodeState(data, meta, node, demo);
	if (state === "owned") return { ok: false, reason: "owned" };
	if (state === "demo") return { ok: false, reason: "demo" };
	if (state === "locked") return { ok: false, reason: "requires" };
	if (meta.souls < node.cost) return { ok: false, reason: "souls" };
	meta.souls -= node.cost;
	meta.ossuary[id] = true;
	return { ok: true };
}

/** GDD 19.2: resets the tree and gives back 100% of the souls spent. Returns the refund. */
export function resetOssuary(data: OssuaryData, meta: MetaState): number {
	let refund = 0;
	for (const branch of data.branches) {
		for (const node of branch.nodes) if (owns(meta, node.id)) refund += node.cost;
	}
	meta.souls += refund;
	meta.ossuary = {};
	return refund;
}

/** Effects of owned nodes that other systems read at the start of a run. */
export interface OssuaryBonus {
	modifiers: Modifier[];
	/** `crit_mult_set`: replaces the base critical multiplier. */
	critMult: number | null;
	fragmentGain: number;
	soulGain: number;
	startGold: number;
	/** `weak_phylactery`: HP fraction of the revive, null when not owned. */
	weakReviveHpFraction: number | null;
	dashUnlocked: boolean;
	dashCooldownReductionSeconds: number;
	dashCharges: number;
	cardRerolls: number;
	guaranteedUncommonShopItems: number;
	extraLegendaryPool: number;
}

const num = (params: Record<string, number | string | boolean> | undefined, key: string): number => {
	const value = params?.[key];
	return typeof value === "number" ? value : 0;
};

/** GDD 19: folds the owned nodes into the modifiers and flags a run starts with. */
export function applyOssuary(data: OssuaryData, meta: MetaState): OssuaryBonus {
	const bonus: OssuaryBonus = {
		modifiers: [],
		critMult: null,
		fragmentGain: 0,
		soulGain: 0,
		startGold: 0,
		weakReviveHpFraction: null,
		dashUnlocked: false,
		dashCooldownReductionSeconds: 0,
		dashCharges: 1,
		cardRerolls: 0,
		guaranteedUncommonShopItems: 0,
		extraLegendaryPool: 0,
	};
	for (const branch of data.branches) {
		for (const node of branch.nodes) {
			if (!owns(meta, node.id)) continue;
			for (const m of node.modifiers) bonus.modifiers.push({ ...m });
			for (const effect of node.effects) {
				const p = effect.params;
				switch (effect.id) {
					case "crit_mult_set":
						bonus.critMult = num(p, "value");
						break;
					case "fragment_gain":
						bonus.fragmentGain += num(p, "fraction");
						break;
					case "soul_gain":
						bonus.soulGain += num(p, "fraction");
						break;
					case "start_gold":
						bonus.startGold += num(p, "value");
						break;
					case "weak_phylactery":
						bonus.weakReviveHpFraction = num(p, "hpFraction");
						break;
					case "dash_unlock":
						bonus.dashUnlocked = true;
						break;
					case "dash_cooldown_reduction":
						bonus.dashCooldownReductionSeconds += num(p, "seconds");
						break;
					case "dash_charges":
						bonus.dashCharges = Math.max(bonus.dashCharges, num(p, "value"));
						break;
					case "card_rerolls":
						bonus.cardRerolls += num(p, "count");
						break;
					case "guaranteed_uncommon_shop_item":
						bonus.guaranteedUncommonShopItems += num(p, "count");
						break;
					case "extra_legendary_pool":
						bonus.extraLegendaryPool += num(p, "count");
						break;
					default:
						throw new RangeError(`unknown ossuary effect "${effect.id}" on node "${node.id}"`);
				}
			}
		}
	}
	return bonus;
}

/** What `resetOssuary` would give back right now. */
export function refundValue(data: OssuaryData, meta: MetaState): number {
	let total = 0;
	for (const branch of data.branches) {
		for (const node of branch.nodes) if (owns(meta, node.id)) total += node.cost;
	}
	return total;
}
