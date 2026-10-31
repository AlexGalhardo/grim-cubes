import { readFileSync } from "node:fs";
import { createInputState, createStreams } from "../../packages/core/src/index";
import {
	BehaviorKind,
	createBehaviorSystem,
	createDamageSystem,
	createDeathSystem,
	createEventBuffer,
	createGameWorld,
	createPickupSystem,
	createProgress,
	createProjectilePool,
	createProjectileSystem,
	createRunSystem,
	createSeparationSystem,
	createSpawnSystem,
	createTargetingSystem,
	createWeaponSystem,
	damageConfigFromHero,
	type EnemyDef,
	EventType,
	type FragmentsConfig,
	Health,
	type HeroCombatData,
	inputSystem,
	movementSystem,
	Position,
	queryEnemies,
	type RunConfig,
	type SpawnConfig,
	STEP,
	spawnHero,
	type WeaponDef,
	type XpConfig,
} from "../../packages/game/src/index";

/** The slices of `data/*.json` the harness reads. The files are validated by `tools/data-check`. */
export interface SimData {
	rounds: RunConfig & {
		spawn: SpawnConfig;
		ai: { separationWeight: number; attackAnimationSeconds: number };
		fragments: FragmentsConfig;
		xp: XpConfig;
		difficulties: Array<{ id: string; hpDamageMult: number }>;
	};
	enemies: Array<{
		id: string;
		radius: number;
		hpBase: number;
		hpPerRound: number;
		damageBase: number;
		damagePerRound: number;
		speed: number;
		behavior: string;
		behaviorParams?: Record<string, number>;
		fragments: number;
	}>;
	weapons: Array<WeaponDef & { id: string }>;
	biomes: Array<{ id: string; enemyPool: string[] }>;
	hero: HeroCombatData & {
		startingWeapon: string;
		base: {
			maxHp: number;
			speed: number;
			pickupRadius: number;
			radius: number;
			armor: number;
			dodge: number;
			critChance: number;
			critMult: number;
			damage: number;
			attackSpeed: number;
		};
		caps: { attackSpeedPerSecond: number };
		combat: { targetPriorityDistanceMult: number; contactCooldownSeconds: number };
	};
}

export interface SimOptions {
	seed: number;
	rounds: number;
	difficulty: string;
	weapon?: string;
}

export interface RoundReport {
	round: number;
	kills: number;
	damageTaken: number;
	gold: number;
}

export type Outcome = "completed" | "died" | "boss-round" | "timeout";

export interface SimReport {
	seed: number;
	roundsRequested: number;
	difficulty: string;
	weapon: string;
	policy: "flee-nearest";
	outcome: Outcome;
	/** Round the run was in when it stopped (the last completed round when `outcome` is "completed"). */
	roundReached: number;
	kills: number;
	damageDealt: number;
	damageTaken: number;
	gold: number;
	level: number;
	heroHp: number;
	steps: number;
	eventsDropped: number;
	perRound: RoundReport[];
}

/** Enemy behaviours the game implements so far (chase and zigzag, P-03-03); the others are not spawned. */
const SUPPORTED: Record<string, number> = { chase: BehaviorKind.Chase, zigzag: BehaviorKind.Zigzag };

const MAX_SECONDS_PER_ROUND = 75;

export function loadSimData(): SimData {
	const read = (file: string): unknown =>
		JSON.parse(readFileSync(new URL(`../../data/${file}`, import.meta.url), "utf8"));
	// The files are validated by tools/data-check; here they are only narrowed to the slices the sim reads.
	return {
		rounds: read("rounds.json"),
		enemies: read("enemies.json"),
		weapons: read("weapons.json"),
		biomes: read("biomes.json"),
		hero: read("hero.json"),
	} as SimData;
}

