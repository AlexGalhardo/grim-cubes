import { Color3 } from "@babylonjs/core/Maths/math.color";
import { mulberry32 } from "@gc/core";
import { EventType, Position, renderData } from "@gc/game";
import { CAMERA } from "../scene/camera";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createDecalPool, type DecalPool } from "./decals";
import { createDamageNumbers, type DamageNumbers } from "./digits";
import { createParticlePool, type ParticlePool } from "./particles";

type Rgb = readonly [number, number, number];

const rgb = (hex: string): Rgb => {
	const c = Color3.FromHexString(hex);
	return [c.r, c.g, c.b];
};

export type VfxConfig = typeof renderData.vfx;

export interface VfxOptions {
	config?: VfxConfig;
	/** Called with a duration in ms when an event asks for a hit-stop (critical hit, boss death). */
	onHitStop?: (ms: number) => void;
	/** Whether a dying entity is a boss, for the longer hit-stop. */
	isBoss?: (entity: number) => boolean;
	seed?: number;
}

export interface Vfx {
	/** Wire as the visitor of the event buffer (the render port does). */
	onEvent(type: number, a: number, b: number, c: number, entity: number): void;
	update(dtSeconds: number): void;
	shift(dx: number, dz: number): void;
	/** false = reduced gore: no decals, no blood, grey cubes on death (GDD §23, Art Bible §9). */
	setGore(full: boolean): void;
	readonly gore: boolean;
	readonly particles: ParticlePool;
	readonly decals: DecalPool;
	readonly numbers: DamageNumbers;
}

/**
 * Combat juice driven by game events: blood and explosion cubes, floor decals, damage numbers (Art Bible §9,
 * GDD §23). Every pool has a fixed size from `data/render.json`; a full pool drops the effect instead of growing.
 */
export function createVfx(game: GameScene, options: VfxOptions = {}): Vfx {
	const config = options.config ?? renderData.vfx;
	const rng = mulberry32(options.seed ?? 0x5eed);
	const blood = rgb(PALETTE.blood);
	const bloodLight = rgb(PALETTE.bloodLight);
	const ember = rgb(PALETTE.ember);
	const emberLight = rgb(PALETTE.emberLight);
	const reducedBlood = rgb(PALETTE.ironDark);
	const reducedCube = rgb(PALETTE.iron);
	let gore = true;

	const decals = createDecalPool(game.scene, config.decalPool);
	const particles = createParticlePool(game.scene, config.particlePool, config.gravity, (x, z) => {
		if (gore) addDecal(x, z);
	});
	const numbers = createDamageNumbers(game.scene, {
		pool: config.damageNumberPool,
		lifeSeconds: config.damageNumberLifeSeconds,
		rise: config.damageNumberRise,
		height: config.damageNumberHeight,
		elevation: Math.PI / 2 - CAMERA.beta,
		color: rgb(PALETTE.bone),
		critColor: emberLight,
	});

	const between = (range: readonly number[]): number =>
		(range[0] ?? 0) + rng.next() * ((range[1] ?? 0) - (range[0] ?? 0));
	const count = (range: readonly number[]): number =>
		(range[0] ?? 0) + rng.int((range[1] ?? 0) - (range[0] ?? 0) + 1);

	function addDecal(x: number, z: number): void {
		const color = rng.chance(config.bloodLightShare) ? bloodLight : blood;
		decals.add(
			x,
			z,
			between(config.decalSizeRange),
			rng.next() * Math.PI * 2,
			color[0],
			color[1],
			color[2],
		);
	}

	function burst(
		x: number,
		z: number,
		cubes: number,
		colors: readonly Rgb[],
		speed: number,
		lift: number,
		landsAsDecal: boolean,
	): void {
		for (let i = 0; i < cubes; i++) {
			const angle = rng.next() * Math.PI * 2;
			const v = speed * (0.4 + rng.next() * 0.6);
			const color = colors[rng.int(colors.length)] ?? colors[0] ?? blood;
			particles.add(
				x,
				0.5 + rng.next() * 0.6,
				z,
				Math.cos(angle) * v,
				lift * (0.6 + rng.next() * 0.8),
				Math.sin(angle) * v,
				between(config.cubeSizeRange),
				color[0],
				color[1],
				color[2],
				config.particleLifeSeconds,
				landsAsDecal && rng.chance(config.decalFromLandingChance),
			);
		}
	}

	const bloodColors = (): readonly Rgb[] =>
		gore ? (rng.chance(config.bloodLightShare) ? [bloodLight] : [blood]) : [reducedBlood];
	const explosionColors: readonly Rgb[] = [ember, emberLight];

	return {
		particles,
		decals,
		numbers,
		get gore(): boolean {
			return gore;
		},
		setGore(full): void {
			gore = full;
			if (!full) decals.clear();
		},
		onEvent(type, a, b, c, entity): void {
			if (type === EventType.Damaged) {
				const x = Position.x[entity] ?? 0;
				const z = Position.z[entity] ?? 0;
				numbers.spawn(a, x, z, b === 1);
				burst(x, z, count(config.bloodCubesPerHit), bloodColors(), 4, 5, gore);
				if (b === 1) options.onHitStop?.(config.hitStopCritMs);
			} else if (type === EventType.Died) {
				// b = 1: purged at round end, nothing to see.
				if (b === 1) return;
				const x = Position.x[entity] ?? 0;
				const z = Position.z[entity] ?? 0;
				if (gore) {
					burst(x, z, count(config.bloodCubesPerDeath), bloodColors(), 5, 6, true);
					addDecal(x, z);
				} else {
					burst(x, z, config.reducedDeathCubes, [reducedCube], 4, 4, false);
				}
				if (options.isBoss?.(entity)) options.onHitStop?.(config.hitStopBossDeathMs);
			} else if (type === EventType.Exploded) {
				burst(a, b, count(config.explosionCubes), explosionColors, 3 + c, 7, false);
			}
		},
		update(dt): void {
			particles.update(dt);
			numbers.update(dt);
		},
		shift(dx, dz): void {
			particles.shift(dx, dz);
			decals.shift(dx, dz);
			numbers.shift(dx, dz);
		},
	};
}
