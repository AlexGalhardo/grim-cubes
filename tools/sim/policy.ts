import type { Modifier } from "../../packages/game/src/index";

/**
 * The simulated player's habits (GDD 25). `greedy` buys and picks for damage and keeps the weapon's range; `tank`
 * (B-02-02) prefers max HP, armor, regeneration and life steal, backs away from a crowd, and spends a dash to get
 * out of a corner. Policies decide what the bot does; they are not game data.
 */
export const POLICIES = ["greedy", "tank"] as const;
export type PolicyId = (typeof POLICIES)[number];

export const POLICY_LABEL: Readonly<Record<PolicyId, "greedy-kite" | "tank-kite">> = {
	greedy: "greedy-kite",
	tank: "tank-kite",
};

/** Value of a modifier to the player, per unit. */
type Weights = Readonly<Record<string, number>>;

export const GREEDY_WEIGHTS: Weights = {
	damage: 100,
	attack_speed: 100,
	crit_chance: 60,
	max_hp: 0.8,
	hp_regen: 30,
	armor: 6,
	dodge: 80,
	speed: 25,
	life_steal: 300,
	range: 6,
	luck: 0.2,
	harvest: 4,
	pickup_range: 10,
	xp_gain: 30,
};

/** Survival first: HP, armor, regeneration and life steal weigh several times what they do to the greedy bot. */
export const TANK_WEIGHTS: Weights = {
	damage: 45,
	attack_speed: 45,
	crit_chance: 20,
	max_hp: 2.4,
	hp_regen: 120,
	armor: 22,
	dodge: 100,
	speed: 25,
	life_steal: 700,
	range: 6,
	luck: 0.2,
	harvest: 4,
	pickup_range: 10,
	xp_gain: 30,
};

/** Flat value of an item whose power is a special effect rather than a stat (the greedy bot's one number). */
const GREEDY_EFFECT_VALUE = 18;
/** The tank knows which special effects keep it alive. */
const TANK_EFFECT_VALUE: Readonly<Record<string, number>> = {
	revive_once: 90,
	proximity_aura_damage: 30,
	contact_damage: 25,
};
const TANK_OTHER_EFFECT = 8;

export interface Policy {
	id: PolicyId;
	/** Worth of a list of modifiers (a card, a shop item). */
	modifierValue(mods: readonly Modifier[]): number;
	/** Worth of an item's special effects. */
	effectValue(effects: readonly { id: string }[]): number;
	/** Worth of a weapon upgrade in the shop. */
	readonly upgradeValue: number;
	/** What a chest item adds on top of its stats (the greedy bot counts any item as having an effect). */
	chestBonus(effects: readonly { id: string }[] | undefined): number;
}

function weighted(weights: Weights, mods: readonly Modifier[]): number {
	let total = 0;
	for (const m of mods) {
		const weight = weights[m.stat] ?? 0;
		// `mul` modifiers are factors around 1 (0.7 = -30%): worth their distance from 1 on a 100-point scale.
		total += m.op === "mul" ? (m.value - 1) * weight * 0.5 : m.value * weight;
	}
	return total;
}

const greedy: Policy = {
	id: "greedy",
	modifierValue: (mods) => weighted(GREEDY_WEIGHTS, mods),
	effectValue: (effects) => (effects.length > 0 ? GREEDY_EFFECT_VALUE : 0),
	upgradeValue: 40,
	chestBonus: () => GREEDY_EFFECT_VALUE,
};

const tank: Policy = {
	id: "tank",
	modifierValue: (mods) => weighted(TANK_WEIGHTS, mods),
	effectValue: (effects) =>
		effects.reduce((sum, e) => sum + (TANK_EFFECT_VALUE[e.id] ?? TANK_OTHER_EFFECT), 0),
	upgradeValue: 25,
	chestBonus: (effects) =>
		effects?.reduce((sum, e) => sum + (TANK_EFFECT_VALUE[e.id] ?? TANK_OTHER_EFFECT), 0) ?? 0,
};