export function runSim(data: SimData, options: SimOptions): SimReport {
	const { rounds: roundsCfg, enemies: enemyData, hero: heroData } = data;
	const difficulty = roundsCfg.difficulties.find((d) => d.id === options.difficulty);
	if (!difficulty) throw new Error(`unknown difficulty "${options.difficulty}"`);
	const weaponId = options.weapon ?? heroData.startingWeapon;
	const weaponDef = data.weapons.find((w) => w.id === weaponId);
	const biome = data.biomes[0];
	if (!weaponDef || !biome) throw new Error(`unknown weapon "${weaponId}" or no biome`);

	const streams = createStreams(options.seed);
	const world = createGameWorld();
	const events = createEventBuffer();
	const progress = createProgress();
	const hero = spawnHero(world, {
		speed: heroData.base.speed,
		maxHp: heroData.base.maxHp,
		radius: heroData.base.radius,
	});

	const enemyDefs: EnemyDef[] = enemyData.map((e) => ({
		radius: e.radius,
		hpBase: e.hpBase,
		hpPerRound: e.hpPerRound,
		damageBase: e.damageBase,
		damagePerRound: e.damagePerRound,
		speed: e.speed,
		armor: e.behaviorParams?.armor ?? 0,
		behavior: SUPPORTED[e.behavior] ?? 0,
	}));
	const pool = biome.enemyPool
		.map((id) => enemyData.findIndex((e) => e.id === id))
		.filter((index) => index >= 0 && (enemyData[index]?.behavior ?? "") in SUPPORTED)
		.map((type) => ({ type, weight: 1 }));
	if (pool.length === 0) throw new Error("no enemy with an implemented behavior in the first biome");
	const maxRadius = Math.max(...enemyDefs.map((e) => e.radius));

	const zigzag = enemyData.find((e) => e.behavior === "zigzag")?.behaviorParams;
	const damage = createDamageSystem({
		config: damageConfigFromHero(heroData),
		rng: { dodge: streams.dodge, combat: streams.combat },
		events,
		hero,
		stats: {
			armor: heroData.base.armor,
			dodge: heroData.base.dodge,
			critMult: heroData.base.critMult,
			lifeSteal: 0,
		},
	});
	const behavior = createBehaviorSystem(
		{
			zigzag: { amplitude: zigzag?.amplitude ?? 0, periodSeconds: zigzag?.periodSeconds ?? 1 },
			contactCooldownSeconds: heroData.combat.contactCooldownSeconds,
			attackAnimationSeconds: roundsCfg.ai.attackAnimationSeconds,
		},
		damage.queue,
	);
	const separation = createSeparationSystem({ weight: roundsCfg.ai.separationWeight, maxRadius });
	const targeting = createTargetingSystem(
		{ priorityDistanceMult: heroData.combat.targetPriorityDistanceMult, retargetEvery: 3 },
		separation.hash,
	);
	const projectiles = createProjectilePool(world, events);
	const weapon = createWeaponSystem({
		weapon: weaponDef,
		tier: 0,
		stats: {
			damage: heroData.base.damage,
			attackSpeed: heroData.base.attackSpeed,
			critChance: heroData.base.critChance,
			range: 0,
		},
		attackSpeedCap: heroData.caps.attackSpeedPerSecond,
		queue: damage.queue,
		events,
		targeting,
		enemies: separation.hash,
		rng: streams.weapon,
		projectiles,
	});
	const projectileSystem = createProjectileSystem({
		pool: projectiles,
		queue: damage.queue,
		enemies: separation.hash,
		maxEnemyRadius: maxRadius,
	});

	const spawnSystem = createSpawnSystem({
		config: roundsCfg.spawn,
		enemies: enemyDefs,
		rng: streams.spawn,
		events,
		onSpawn: (w, x, z) => run.releaseFromBag(w, x, z),
	});
	const run = createRunSystem({
		config: roundsCfg,
		spawn: spawnSystem,
		events,
		poolFor: () => pool,
		difficultyMult: difficulty.hpDamageMult,
	});
	const death = createDeathSystem({
		fragments: roundsCfg.fragments,
		fragmentsPerType: enemyData.map((e) => e.fragments),
		rng: streams.loot,
		round: () => run.round,
	});
	const pickup = createPickupSystem({
		fragments: roundsCfg.fragments,
		xp: roundsCfg.xp,
		progress,
		stats: { pickupRadius: heroData.base.pickupRadius, xpGain: 0 },
	});

	const input = createInputState();
	const report: SimReport = {
		seed: options.seed,
		roundsRequested: options.rounds,
		difficulty: options.difficulty,
		weapon: weaponId,
		policy: "flee-nearest",
		outcome: "timeout",
		roundReached: 1,
		kills: 0,
		damageDealt: 0,
		damageTaken: 0,
		gold: 0,
		level: 1,
		heroHp: heroData.base.maxHp,
		steps: 0,
		eventsDropped: 0,
		perRound: [],
	};
	let roundKills = 0;
	let roundDamageTaken = 0;

	const visit = (type: number, a: number, b: number, _c: number, entity: number): void => {
		if (type === EventType.Damaged) report.damageDealt += a;
		else if (type === EventType.PlayerHit) {
			report.damageTaken += a;
			roundDamageTaken += a;
		} else if (type === EventType.Died && entity !== hero && b === 0) {
			report.kills++;
			roundKills++;
		} else if (type === EventType.RoundEnded) {
			report.perRound.push({
				round: a,
				kills: roundKills,
				damageTaken: roundDamageTaken,
				gold: progress.gold,
			});
			roundKills = 0;
			roundDamageTaken = 0;
		}
	};

	/** Policy (P-07-04 base): run away from the nearest enemy; stand still when none is alive. */
	function steer(): void {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		let best = Number.POSITIVE_INFINITY;
		let dx = 0;
		let dz = 0;
		const list = queryEnemies(world);
		for (let i = 0; i < list.length; i++) {
			const e = list[i] ?? 0;
			const ex = (Position.x[e] ?? 0) - hx;
			const ez = (Position.z[e] ?? 0) - hz;
			const d = ex * ex + ez * ez;
			if (d < best) {
				best = d;
				dx = ex;
				dz = ez;
			}
		}
		const length = Math.sqrt(best);
		input.moveX = length > 0 && Number.isFinite(length) ? -dx / length : 0;
		input.moveZ = length > 0 && Number.isFinite(length) ? -dz / length : 0;
	}

	const maxSteps = Math.ceil((options.rounds * MAX_SECONDS_PER_ROUND) / STEP);
	run.newRun();
	for (let step = 0; step < maxSteps; step++) {
		const state = run.state;
		if (state === "Results") {
			report.outcome = "died";
			break;
		}
		if (state === "BossIntro" || state === "BossRound") {
			report.outcome = "boss-round";
			break;
		}
		if (state === "Shop") {
			if (run.round >= options.rounds) {
				report.outcome = "completed";
				break;
			}
			run.closeShop();
			continue;
		}

		steer();
		inputSystem(world, hero, input);
		run.run(world, hero);
		behavior.run(world, hero);
		separation.run(world);
		movementSystem(world);
		targeting.run(world, hero, weapon.range);
		weapon.run(world, hero);
		projectileSystem.run(world);
		damage.run(world);
		death.run(world);
		pickup.run(world, hero);
		events.consume(visit);
		if ((Health.hp[hero] ?? 0) <= 0) run.heroDied();
		report.steps++;
	}

	report.roundReached = run.round;
	report.gold = progress.gold;
	report.level = progress.level;
	report.heroHp = Math.max(0, Health.hp[hero] ?? 0);
	report.eventsDropped = events.dropped;
	return report;
}
