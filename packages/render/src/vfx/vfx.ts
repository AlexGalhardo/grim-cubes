import { Color3 } from "@babylonjs/core/Maths/math.color";
import { mulberry32 } from "@gc/core";
import {
	Bleed,
	Boss,
	bossesData,
	EnemyType,
	EventType,
	enemiesData,
	enrageMult,
	type GameWorld,
	heroData,
	MAX_ENTITIES,
	Position,
	queryBleeding,
	renderData,
	roundsData,
	weaponsData,
} from "@gc/game";
import { CAMERA } from "../scene/camera";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import { createDecalPool, type DecalPool } from "./decals";
import { createDamageNumbers, type DamageNumbers } from "./digits";
import { createParticlePool, type ParticlePool } from "./particles";
import { createSlash, type Slash } from "./slash";
import { createTelegraph, type Telegraph } from "./telegraph";
import { createZones, type Zones } from "./zones";

type Rgb = readonly [number, number, number];

const rgb = (hex: string): Rgb => {
	const c = Color3.FromHexString(hex);
	return [c.r, c.g, c.b];
};

/** How long the scream ring takes to reach its radius. */
const SCREAM_SECONDS = 0.6;
/** How long the Forgemaster shockwave ring takes to reach its radius. */
const SHOCKWAVE_SECONDS = 0.4;
/** Cubes thrown when the hero picks a consumable up (red for the vial, ember for the magnet). */
const PICKUP_CUBES = 6;
const SUMMON_CUBES = 14;
const EGG_CUBES = 4;
/** GDD section 23: the boss execution lasts 1.5 s. */
const EXECUTION_SECONDS = 1.5;
const EXECUTION_BURSTS = 3;
const EXECUTION_CUBES = 12;
/** Blood drips per second per bleeding enemy, and the cap on drips emitted in one frame. */
const BLEED_DRIPS_PER_SECOND = 6;
const BLEED_DRIPS_PER_FRAME = 16;
const THORN_SPIKES = 6;
/** Cutting-arc width when the starting weapon has none in data (degrees). */
const SLASH_FALLBACK_ARC = 120;
const PROPS_PER_BIOME = 10;
/** A blood drip that lands leaves a decal this big (u). */
const MICRO_DECAL_SIZE = 0.25;
/** Art Bible section 9: the boss comes apart into 12 to 20 large pieces. */
const EXECUTION_PIECES = 16;
const PIECE_SIZE_MULT = 4;
const FLASH_RADIUS = 9;
const FLASH_SECONDS = 0.5;

export type VfxConfig = typeof renderData.vfx;

export interface VfxOptions {
	config?: VfxConfig;
	/** Called with a duration in ms when an event asks for a hit-stop (critical hit, boss death). */
	onHitStop?: (ms: number) => void;
	/** Whether a dying entity is a boss, for the longer hit-stop. */
	isBoss?: (entity: number) => boolean;
	/** prefers-reduced-motion (Art Bible 16.8): no hit pulse and no camera shake; the static low-HP vignette stays. */
	reducedMotion?: () => boolean;
	/** Flash reduction (Options): no hit-stop freeze, no shake and no execution flash ring. */
	flashReduced?: () => boolean;
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
	/** Size multiplier of the damage numbers (0.7 on the small landscape screens). */
	setNumberScale(scale: number): void;
	/** Applies a preset's pool sizes live (the pools are allocated for the largest preset). */
	setPools(particles: number, decals: number): void;
	/**
	 * Status looks read from the world: blood drips from bleeding enemies (`Bleed`). Call once per rendered frame with the frame time.
	 */
	syncStatus(world: GameWorld, dtSeconds: number): void;
	readonly gore: boolean;
	readonly particles: ParticlePool;
	readonly decals: DecalPool;
	readonly numbers: DamageNumbers;
	readonly telegraph: Telegraph;
	readonly slash: Slash;
	readonly zones: Zones;
	/** `speedMult` of the elite modifiers the boss carries (the Swift one): the charge line grows with it. */
	setBossSpeedMult(mult: number): void;
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
	const particles = createParticlePool(game.scene, config.particlePool, config.gravity, (x, z, micro) => {
		if (gore) addDecal(x, z, micro ? MICRO_DECAL_SIZE : undefined);
	});
	const numbers = createDamageNumbers(game.scene, {
		pool: config.damageNumberPool,
		lifeSeconds: config.damageNumberLifeSeconds,
		rise: config.damageNumberRise,
		height: config.damageNumberHeight,
		elevation: Math.PI / 2 - CAMERA.beta,
		color: rgb(PALETTE.damageWhite),
		critColor: emberLight,
	});

