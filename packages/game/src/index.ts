export {
	Armor,
	Behavior,
	Boss,
	ContactDamage,
	Elite,
	EnemyFaction,
	EnemyType,
	Health,
	HitFlash,
	Invulnerable,
	Knockback,
	MAX_ENTITIES,
	PlayerFaction,
	Position,
	PrevPosition,
	Radius,
	Speed,
	Velocity,
} from "./ecs/components";
export type { RenderPort } from "./ecs/contract";
export type { EventBuffer, EventVisitor } from "./ecs/events";
export { consumeEvents, createEventBuffer, EVENT_CAPACITY, EventType } from "./ecs/events";
export type { GameWorld } from "./ecs/world";
export { createGameWorld, spawn, spawnBody } from "./ecs/world";
export type { Loop, LoopHooks } from "./loop";
export { createLoop, MAX_STEPS, STEP } from "./loop";
export type { DamageConfig, HeroCombatData, LifeStealLimiter } from "./rules/damage";
export {
	armorMultiplier,
	createLifeStealLimiter,
	damageConfigFromHero,
	effectiveDodge,
	knockbackScale,
} from "./rules/damage";
export type { DamageQueue, DamageSystem, DamageSystemDeps, HeroCombatStats } from "./systems/damage";
export { createDamageSystem, DAMAGE_QUEUE_CAPACITY } from "./systems/damage";
export type { SeparationConfig, SeparationSystem } from "./systems/separation";
export { createSeparationSystem } from "./systems/separation";
export type {
	EnemyDef,
	SpawnConfig,
	SpawnRoundOptions,
	SpawnSystem,
	SpawnSystemDeps,
	SpawnWeight,
} from "./systems/spawn";
export { createSpawnSystem, spawnBurst, spawnIntervalSeconds, spawnTotal } from "./systems/spawn";
export type { ChunkData, ChunkGenerator, ChunkStats, ChunkSystem, WorldConfig } from "./world/chunkSystem";
export { createChunkSystem } from "./world/chunkSystem";
export type { Origin, OriginShiftConfig } from "./world/originShift";
export { applyOriginShift, createOrigin, findHero } from "./world/originShift";
