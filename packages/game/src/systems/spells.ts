import type { SpatialHash } from "@gc/core";
import { Health, MAX_ENTITIES, Position, Radius } from "../ecs/components";
import { type EventBuffer, EventType, SpellVfx } from "../ecs/events";
import { isHittable } from "../ecs/hittable";
import type { ProjectilePool, ProjectileSpec } from "../ecs/projectile";
import type { GameWorld } from "../ecs/world";
import { STEP } from "../loop";
import type { ItemEffects, SpellEffect } from "../rules/effects";
import type { DamageQueue } from "./damage";

export interface SpellSystemDeps {
	effects: ItemEffects;
	queue: DamageQueue;
	enemies: SpatialHash;
	projectiles: ProjectilePool;
	events: EventBuffer;
	round: () => number;
}

export interface SpellSystem {
	run(world: GameWorld, hero: number): void;
}

const MAX_SPELLS = 16;
const MAX_NEAR = 128;
const CHAIN_CAP = 8;
const MINE_SLOTS = 8;
/** Orbit shards announce themselves every this many steps, not every step. */
const ORBIT_VFX_EVERY = 4;

/**
 * Automatic spells bought as items. One spec per owned copy. Nothing here allocates after `create`.
 * Bolts go through the projectile pool (the cube renderer is their trail). The other four push `SpellCast`.
 */