	const telegraph = createTelegraph(game);
	const slash = createSlash(
		game,
		weaponsData.find((w) => w.id === heroData.startingWeapon)?.arcDegrees ?? SLASH_FALLBACK_ARC,
	);
	const zones = createZones(game);
	let bossSpeedMult = 1;
	/** Pattern index of the last BossPattern event per entity. */
	const patternOf = new Uint8Array(MAX_ENTITIES);
	// Execution of a boss (BossDied): a few bursts spread over EXECUTION_SECONDS while the death clip plays.
	let pulse = 0;
	let shakeAmplitude = 0;
	let shakeLeft = 0;
	let clock = 0;
	const shake = (amplitude: number): void => {
		if (options.reducedMotion?.() || options.flashReduced?.()) return;
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

	function addDecal(x: number, z: number, size?: number): void {
		const color = rng.chance(config.bloodLightShare) ? bloodLight : blood;
		decals.add(
			x,
			z,
			size ?? between(config.decalSizeRange),
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
		landsAsDecal: boolean | "micro",
		sizeMult = 1,
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
				between(config.cubeSizeRange) * sizeMult,
				color[0],
				color[1],
				color[2],
				config.particleLifeSeconds,
				landsAsDecal === "micro"
					? "micro"
					: landsAsDecal && rng.chance(config.decalFromLandingChance),
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
	/** Piece colours of each boss's execution, by `bosses.json` id: its own materials, one ember-light shard in four. */
	const piecePalettes: Readonly<Record<string, readonly Rgb[]>> = {
		gravedigger: [rgb(PALETTE.ironLight), rgb(PALETTE.rust), rgb(PALETTE.boneDark), emberLight],
		swamp_matriarch: [rgb(PALETTE.mud), rgb(PALETTE.boneDark), rgb(PALETTE.bone), emberLight],
		forgemaster: [rgb(PALETTE.iron), rgb(PALETTE.ironDark), rgb(PALETTE.rust), emberLight],
		alpha_hunter: [rgb(PALETTE.mist), rgb(PALETTE.shadow), rgb(PALETTE.bone), emberLight],
		nest_queen: [rgb(PALETTE.bloodLight), rgb(PALETTE.bone), rgb(PALETTE.boneDark), emberLight],
	};
	const spikeColors: readonly Rgb[] = [rgb(PALETTE.ironLight), rgb(PALETTE.iron), rgb(PALETTE.emberLight)];
	const fleshBurst: readonly Rgb[] = [rgb(PALETTE.flesh), rgb(PALETTE.bloodLight), rgb(PALETTE.bone)];
	const biomeDust: readonly (readonly Rgb[])[] = [
		[rgb(PALETTE.boneDark), rgb(PALETTE.rust)],
		[rgb(PALETTE.mud), rgb(PALETTE.sludge), rgb(PALETTE.boneDark)],
		[rgb(PALETTE.ironDark), rgb(PALETTE.iron), rgb(PALETTE.ember)],
		[rgb(PALETTE.flesh), rgb(PALETTE.ironLight), rgb(PALETTE.bloodLight)],
	];
	const propDust: readonly Rgb[] = [rgb(PALETTE.boneDark), rgb(PALETTE.rust)];

	return {
		particles,
		decals,
		numbers,
		telegraph,
		slash,
		zones,
		setBossSpeedMult(mult): void {
			bossSpeedMult = mult;
		},
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
		syncStatus(world, dt): void {
			if (dt <= 0) return;
			const bleeding = queryBleeding(world);
			let drips = 0;
			for (let i = 0; i < bleeding.length && drips < BLEED_DRIPS_PER_FRAME; i++) {
				const e = bleeding[i] ?? 0;
				if ((Bleed.ticks[e] ?? 0) <= 0 || !rng.chance(dt * BLEED_DRIPS_PER_SECOND)) continue;
				burst(
					Position.x[e] ?? 0,
					Position.z[e] ?? 0,
					1,
					bloodColors(),
					0.6,
					1.5,
					gore ? "micro" : false,
				);
				drips++;
			}
		},
		setPools(particleLimit, decalLimit): void {
			particles.setLimit(particleLimit);
			decals.setLimit(decalLimit);
		},
		setNumberScale(scale): void {
			numbers.setScale(scale);
		},
		setGore(full): void {
			gore = full;
			if (!full) decals.clear();
		},
		onEvent(type, a, b, c, entity): void {
			if (type === EventType.Damaged) {
				const x = Position.x[entity] ?? 0;
				const z = Position.z[entity] ?? 0;
				numbers.spawn(a, x, z, b === 1, entity);
				burst(x, z, count(config.bloodCubesPerHit), bloodColors(), 4, 5, gore);
				if (b === 1 && !options.flashReduced?.()) options.onHitStop?.(config.hitStopCritMs);
			} else if (type === EventType.PlayerHit) {
				// c = 1: the leech drain, which hurts without a pulse or a shake (Orq decision).
				if (c === 1 || options.reducedMotion?.()) return;
				pulse = config.vignetteHit;
				shake(config.shakeHeroHit);
			} else if (type === EventType.Died) {
				telegraph.cancel(entity);
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
					if (!options.flashReduced?.()) options.onHitStop?.(config.hitStopBossDeathMs);
					shake(config.shakeBossDeath);
				}
			} else if (type === EventType.BossTelegraph) {
				// BossPattern always comes first and names the pattern; sizes come from bosses.json.
				const boss = bossesData[(Boss.id[entity] ?? 1) - 1];
				const pattern = boss?.patterns[patternOf[entity] ?? 0];
				const params = pattern?.params;
				const num = (key: string, fallback: number): number => {
					const value = params?.[key];
					return typeof value === "number" ? value : fallback;
				};
				const bossX = Position.x[entity] ?? 0;
				const bossZ = Position.z[entity] ?? 0;
				if (pattern?.id === "shovel_arc") {
					telegraph.arc(entity, a, b, c, num("range", 3));
				} else if (pattern?.id === "line_charge") {
					// The charge runs at the enraged speed and hurts anything its body touches: boss and hero radii count.
					const reach =
						(boss?.speed ?? 0) *
							bossSpeedMult *
							enrageMult(roundsData.boss, Boss.enrageStacks[entity] ?? 0) *
							num("speedMult", 1) *
							num("chargeSeconds", 0.6) +
						(boss?.radius ?? 0) +
						heroData.base.radius;
					telegraph.line(entity, a, b, c, reach, (boss?.radius ?? 1) * 2);
				} else if (pattern?.id === "mud_pool") {
					// a, b = where the pool will form.
					zones.pool(a, b, num("radius", 2.5), c);
				} else if (pattern?.id === "scream") {
					zones.ring(bossX, bossZ, num("radius", 6), c);
				} else if (pattern?.id === "chain_shot") {
					// The first volley fires `directions` shots evenly spread from the telegraph direction (bossPatterns.ts).
					const directions = Math.max(1, Math.round(num("directions", 4)));
					const base = Math.atan2(a, b);
					for (let i = 0; i < directions; i++) {
						const angle = base + (i / directions) * Math.PI * 2;
						telegraph.line(
							entity,
							Math.sin(angle),
							Math.cos(angle),
							c,
							num("range", 18),
							num("projectileRadius", 0.35) * 2,
						);
					}
				} else if (pattern?.id === "hammer_shockwave") {
					zones.pool(bossX, bossZ, num("radius", 7), c);
				} else if (pattern?.id === "stealth") {
					telegraph.arc(entity, a, b, c, num("strikeRange", 2.5));
				} else if (pattern?.id === "leap") {
					// a, b = where the Hunter will land (like mud_pool), not a direction.
					zones.warn(a, b, num("radius", 3.5), c);
				} else if (pattern?.id === "sweep") {
					telegraph.arc(entity, a, b, c, num("range", 5), num("arcDegrees", 200));
				}
			} else if (type === EventType.BossPool) {
				// The pool lasts `durationSeconds` of the mud_pool pattern in bosses.json.
				const mud = bossesData
					.flatMap((boss) => boss.patterns)
					.find((pattern) => pattern.id === "mud_pool")?.params?.durationSeconds;
				zones.pool(a, b, c, typeof mud === "number" ? mud : 8);
			} else if (type === EventType.PropBroken) {
				// Crates, urns, eggs: a puff of bone and rust cubes; c is the prop index (the renderer hides the instance).
				// Props are listed ten per biome in props.json; the event carries the prop type id.
				burst(
					a,
					b,
					count(config.explosionCubes),
					biomeDust[Math.floor(entity / PROPS_PER_BIOME)] ?? propDust,
					3,
					5,
					false,
				);
			} else if (type === EventType.ConsumablePicked) {
				const hero = game.hero.position;
				burst(hero.x, hero.z, PICKUP_CUBES, a === 1 ? bloodLightOnly : explosionColors, 2, 6, false);
			} else if (type === EventType.BossShockwave) {
				zones.ring(a, b, c, SHOCKWAVE_SECONDS);
				shake(config.shakeBossDeath * 0.5);
			} else if (type === EventType.BossScream) {
				zones.ring(a, b, c, SCREAM_SECONDS);
				shake(config.shakeExplosion);
			} else if (type === EventType.ThornsHit) {
				// The spikes leave the hero's feet towards the enemy: direction = enemy - hero.
				const hero = game.hero.position;
				const dx = a - hero.x;
				const dz = b - hero.z;
				const base = Math.atan2(dz, dx);
				const speed = Math.min(14, Math.max(4, c * 4));
				for (let i = 0; i < THORN_SPIKES; i++) {
					const angle = base + (rng.next() - 0.5) * 0.5;
					const color = spikeColors[rng.int(spikeColors.length)] ?? spikeColors[0] ?? emberLight;
					particles.add(
						hero.x,
						0.15 + rng.next() * 0.2,
						hero.z,
						Math.cos(angle) * speed,
						1 + rng.next() * 1.5,
						Math.sin(angle) * speed,
						0.12 + rng.next() * 0.08,
						color[0],
						color[1],
						color[2],
						config.particleLifeSeconds * 0.5,
						false,
					);
				}
			} else if (type === EventType.Swung) {
				// a, b = direction, c = the reach of the weapon now (tier included): the arc is as long as the damage.
				slash.fire(game.hero.position.x, game.hero.position.z, a, b, c);
			} else if (type === EventType.BossBomb) {
				const bomb = bossesData
					.flatMap((boss) => boss.patterns)
					.find((pattern) => pattern.id === "fly_bomb")?.params?.radius;
				zones.warn(a, b, typeof bomb === "number" ? bomb : 2.5, c);
			} else if (type === EventType.BossEggLaid) {
				burst(a, b, EGG_CUBES, propDust, 2, 3, false);
			} else if (type === EventType.BossEggBroken) {
				burst(a, b, count(config.explosionCubes), fleshBurst, 3, 5, false);
			} else if (type === EventType.BossEggHatched) {
				burst(a, b, count(config.explosionCubes), bloodLightOnly, 3, 5, false);
				shake(config.shakeExplosion * 0.5);
			} else if (type === EventType.BossPattern) {
				patternOf[entity] = a;
			} else if (type === EventType.EnemyTelegraph) {
				const enemy = enemiesData[EnemyType.id[entity] ?? 0];
				const charge = enemy?.behaviorParams;
				const speedMult = Number(charge?.speedMult ?? 1);
				const seconds = Number(charge?.chargeSeconds ?? 0.5);
				// The charge hurts what the enemy body touches: its radius and the hero's both count.
				const reach =
					(enemy?.speed ?? 0) * speedMult * seconds + (enemy?.radius ?? 0) + heroData.base.radius;
				telegraph.line(entity, a, b, c, reach, (enemy?.radius ?? 0.5) * 2);
			} else if (type === EventType.BossSummon) {
				burst(a, b, SUMMON_CUBES, explosionColors, 4, 6, false);
			} else if (type === EventType.BossDied) {
				executionLeft = EXECUTION_SECONDS;
				// The pieces fly at once with a bright flash ring; the bursts below keep the blood coming for 1.5 s.
				const id = bossesData[(Boss.id[entity] ?? 0) - 1]?.id ?? "";
				burst(
					a,
					b,
					EXECUTION_PIECES,
					gore ? (piecePalettes[id] ?? explosionColors) : reducedOnly,
					6,
					9,
					false,
					PIECE_SIZE_MULT,
				);
				// Flash reduction swaps the bright ring for a dark wave: the same beat, nothing that flashes.
				if (options.flashReduced?.()) zones.wave(a, b, FLASH_RADIUS, FLASH_SECONDS);
				else zones.ring(a, b, FLASH_RADIUS, FLASH_SECONDS);
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
			slash.update(dt);
			zones.update(dt);
			pulse = Math.max(0, pulse - (config.vignetteHit / config.vignetteSeconds) * dt);
			clock += dt;
			const offset = game.camera.targetScreenOffset;
			if (dt <= 0) {
				// Paused: a shake frozen mid-way would leave the camera off-centre.
				offset.x = offset.y = 0;
			} else if (shakeLeft > 0) {
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
			zones.shift(dx, dz);
			particles.shift(dx, dz);
			decals.shift(dx, dz);
			numbers.shift(dx, dz);
		},
	};
}
