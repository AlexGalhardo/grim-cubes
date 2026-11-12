import type { SpellDef, SpellsData } from "../data/types";
import { SpellVfx } from "../ecs/events";

/**
 * One automatic spell the spell system casts. Fields that a kind does not use stay 0.
 * `radius` is the bolt's body, the orbit distance, the mine's blast or the nova's reach, depending on `kind`.
 */
export interface SpellEffect {
	kind: number;
	interval: number;
	damageBase: number;
	damagePerRound: number;
	radius: number;
	range: number;
	speed: number;
	count: number;
	hitRadius: number;
	spin: number;
	jumps: number;
	jumpRadius: number;
	fuse: number;
	cooldown: number;
}

/** The heal a class casts on demand: a fraction of the max HP, then a cooldown. */
export interface HealSpell {
	id: string;
	level: number;
	healFraction: number;
	cooldownSeconds: number;
}

/** The super a class casts when charged: `damage` to everything within `radius`, every tick, for the whole duration. */
export interface SuperSpell {
	id: string;
	level: number;
	radius: number;
	damageBase: number;
	damagePerRound: number;
}

export interface ClassSpells {
	/** Ids in slot order: the four automatic ones, the heal, the super. */
	ids: readonly string[];
	auto: SpellEffect[];
	heal: HealSpell;
	super: SuperSpell;
}

const KINDS: Readonly<Record<string, number>> = {
	bolt: SpellVfx.Bolt,
	orbit: SpellVfx.Orbit,
	chain: SpellVfx.Chain,
	mine: SpellVfx.Mine,
	nova: SpellVfx.Nova,
};

/** Id of the Ossuary node that takes `spellId` to `level` (2 to the maximum); level 1 is free. */
export const spellNodeId = (spellId: string, level: number): string => `${spellId}_${level}`;

/** Spell level, 1 to `max`: one above the highest Ossuary node of the spell that the account owns. */
export function spellLevel(ossuary: Readonly<Record<string, boolean>>, spellId: string, max: number): number {
	let level = 1;
	for (let n = 2; n <= max; n++) if (ossuary[spellNodeId(spellId, n)] === true) level = n;
	return level;
}

const p = (spell: SpellDef, key: string): number => spell.params[key] ?? 0;

/** The class's six spells at the levels `levelOf` reports, with the per-level scaling of `data/spells.json` applied. */
export function buildClassSpells(
	data: SpellsData,
	classId: string,
	levelOf: (spellId: string) => number,
): ClassSpells {
	const def = data.classes.find((c) => c.id === classId);
	if (!def) throw new Error(`data/spells.json has no class "${classId}"`);
	const { damagePerLevel, cooldownPerLevel, healPerLevel } = data.levels;
	const auto: SpellEffect[] = [];
	let heal: HealSpell | undefined;
	let cast: SuperSpell | undefined;
	for (const spell of def.spells) {
		const level = Math.min(data.levels.max, Math.max(1, levelOf(spell.id)));
		const grown = 1 + damagePerLevel * (level - 1);
		const faster = 1 - cooldownPerLevel * (level - 1);
		if (spell.slot === "auto") {
			const kind = KINDS[spell.kind ?? ""];
			if (kind === undefined)
				throw new RangeError(`spell "${spell.id}" has an unknown kind "${spell.kind}"`);
			auto.push({
				kind,
				interval: p(spell, "intervalSeconds") * faster,
				damageBase: p(spell, "damageBase") * grown,
				damagePerRound: p(spell, "damagePerRound") * grown,
				radius: p(spell, "radius"),
				range: p(spell, "range"),
				speed: p(spell, "speed"),
				count: p(spell, "count") || 1,
				hitRadius: p(spell, "hitRadius"),
				spin: p(spell, "spin"),
				jumps: p(spell, "jumps"),
				jumpRadius: p(spell, "jumpRadius"),
				fuse: p(spell, "fuseSeconds"),
				cooldown: p(spell, "cooldownSeconds"),
			});
		} else if (spell.slot === "heal") {
			heal = {
				id: spell.id,
				level,
				healFraction: p(spell, "healFraction") * (1 + healPerLevel * (level - 1)),
				cooldownSeconds: p(spell, "cooldownSeconds") * faster,
			};
		} else {
			cast = {
				id: spell.id,
				level,
				radius: p(spell, "radius"),
				damageBase: p(spell, "damageBase") * grown,
				damagePerRound: p(spell, "damagePerRound") * grown,
			};
		}
	}
	if (!heal || !cast) throw new Error(`class "${classId}" in data/spells.json lacks its heal or super`);
	return { ids: def.spells.map((s) => s.id), auto, heal, super: cast };
}
