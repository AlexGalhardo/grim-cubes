export const MAX_ENTITIES = 4096;

const f32 = (): Float32Array => new Float32Array(MAX_ENTITIES);

/** Position and PrevPosition are relative to the current world origin (see OriginShifted). */
export const Position = { x: f32(), z: f32() };
export const PrevPosition = { x: f32(), z: f32() };
export const Velocity = { x: f32(), z: f32() };
export const Radius = { r: f32() };
export const Health = { hp: f32(), max: f32() };

export const PlayerFaction = {};
export const EnemyFaction = {};

export const Armor = { value: f32() };
export const Invulnerable = { ticks: new Uint8Array(MAX_ENTITIES) };
export const HitFlash = { ticks: new Uint8Array(MAX_ENTITIES) };
/** x, z: total displacement in u to apply over `ticks` steps (movementSystem). */
export const Knockback = { x: f32(), z: f32(), ticks: new Uint8Array(MAX_ENTITIES) };
export const Elite = { modifier: new Uint8Array(MAX_ENTITIES) };
export const Boss = { id: new Uint8Array(MAX_ENTITIES) };

export const EnemyType = { id: new Uint8Array(MAX_ENTITIES) };
export const Speed = { value: f32() };
export const ContactDamage = { value: f32() };
/** Per-entity AI scratch: `state` is behavior-specific, `timer` counts simulation steps. */
export const Behavior = {
	kind: new Uint8Array(MAX_ENTITIES),
	state: new Uint8Array(MAX_ENTITIES),
	timer: new Uint16Array(MAX_ENTITIES),
};