export function createSpellSystem(deps: SpellSystemDeps): SpellSystem {
	const { effects, queue, enemies, projectiles, events, round } = deps;
	const near = new Uint16Array(MAX_NEAR);
	const chainHits = new Uint16Array(CHAIN_CAP);
	const period = new Uint16Array(MAX_SPELLS);
	const left = new Uint16Array(MAX_SPELLS);
	const lastOrbitHit = new Uint32Array(MAX_SPELLS * MAX_ENTITIES);
	const mineX = new Float32Array(MINE_SLOTS);
	const mineZ = new Float32Array(MINE_SLOTS);
	const mineR = new Float32Array(MINE_SLOTS);
	const mineBase = new Float32Array(MINE_SLOTS);
	const minePer = new Float32Array(MINE_SLOTS);
	const mineLife = new Uint16Array(MINE_SLOTS);
	const shot: ProjectileSpec = {
		x: 0,
		z: 0,
		vx: 0,
		vz: 0,
		damage: 0,
		critChance: 0,
		knockback: 0,
		pierce: 0,
		lifeSteps: 1,
		radius: 0.2,
		explosionRadius: 0,
		selfFraction: 0,
	};
	let armed = -1;
	let orbitAngle = 0;
	let clock = 1;
	let vfxStep = 0;

	const damageOf = (spec: SpellEffect): number => spec.damageBase + spec.damagePerRound * round();

	const nearest = (world: GameWorld, x: number, z: number, range: number, hitCount: number): number => {
		const n = enemies.queryCircle(x, z, range + 1, near);
		let best = -1;
		let bestDist = Number.POSITIVE_INFINITY;
		for (let i = 0; i < n; i++) {
			const e = near[i] ?? 0;
			if ((Health.hp[e] ?? 0) <= 0 || !isHittable(world, e)) continue;
			let seen = false;
			for (let h = 0; h < hitCount; h++) if (chainHits[h] === e) seen = true;
			if (seen) continue;
			const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
			if (dist > range + (Radius.r[e] ?? 0)) continue;
			if (dist < bestDist || (dist === bestDist && e < best)) {
				best = e;
				bestDist = dist;
			}
		}
		return best;
	};

	const hurtAround = (
		world: GameWorld,
		x: number,
		z: number,
		radius: number,
		amount: number,
		hero: number,
	): void => {
		const n = enemies.queryCircle(x, z, radius + 1, near);
		for (let i = 0; i < n; i++) {
			const e = near[i] ?? 0;
			if ((Health.hp[e] ?? 0) <= 0 || !isHittable(world, e)) continue;
			const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
			if (dist <= radius + (Radius.r[e] ?? 0)) queue.push(e, amount, hero, 0, 0, 0);
		}
	};

	const tickMines = (world: GameWorld, hero: number): void => {
		for (let m = 0; m < MINE_SLOTS; m++) {
			const life = mineLife[m] ?? 0;
			if (life === 0) continue;
			const next = life - 1;
			mineLife[m] = next;
			const x = mineX[m] ?? 0;
			const z = mineZ[m] ?? 0;
			const radius = mineR[m] ?? 0;
			let touch = next === 0;
			if (!touch) {
				const n = enemies.queryCircle(x, z, radius + 1, near);
				for (let i = 0; i < n; i++) {
					const e = near[i] ?? 0;
					if ((Health.hp[e] ?? 0) <= 0 || !isHittable(world, e)) continue;
					const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
					if (dist <= radius + (Radius.r[e] ?? 0)) {
						touch = true;
						break;
					}
				}
			}
			if (!touch) continue;
			const amount = (mineBase[m] ?? 0) + (minePer[m] ?? 0) * round();
			hurtAround(world, x, z, radius, amount, hero);
			events.push(EventType.Exploded, x, z, radius, 0);
			mineLife[m] = 0;
		}
	};

	const placeMine = (x: number, z: number, spec: SpellEffect): boolean => {
		let slot = -1;
		for (let m = 0; m < MINE_SLOTS; m++) {
			if ((mineLife[m] ?? 0) === 0) {
				slot = m;
				break;
			}
		}
		if (slot < 0) return false;
		mineX[slot] = x;
		mineZ[slot] = z;
		mineR[slot] = spec.radius;
		mineBase[slot] = spec.damageBase;
		minePer[slot] = spec.damagePerRound;
		mineLife[slot] = Math.min(65535, Math.max(1, Math.round(spec.fuse / STEP)));
		events.push(EventType.SpellCast, x, z, spec.fuse * 100 + spec.radius, SpellVfx.Mine);
		return true;
	};

	const castBolt = (world: GameWorld, hero: number, spec: SpellEffect): boolean => {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		const target = nearest(world, hx, hz, spec.range, 0);
		if (target < 0 || spec.speed <= 0) return false;
		const dx = (Position.x[target] ?? 0) - hx;
		const dz = (Position.z[target] ?? 0) - hz;
		const len = Math.hypot(dx, dz) || 1;
		shot.x = hx;
		shot.z = hz;
		shot.vx = (dx / len) * spec.speed;
		shot.vz = (dz / len) * spec.speed;
		shot.damage = damageOf(spec);
		shot.critChance = 0;
		shot.knockback = 0;
		shot.pierce = 0;
		shot.lifeSteps = Math.max(1, Math.ceil(spec.range / spec.speed / STEP));
		shot.radius = spec.radius > 0 ? spec.radius : 0.2;
		shot.explosionRadius = 0;
		shot.selfFraction = 0;
		if (projectiles.acquire(shot) < 0) return false;
		events.push(EventType.SpellCast, hx, hz, 0, SpellVfx.Bolt);
		return true;
	};

	const castOrbit = (world: GameWorld, hero: number, spec: SpellEffect, index: number): void => {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		const shards = Math.max(1, spec.count);
		const cool = Math.max(1, Math.round(spec.cooldown / STEP));
		const amount = damageOf(spec);
		for (let s = 0; s < shards; s++) {
			const angle = orbitAngle + (s * Math.PI * 2) / shards;
			const x = hx + Math.cos(angle) * spec.radius;
			const z = hz + Math.sin(angle) * spec.radius;
			if (vfxStep % ORBIT_VFX_EVERY === 0)
				events.push(EventType.SpellCast, x, z, spec.radius, SpellVfx.Orbit);
			const n = enemies.queryCircle(x, z, spec.hitRadius + 1, near);
			for (let i = 0; i < n; i++) {
				const e = near[i] ?? 0;
				if (e >= MAX_ENTITIES || (Health.hp[e] ?? 0) <= 0 || !isHittable(world, e)) continue;
				const dist = Math.hypot((Position.x[e] ?? 0) - x, (Position.z[e] ?? 0) - z);
				if (dist > spec.hitRadius + (Radius.r[e] ?? 0)) continue;
				const at = index * MAX_ENTITIES + e;
				const prev = lastOrbitHit[at] ?? 0;
				if (prev !== 0 && clock - prev < cool) continue;
				lastOrbitHit[at] = clock;
				queue.push(e, amount, hero, 0, 0, 0);
			}
		}
	};

	const castChain = (world: GameWorld, hero: number, spec: SpellEffect): boolean => {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		const first = nearest(world, hx, hz, spec.range, 0);
		if (first < 0) return false;
		const cap = Math.min(CHAIN_CAP, Math.max(0, Math.floor(spec.jumps)));
		if (cap === 0) return false;
		const amount = damageOf(spec);
		chainHits[0] = first;
		let hitCount = 1;
		queue.push(first, amount, hero, 0, 0, 0);
		events.push(EventType.SpellCast, Position.x[first] ?? 0, Position.z[first] ?? 0, 0, SpellVfx.Chain);
		while (hitCount < cap) {
			const from = chainHits[hitCount - 1] ?? first;
			const next = nearest(
				world,
				Position.x[from] ?? 0,
				Position.z[from] ?? 0,
				spec.jumpRadius,
				hitCount,
			);
			if (next < 0) break;
			chainHits[hitCount] = next;
			hitCount++;
			queue.push(next, amount, hero, 0, 0, 0);
			events.push(EventType.SpellCast, Position.x[next] ?? 0, Position.z[next] ?? 0, 0, SpellVfx.Chain);
		}
		return true;
	};

	const castNova = (world: GameWorld, hero: number, spec: SpellEffect): void => {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		events.push(EventType.SpellCast, hx, hz, spec.radius, SpellVfx.Nova);
		hurtAround(world, hx, hz, spec.radius, damageOf(spec), hero);
	};

	return {
		run(world: GameWorld, hero: number): void {
			clock++;
			vfxStep++;
			tickMines(world, hero);
			const list = effects.spells;
			// Copies share one ring. Advancing inside each copy spun two orbits at twice the item spin.
			let orbitAdvanced = false;
			if (armed !== list.length) {
				armed = Math.min(list.length, MAX_SPELLS);
				for (let i = 0; i < armed; i++) {
					const steps = Math.max(1, Math.round((list[i]?.interval ?? 0) / STEP));
					period[i] = steps;
					left[i] = steps;
				}
			}
			for (let i = 0; i < armed; i++) {
				const spec = list[i];
				if (!spec) continue;
				if (spec.kind === SpellVfx.Orbit) {
					if (!orbitAdvanced) {
						orbitAngle += spec.spin * STEP;
						orbitAdvanced = true;
					}
					castOrbit(world, hero, spec, i);
					continue;
				}
				if ((left[i] ?? 0) > 1) {
					left[i] = (left[i] ?? 1) - 1;
					continue;
				}
				let did = false;
				if (spec.kind === SpellVfx.Bolt) did = castBolt(world, hero, spec);
				else if (spec.kind === SpellVfx.Chain) did = castChain(world, hero, spec);
				else if (spec.kind === SpellVfx.Mine)
					did = placeMine(Position.x[hero] ?? 0, Position.z[hero] ?? 0, spec);
				else if (spec.kind === SpellVfx.Nova) {
					castNova(world, hero, spec);
					did = true;
				}
				left[i] = did ? (period[i] ?? 1) : 1;
			}
		},
	};
}
