import type { Modifier } from "../rules/stats";

/**
 * The simulated player's habits (GDD 25). `greedy` buys and picks for damage and keeps the weapon's range; `tank`
 * (B-02-02) prefers max HP, armor, regeneration and life steal, backs away from a crowd, and spends a dash to get
 * out of a corner; `kite` (S-12-03) buys like greedy but keeps its distance, strafes and collects fragments when it is
 * clear, for the ranged class that cannot clear a crowd standing still; `mage` (S-26-01) buys like greedy and fights in
 * the crowd like it, but holds a wider distance, for the class whose spells and axe work around it. Policies decide what the bot does; they are not game data.
 */
export const POLICIES = ["greedy", "tank", "kite", "mage"] as const;
export type PolicyId = (typeof POLICIES)[number];

export const POLICY_LABEL: Readonly<Record<PolicyId, "greedy-kite" | "tank-kite" | "kite" | "mage">> = {
	greedy: "greedy-kite",
	tank: "tank-kite",
	kite: "kite",
	mage: "mage",
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

export interface Policy {
	id: PolicyId;
	/** Worth of a list of modifiers (a card, a piece of equipment). */
	modifierValue(mods: readonly Modifier[]): number;
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
};

const tank: Policy = {
	id: "tank",
	modifierValue: (mods) => weighted(TANK_WEIGHTS, mods),
};

/** The kiting bots spend like the greedy one: what changes is how they move. */
const kite: Policy = { ...greedy, id: "kite" };
const mage: Policy = { ...greedy, id: "mage" };

export function policyFor(id: PolicyId): Policy {
	return id === "tank" ? tank : id === "kite" ? kite : id === "mage" ? mage : greedy;
}

/** The bot that suits a class: the warrior plays in the crowd, the ranged class kites, the mage stands a little further out than the warrior. */
export function policyForHero(heroId: string): PolicyId {
	return heroId === "ranged" ? "kite" : heroId === "mage" ? "mage" : "greedy";
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

export interface KiteView {
	hero: Spot;
	/** The weapon's reach in u. */
	range: number;
	enemies: readonly Spot[];
	fragments: readonly Spot[];
	/** Simulation step, to swap the strafing side now and then. */
	tick: number;
}

/** Enemies inside this distance push the kiter away; it never lets a crowd close in. */
const KITE_DANGER = 5;
/** Fragments are fetched only when nothing is inside this distance. */
const KITE_SAFE = 6;
const KITE_FETCH_RADIUS = 14;
const KITE_SWAP_STEPS = 180;

/**
 * The kiter's step: away from the weighted centre of the enemies when they are close (sliding sideways so it does not
 * run into a wall of them), a strafe while they are in the weapon's reach, a walk to the nearest fragment when the
 * field is clear, and otherwise a step in until the target is in range. It never dashes: with the Ossuary dash a kiter
 * outlived every Nightmare range (p50 33 against 11-18), so the dash stays the tank's tool.
 */
export function kiteSteer(view: KiteView): TankMove {
	let fleeX = 0;
	let fleeZ = 0;
	let nearest = Number.POSITIVE_INFINITY;
	let nx = 0;
	let nz = 0;
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
		const weight = 1 / Math.max(d * d, 0.25);
		fleeX -= (dx / Math.max(d, 1e-6)) * weight;
		fleeZ -= (dz / Math.max(d, 1e-6)) * weight;
	}
	const side = Math.floor(view.tick / KITE_SWAP_STEPS) % 2 === 0 ? 1 : -1;
	if (!Number.isFinite(nearest)) return fetchFragment(view);

	const fleeLength = Math.hypot(fleeX, fleeZ);
	const fx = fleeLength > 1e-6 ? fleeX / fleeLength : 0;
	const fz = fleeLength > 1e-6 ? fleeZ / fleeLength : 0;
	if (nearest < KITE_DANGER) {
		// Mostly away, with a sideways part so the hero curves round the crowd instead of backing into a corner.
		const mx = fx + -fz * side * 0.6;
		const mz = fz + fx * side * 0.6;
		const length = Math.max(Math.hypot(mx, mz), 1e-6);
		return { moveX: mx / length, moveZ: mz / length, dash: false };
	}
	const want = Math.max(KITE_DANGER, view.range * 0.75);
	if (nearest > KITE_SAFE) {
		const fetch = fetchFragment(view);
		if (fetch.moveX !== 0 || fetch.moveZ !== 0) return fetch;
	}
	if (nearest > want) return { moveX: nx / nearest, moveZ: nz / nearest, dash: false };
	// In reach and not crowded: strafe across the line to the target.
	return { moveX: (-nz / nearest) * side, moveZ: (nx / nearest) * side, dash: false };
}

/** A step towards the nearest fragment within reach, or standing still when there is none. */
function fetchFragment(view: KiteView): TankMove {
	let best = KITE_FETCH_RADIUS;
	let bx = 0;
	let bz = 0;
	for (const f of view.fragments) {
		const dx = f.x - view.hero.x;
		const dz = f.z - view.hero.z;
		const d = Math.hypot(dx, dz);
		if (d < best) {
			best = d;
			bx = dx / Math.max(d, 1e-6);
			bz = dz / Math.max(d, 1e-6);
		}
	}
	if (best === KITE_FETCH_RADIUS) return { moveX: 0, moveZ: 0, dash: false };
	return { moveX: bx, moveZ: bz, dash: false };
}
