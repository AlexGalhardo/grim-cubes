import { EnemyFaction, Position, Radius, Velocity } from "../ecs/components";
import { createQueryCache, type GameWorld } from "../ecs/world";
import { PROP_KIND } from "./chunkGen";
import type { ChunkSystem } from "./chunkSystem";
import type { Origin } from "./originShift";

export interface PropCollisionConfig {
	chunkSize: number;
	/** Distance ahead, in units, at which a moving enemy starts steering around a prop (`data/world.json`). */
	avoidLookahead: number;
	/** `propSteerGain` of `data/world.json`. */
	steerGain: number;
	/** `propSteerMargin` of `data/world.json`. */
	steerMargin: number;
	/** Collision radius per `ChunkData.propType` id (0 for props that never block). */
	radiusByType: Float32Array;
}

export interface PropCollision {
	/** Steers enemy velocities around props ahead of them; run after `behaviorSystem`, before `movementSystem`. */
	steer(world: GameWorld, origin: Origin): void;
	/** Pushes `entity` out of every blocking prop it overlaps; run after `movementSystem`. */
	resolve(world: GameWorld, origin: Origin, entity: number): void;
	/** True when a circle at the relative position (x, z) overlaps a blocking prop; for spawn placement. */
	overlaps(origin: Origin, x: number, z: number, radius: number): boolean;
	/** Same as `resolve` for every enemy. */
	resolveEnemies(world: GameWorld, origin: Origin): void;
}

const enemyList = createQueryCache([EnemyFaction, Position, Velocity, Radius]);
/** Candidate circles one query can keep: at most 9 chunks x 8 blocking props = 72 (SDD 03 section 2.1), plus slack. */
const MAX_CANDIDATES = 96;

/**
 * Static collision against blocking props (SDD 03 section 4). Props live in `ChunkData`, so there is no separate
 * structure to keep in sync: the chunk grid is the static spatial hash (cell = one chunk, at most
 * `maxPropsPerChunk` props, only blocking ones are tested). Positions are relative to the render origin; the
 * absolute position `origin + pos` selects the chunks and stays in f64.
 */
export function createPropCollision(chunks: ChunkSystem, config: PropCollisionConfig): PropCollision {
	const { chunkSize, avoidLookahead, radiusByType, steerGain, steerMargin } = config;
	// A prop in a neighbouring chunk can still overlap the query: widen the chunk search by the biggest prop.
	const maxPropRadius = radiusByType.reduce((max, r) => Math.max(max, r), 0);
	// Candidate circles gathered for the current query: x, z (absolute) and radius.
	const scratch = new Float64Array(3 * MAX_CANDIDATES);
	let found = 0;

	function gather(ax: number, az: number, range: number): void {
		found = 0;
		const reach = range + maxPropRadius;
		const cx0 = Math.floor((ax - reach) / chunkSize);
		const cx1 = Math.floor((ax + reach) / chunkSize);
		const cz0 = Math.floor((az - reach) / chunkSize);
		const cz1 = Math.floor((az + reach) / chunkSize);
		for (let cz = cz0; cz <= cz1; cz++) {
			for (let cx = cx0; cx <= cx1; cx++) {
				const chunk = chunks.get(cx, cz);
				if (!chunk) continue;
				for (let p = 0; p < chunk.propCount; p++) {
					if (chunk.propKind[p] !== PROP_KIND.blocking) continue;
					const r = radiusByType[chunk.propType[p] ?? 0] ?? 0;
					if (r <= 0) continue;
					const px = cx * chunkSize + (chunk.propX[p] ?? 0);
					const pz = cz * chunkSize + (chunk.propZ[p] ?? 0);
					const dx = px - ax;
					const dz = pz - az;
					const limit = range + r;
					if (dx * dx + dz * dz > limit * limit || found + 3 > scratch.length) continue;
					scratch[found++] = px;
					scratch[found++] = pz;
					scratch[found++] = r;
				}
			}
		}
	}

	function resolve(world: GameWorld, origin: Origin, entity: number): void {
		void world;
		const er = Radius.r[entity] ?? 0;
		let x = Position.x[entity] ?? 0;
		let z = Position.z[entity] ?? 0;
		gather(origin.x + x, origin.z + z, er);
		for (let i = 0; i < found; i += 3) {
			const dx = (scratch[i] ?? 0) - origin.x - x;
			const dz = (scratch[i + 1] ?? 0) - origin.z - z;
			const min = (scratch[i + 2] ?? 0) + er;
			const d2 = dx * dx + dz * dz;
			if (d2 >= min * min) continue;
			const d = Math.sqrt(d2);
			// Exactly on the centre has no normal: leave along +x.
			const nx = d > 1e-9 ? dx / d : -1;
			const nz = d > 1e-9 ? dz / d : 0;
			const push = min - d;
			x -= nx * push;
			z -= nz * push;
		}
		Position.x[entity] = x;
		Position.z[entity] = z;
	}

	return {
		resolve,
		overlaps(origin, x, z, radius): boolean {
			gather(origin.x + x, origin.z + z, radius);
			for (let i = 0; i < found; i += 3) {
				const dx = (scratch[i] ?? 0) - origin.x - x;
				const dz = (scratch[i + 1] ?? 0) - origin.z - z;
				const min = (scratch[i + 2] ?? 0) + radius;
				if (dx * dx + dz * dz < min * min) return true;
			}
			return false;
		},
		resolveEnemies(world, origin): void {
			const list = enemyList(world);
			for (let i = 0; i < list.length; i++) resolve(world, origin, list[i] ?? 0);
		},
		steer(world, origin): void {
			const list = enemyList(world);
			for (let i = 0; i < list.length; i++) {
				const e = list[i] ?? 0;
				const vx = Velocity.x[e] ?? 0;
				const vz = Velocity.z[e] ?? 0;
				const speed = Math.hypot(vx, vz);
				if (speed < 1e-6) continue;
				const dirX = vx / speed;
				const dirZ = vz / speed;
				const er = Radius.r[e] ?? 0;
				const ax = origin.x + (Position.x[e] ?? 0);
				const az = origin.z + (Position.z[e] ?? 0);
				gather(ax, az, avoidLookahead + 2);

				let steerX = 0;
				let steerZ = 0;
				let strongest = 0;
				for (let k = 0; k < found; k += 3) {
					const dx = (scratch[k] ?? 0) - ax;
					const dz = (scratch[k + 1] ?? 0) - az;
					const clearance = (scratch[k + 2] ?? 0) + er + steerMargin;
					const ahead = dx * dirX + dz * dirZ;
					if (ahead < 0 || ahead > avoidLookahead + clearance) continue;
					// Signed offset of the prop from the heading, along the heading's left normal (-z, x).
					const side = -dirZ * dx + dirX * dz;
					if (Math.abs(side) >= clearance) continue;
					const weight = 1 - ahead / (avoidLookahead + clearance);
					if (weight <= strongest) continue;
					strongest = weight;
					// Turn away from the side the prop is on; dead centre turns right.
					const away = side >= 0 ? -1 : 1;
					steerX = -dirZ * away * weight * steerGain;
					steerZ = dirX * away * weight * steerGain;
				}
				if (strongest === 0) continue;
				const nx = dirX + steerX;
				const nz = dirZ + steerZ;
				const length = Math.hypot(nx, nz) || 1;
				Velocity.x[e] = (nx / length) * speed;
				Velocity.z[e] = (nz / length) * speed;
			}
		},
	};
}
