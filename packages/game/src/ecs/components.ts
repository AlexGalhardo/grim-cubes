export const MAX_ENTITIES = 4096;

type Store = Float32Array | Uint8Array | Uint16Array;
const stores: Store[] = [];

function track<T extends Store>(store: T): T {
	stores.push(store);
	return store;
}

const f32 = (): Float32Array => track(new Float32Array(MAX_ENTITIES));
const u8 = (): Uint8Array => track(new Uint8Array(MAX_ENTITIES));
const u16 = (): Uint16Array => track(new Uint16Array(MAX_ENTITIES));

/** Zeroes every SoA field of `eid`; bitecs recycles ids without clearing component data. */
export function resetComponents(eid: number): void {
	for (let i = 0; i < stores.length; i++) (stores[i] as Store)[eid] = 0;
}

/** Position and PrevPosition are relative to the current world origin (see OriginShifted). */
export const Position = { x: f32(), z: f32() };
export const PrevPosition = { x: f32(), z: f32() };
export const Velocity = { x: f32(), z: f32() };
export const Radius = { r: f32() };
export const Health = { hp: f32(), max: f32() };

export const PlayerFaction = {};
export const EnemyFaction = {};

export const Armor = { value: f32() };
export const Invulnerable = { ticks: u8() };
export const HitFlash = { ticks: u8() };
/** x, z: total displacement in u to apply over `ticks` steps (movementSystem). */
export const Knockback = { x: f32(), z: f32(), ticks: u8() };
export const Elite = { modifier: u8() };
/** The boss of a round: `phase` 0 before the summon, 1 after; enrage stacks every `enrageEverySeconds`. */
export const Boss = { id: u8(), phase: u8(), enrageStacks: u8(), enrageTimer: u16() };

export const EnemyType = { id: u8() };
export const Speed = { value: f32() };
export const ContactDamage = { value: f32() };
/** Per-entity AI scratch: `state` is behavior-specific, `timer` counts simulation steps. */
export const Behavior = {
	kind: u8(),
	state: u8(),
	timer: u16(),
	/** Second counter for behaviors with a cooldown next to a state timer (charge interval, spawn interval). */
	aux: u16(),
};

/** Health at the end of the previous step, so a behavior can tell it was hit (the leech lets go). */
export const PrevHealth = { hp: f32() };
/** Fraction of knockback this enemy ignores; 0 for most, 0.7 for the Afogado (it takes x0.3). */
export const KnockbackResist = { value: f32() };
/** A projectile fired at the hero; live while `life > 0`. */
export const EnemyShot = { damage: f32(), life: u16() };

/** Steps until this enemy can deal contact damage again. */
export const ContactCooldown = { ticks: u8() };

/** A pile of gold/XP on the floor; `value` is the amount (SDD 02 section 2.1). */
export const Fragment = { value: u16(), magnetTimer: u16() };

/** Hero projectile in flight. `life` counts steps; lifecycle and hits belong to projectileSystem. */
export const Projectile = {
	damage: f32(),
	critChance: f32(),
	knockback: f32(),
	pierce: u8(),
	life: u16(),
	/** Explosion radius in u when the shot detonates on a hit or at the end of its life; 0 for plain bullets. */
	explosionRadius: f32(),
	/** Fraction of the damage the hero takes when inside the explosion. */
	selfFraction: f32(),
};

/** Yaw in radians, `atan2(vx, vz)`: 0 faces +z. Written by movementSystem, read by render. */
export const Facing = { yaw: f32() };
/** Steps left in the attack animation; set by behaviorSystem on contact, read by render for the clip. */
export const Attacking = { ticks: u8() };

/** A reward chest on the floor; opening it offers items of at least this tier. */
/** `choices` items are offered and the hero keeps `picks` of them. */
/** `heals`: 1 when opening it restores HP (elite chests; the boss chest does not, GDD 12.2). */
export const Chest = { tier: u8(), choices: u8(), picks: u8(), heals: u8() };
