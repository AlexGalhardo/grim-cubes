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
export const Boss = { id: u8() };

export const EnemyType = { id: u8() };
export const Speed = { value: f32() };
export const ContactDamage = { value: f32() };
/** Per-entity AI scratch: `state` is behavior-specific, `timer` counts simulation steps. */
export const Behavior = {
	kind: u8(),
	state: u8(),
	timer: u16(),
};

/** Steps until this enemy can deal contact damage again. */
export const ContactCooldown = { ticks: u8() };

/** A pile of gold/XP on the floor; `value` is the amount (SDD 02 section 2.1). */
export const Fragment = { value: u16(), magnetTimer: u16() };
