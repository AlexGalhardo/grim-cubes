import { Color3 } from "@babylonjs/core/Maths/math.color";
import { mulberry32 } from "@gc/core";
import { EventType, Position, renderData } from "@gc/game";
import { CAMERA } from "../scene/camera";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createDecalPool, type DecalPool } from "./decals";
import { createDamageNumbers, type DamageNumbers } from "./digits";
import { createParticlePool, type ParticlePool } from "./particles";
import { createTelegraph, type Telegraph } from "./telegraph";

type Rgb = readonly [number, number, number];

const rgb = (hex: string): Rgb => {
	const c = Color3.FromHexString(hex);
	return [c.r, c.g, c.b];
};

/** Hero distance below which a BossTelegraph is the shovel arc (its maxDistance is 3.5, the charge needs 5). */
const ARC_OR_LINE_DISTANCE = 4.25;
const BOSS_ARC_RANGE = 3;
/** Charge reach: speed 2.4 x speedMult 4 x 0.6 s in bosses.json, rounded up. */
const BOSS_LINE_LENGTH = 6;
const BOSS_LINE_WIDTH = 2.4;
/** Hunter charge reach: 6.5 x 3 x 0.6 s in enemies.json, rounded up. */
const HUNTER_LINE_LENGTH = 12;
const HUNTER_LINE_WIDTH = 1;
const SUMMON_CUBES = 14;
/** GDD section 23: the boss execution lasts 1.5 s. */
const EXECUTION_SECONDS = 1.5;
const EXECUTION_BURSTS = 3;
const EXECUTION_CUBES = 12;

export type VfxConfig = typeof renderData.vfx;

export interface VfxOptions {
	config?: VfxConfig;
	/** Called with a duration in ms when an event asks for a hit-stop (critical hit, boss death). */
	onHitStop?: (ms: number) => void;
	/** Whether a dying entity is a boss, for the longer hit-stop. */
	isBoss?: (entity: number) => boolean;
	/** Whether a damaged entity is the hero: drives the hit vignette and the camera shake. */
	isHero?: (entity: number) => boolean;
	/** Hero HP as a fraction of the maximum, for the low-HP vignette. */
	heroHealth?: () => number;
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
	readonly telegraph: Telegraph;
	/** Red edge vignette strength 0..1 (hit pulse plus low-HP warning), for the HUD. */
	readonly vignette: number;
	/** Camera shake in progress: remaining strength 0..1 of the last trigger. */
	readonly shaking: boolean;
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

	const telegraph = createTelegraph(game);
	// Execution of a boss (BossDied): a few bursts spread over EXECUTION_SECONDS while the death clip plays.
	let pulse = 0;
	let shakeAmplitude = 0;
	let shakeLeft = 0;
	let clock = 0;
	const shake = (amplitude: number): void => {
		if (amplitude >= shakeAmplitude * (shakeLeft / config.shakeSeconds)) {
			shakeAmplitude = amplitude;
			shakeLeft = config.shakeSeconds;
		}
	};
	let executionLeft = 0;
	let executionX = 0;
	let executionZ = 0;
	let executionNext = 0;

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

	// Constants: an array literal per event would allocate on every hit.
	const bloodOnly: readonly Rgb[] = [blood];
	const bloodLightOnly: readonly Rgb[] = [bloodLight];
	const reducedOnly: readonly Rgb[] = [reducedBlood];
	const bloodColors = (): readonly Rgb[] =>
		gore ? (rng.chance(config.bloodLightShare) ? bloodLightOnly : bloodOnly) : reducedOnly;
	const reducedCubeOnly: readonly Rgb[] = [reducedCube];
	const explosionColors: readonly Rgb[] = [ember, emberLight];

	return {
		particles,
		decals,
		numbers,
		telegraph,
		get gore(): boolean {
			return gore;
		},
		get vignette(): number {
			const ratio = options.heroHealth?.() ?? 1;
			const low =
				ratio < config.vignetteLowHpBelow
					? config.vignetteLowHpMax * (1 - ratio / config.vignetteLowHpBelow)
					: 0;
			return Math.min(1, Math.max(pulse, low));
		},
		get shaking(): boolean {
			return shakeLeft > 0;
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
				if (options.isHero?.(entity)) {
					pulse = config.vignetteHit;
					shake(config.shakeHeroHit);
				}
			} else if (type === EventType.Died) {
				// b = 1: purged at round end, nothing to see.
				if (b === 1) return;
				const x = Position.x[entity] ?? 0;
				const z = Position.z[entity] ?? 0;
				if (gore) {
					burst(x, z, count(config.bloodCubesPerDeath), bloodColors(), 5, 6, true);
					addDecal(x, z);
				} else {
					burst(x, z, config.reducedDeathCubes, reducedCubeOnly, 4, 4, false);
				}
				if (options.isBoss?.(entity)) {
					options.onHitStop?.(config.hitStopBossDeathMs);
					shake(config.shakeBossDeath);
				}
			} else if (type === EventType.BossTelegraph) {
				// The event carries no pattern id: the shovel (maxDistance 3.5) only starts next to the hero, the charge
				// (minDistance 5) only from afar.
				const dx = Position.x[entity] ?? 0;
				const dz = Position.z[entity] ?? 0;
				const hero = game.hero.position;
				if (Math.hypot(hero.x - dx, hero.z - dz) < ARC_OR_LINE_DISTANCE) {
					telegraph.arc(entity, a, b, c, BOSS_ARC_RANGE);
				} else {
					telegraph.line(entity, a, b, c, BOSS_LINE_LENGTH, BOSS_LINE_WIDTH);
				}
			} else if (type === EventType.EnemyTelegraph) {
				telegraph.line(entity, a, b, c, HUNTER_LINE_LENGTH, HUNTER_LINE_WIDTH);
			} else if (type === EventType.BossSummon) {
				burst(a, b, SUMMON_CUBES, explosionColors, 4, 6, false);
			} else if (type === EventType.BossDied) {
				executionLeft = EXECUTION_SECONDS;
				executionX = a;
				executionZ = b;
				executionNext = 0;
			} else if (type === EventType.Exploded) {
				burst(a, b, count(config.explosionCubes), explosionColors, 3 + c, 7, false);
				shake(config.shakeExplosion);
			}
		},
		update(dt): void {
			if (executionLeft > 0) {
				executionLeft -= dt;
				executionNext -= dt;
				if (executionNext <= 0) {
					executionNext = EXECUTION_SECONDS / EXECUTION_BURSTS;
					burst(
						executionX,
						executionZ,
						EXECUTION_CUBES,
						gore ? bloodColors() : reducedOnly,
						5,
						8,
						gore,
					);
					burst(executionX, executionZ, EXECUTION_CUBES / 2, explosionColors, 4, 9, false);
				}
			}
			telegraph.update(dt);
			pulse = Math.max(0, pulse - (config.vignetteHit / config.vignetteSeconds) * dt);
			clock += dt;
			const offset = game.camera.targetScreenOffset;
			if (shakeLeft > 0) {
				shakeLeft = Math.max(0, shakeLeft - dt);
				const strength = shakeAmplitude * (shakeLeft / config.shakeSeconds);
				offset.x = Math.sin(clock * 83) * strength;
				offset.y = Math.cos(clock * 71) * strength;
			} else if (offset.x !== 0 || offset.y !== 0) {
				offset.x = offset.y = 0;
			}
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