export function policyFor(id: PolicyId): Policy {
	return id === "tank" ? tank : greedy;
}

export function parsePolicy(text: string | undefined): PolicyId {
	if (text === undefined) return "greedy";
	if ((POLICIES as readonly string[]).includes(text)) return text as PolicyId;
	throw new Error(`unknown policy "${text}" (expected ${POLICIES.join(" or ")})`);
}

export interface Spot {
	x: number;
	z: number;
}

export interface TankView {
	hero: Spot;
	/** 0..1 */
	hpFraction: number;
	/** The weapon's reach in u. */
	range: number;
	enemies: readonly Spot[];
	/** The dash is unlocked and has a charge. */
	canDash: boolean;
}

export interface TankMove {
	moveX: number;
	moveZ: number;
	dash: boolean;
}

/** Enemies this close push the tank to back off; farther ones are the weapon's business. */
const THREAT_RADIUS = 9;
const CROWD_RADIUS = 4;
const CROWD_SIZE = 6;
/** Below this the tank runs instead of fighting: a healthy tank stands and trades blows (and regenerates). */
const FLEE_HP = 0.3;
/** Something this close is on top of it; with half its HP gone that is a reason to run. */
const PANIC_DISTANCE = 1.2;
const PANIC_HP = 0.6;
/** In a crowd it only gives ground once it is below this HP. */
const CROWD_HP = 0.8;

/**
 * The tank's step: hold the weapon's range from the nearest enemy like the greedy bot, but run away from the weighted
 * centre of the threats when it is badly hurt, or wounded and crowded, and dash when something is on top of it.
 */
export function tankSteer(view: TankView): TankMove {
	let fleeX = 0;
	let fleeZ = 0;
	let nearest = Number.POSITIVE_INFINITY;
	let nx = 0;
	let nz = 0;
	let crowd = 0;
	for (const e of view.enemies) {
		const dx = e.x - view.hero.x;
		const dz = e.z - view.hero.z;
		const d = Math.hypot(dx, dz);
		if (d < nearest) {
			nearest = d;
			nx = dx;
			nz = dz;
		}
		if (d > THREAT_RADIUS) continue;
		if (d < CROWD_RADIUS) crowd++;
		// Closer threats push harder (1/d^2), directly away from them.
		const weight = 1 / Math.max(d * d, 0.25);
		fleeX -= (dx / Math.max(d, 1e-6)) * weight;
		fleeZ -= (dz / Math.max(d, 1e-6)) * weight;
	}
	if (!Number.isFinite(nearest)) return { moveX: 0, moveZ: 0, dash: false };

	const fleeLength = Math.hypot(fleeX, fleeZ);
	const flee = fleeLength > 1e-6 ? { x: fleeX / fleeLength, z: fleeZ / fleeLength } : { x: 0, z: 0 };
	const panic = view.hpFraction < FLEE_HP || (nearest < PANIC_DISTANCE && view.hpFraction < PANIC_HP);
	const dash =
		view.canDash &&
		((view.hpFraction < PANIC_HP && nearest < 3) || (view.hpFraction < 0.8 && nearest < 0.8));
	if (panic) return { moveX: flee.x, moveZ: flee.z, dash };

	const want = Math.max(2, view.range * 0.9);
	const sign = nearest > want + 0.5 ? 1 : nearest < want - 0.5 ? -1 : 0;
	let moveX = (sign * nx) / nearest;
	let moveZ = (sign * nz) / nearest;
	// In a crowd a wounded tank gives ground while it fights.
	if (crowd >= CROWD_SIZE && view.hpFraction < CROWD_HP) {
		moveX = 0.4 * moveX + 0.6 * flee.x;
		moveZ = 0.4 * moveZ + 0.6 * flee.z;
	}
	return { moveX, moveZ, dash };
}
