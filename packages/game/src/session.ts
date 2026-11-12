import { createStreams, type InputState, type MetaState } from "@gc/core";
import { hasComponent } from "bitecs";
import {
	behaviorConfigFromData,
	biomesData,
	bossesData,
	cardsData,
	consumablesData,
	elitesData,
	enemiesData,
	equipmentData,
	heroData,
	heroesData,
	itemsData,
	propsData,
	roundsData,
	spellsData,
	synergiesData,
	toBiomeDefs,
	toEnemyDefs,
	weaponsData,
	worldData,
} from "./data";
import type { DifficultyData } from "./data/types";
import { Elite, Health, IgnoresProps, Position, Velocity } from "./ecs/components";
import { createEnemyShotPool } from "./ecs/enemyShot";
import { createEventBuffer } from "./ecs/events";
import { spawnHero } from "./ecs/hero";
import { createProjectilePool } from "./ecs/projectile";
import { createGameWorld } from "./ecs/world";
import { STEP } from "./loop";
import { damageConfigFromHero } from "./rules/damage";
import { createRunStats } from "./rules/runstats";
import { buildClassSpells, spellLevel } from "./rules/spells";
import { createPlayerStats, regenPerSecond } from "./rules/stats";
import { createBehaviorSystem } from "./systems/behavior";
import { createBossRoster } from "./systems/boss";
import { createBreakableSystem } from "./systems/breakables";
import { createDamageSystem } from "./systems/damage";
import { createDashSystem } from "./systems/dash";
import {
	createAuraSystem,
	createBleedSystem,
	createEffectsSystem,
	createKillEffectsSystem,
	createMagnetSystem,
	createThornsSystem,
} from "./systems/effects";
import { createEliteSystem } from "./systems/elite";
import { createEnemyShotSystem } from "./systems/enemyShot";
import { createHeroStatus } from "./systems/heroStatus";
import { inputSystem } from "./systems/input";
import { createLevelUpSystem } from "./systems/levelup";
import {
	applyHarvest,
	applyRoundEndBonus,
	createDeathSystem,
	createPickupSystem,
	createProgress,
} from "./systems/loot";
import { createMaterials } from "./systems/materials";
import { movementSystem } from "./systems/movement";
import { createPlayerSpells } from "./systems/playerSpells";
import { createProjectileSystem } from "./systems/projectile";
import { createRunSystem } from "./systems/round";
import { createSeparationSystem } from "./systems/separation";
import { createShopSystem } from "./systems/shop";
import { createSpawnSystem } from "./systems/spawn";
import { createSpellSystem } from "./systems/spells";
import { createStatsSystem } from "./systems/stats";
import { createSynergySystem } from "./systems/synergies";
import { createTargetingSystem } from "./systems/targeting";
import { createWeaponSystem } from "./systems/weapon";
import { createArena } from "./world/arena";
import { biomeForRound } from "./world/biome";
import { createChunkGenerator } from "./world/chunkGen";
import { type ChunkHooks, createChunkSystem } from "./world/chunkSystem";
import { cullDistantEnemies } from "./world/cull";
import { applyOriginShift, createOrigin } from "./world/originShift";
import { createPropCollision } from "./world/propCollision";

export interface GameSessionOptions {
	seed: number;
	difficulty: DifficultyData;
	/** The account: Ossuary nodes shape the run and milestones gate the item pool. */
	meta: MetaState;
	/** Hero id from `data/heroes.json`; defaults to the first one. */
	hero?: string;
	/** Starting weapon id; defaults to the hero's own (the simulator tries others). */
	weapon?: string;
}

/**
 * One run of the game without render, UI or storage (P-07-05): every system of the step, wired once, so the game
 * (`apps/web`) and the simulator (`tools/sim`) run the same code. The caller feeds input and reads the world, the
 * events and the phase state; it opens screens and saves results itself.
 */
function build(options: GameSessionOptions) {
	const { seed, meta, difficulty } = options;
	const rng = createStreams(seed);
	const events = createEventBuffer();
	const world = createGameWorld();
	const origin = createOrigin();
	const progress = createProgress();
	const runStats = createRunStats();

	const { fragments, xp } = roundsData;

	const heroDef = heroesData.find((h) => h.id === (options.hero ?? heroesData[0]?.id));
	if (!heroDef) throw new Error(`Unknown hero ${options.hero}`);
	const runHeroData = {
		...heroData,
		base: {
			...heroData.base,
			...heroDef.base,
			critMult: heroDef.base.critMult ?? heroData.base.critMult,
		},
	};

	const hero = spawnHero(world, {
		speed: runHeroData.base.speed,
		maxHp: runHeroData.base.maxHp,
		radius: runHeroData.base.radius,
	});
	const stats = createStatsSystem(runHeroData, createPlayerStats());
	// Before anything the run picks up: a checkpoint skips it.
	stats.add(heroDef.passive.modifiers);
	stats.run(hero);

	const owned = new Map<string, number>();
	const materials = createMaterials(progress, events);
	// The dash is part of every class now: the Ossuary no longer sells it (S-22-01).
	const dash = createDashSystem(heroData.dash, {
		unlocked: true,
		charges: 1,
		cooldownReductionSeconds: 0,
		events,
	});
	const itemEffects = createEffectsSystem(itemsData, owned, undefined, events);

	const synergies = createSynergySystem(itemsData, owned, synergiesData, stats);
	const startingWeapon = weaponsData.find((w) => w.id === (options.weapon ?? heroDef.startingWeapon));
	if (!startingWeapon)
		throw new Error(`Unknown starting weapon ${options.weapon ?? heroDef.startingWeapon}`);
	const enemyIds = enemiesData.map((e) => e.id);

	const hooks: { heroHit?: (source: number, taken: number) => void } = {};
	const damage = createDamageSystem({
		config: damageConfigFromHero(heroData),
		rng,
		events,
		hero,
		stats: stats.stats,
		effects: itemEffects.effects,
		runStats,
		onHeroHit: (source, taken) => hooks.heroHit?.(source, taken),
	});
	const separation = createSeparationSystem({
		weight: roundsData.ai.separationWeight,
		maxRadius: Math.max(...enemiesData.map((e) => e.radius)),
	});
	const targeting = createTargetingSystem(
		{ priorityDistanceMult: heroData.combat.targetPriorityDistanceMult, retargetEvery: 3 },
		separation.hash,
	);
	const projectiles = createProjectilePool(world, events);
	const weapon = createWeaponSystem({
		weapon: startingWeapon,
		tier: 0,
		stats: stats.stats,
		attackSpeedCap: heroData.caps.attackSpeedPerSecond,
		queue: damage.queue,
		events,
		targeting,
		enemies: separation.hash,
		rng: rng.weapon,
		projectiles,
		effects: itemEffects.effects,
	});
	const projectileSystem = createProjectileSystem({
		pool: projectiles,
		queue: damage.queue,
		enemies: separation.hash,
		maxEnemyRadius: Math.max(...enemiesData.map((e) => e.radius)),
		hero,
		events,
	});
	const maxEnemyRadius = Math.max(...enemiesData.map((e) => e.radius));
	// `run` is created after `spawn` but spawn must call back into it for the fragment bag.
	const arena = createArena(worldData.arena, () => run.round);
	/** `forced` pins the biome whatever the round says (debug API and captures only). */
	const biome: { index: number; forced: number | null } = { index: 0, forced: null };
	const bag: { release?: (w: typeof world, x: number, z: number) => void } = {};
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: rng.spawn,
		events,
		// propCollision is created further down; it is only called once the loop runs.
		isBlocked: (x, z) => propCollision.overlaps(origin, x, z, maxEnemyRadius),
		// GDD 10.2: the biome of the round decides the enemy pool (60/30/10 with its neighbours in the list).
		biomes: {
			at: () => biome.index,
			pools: biomesData.map((biome) => biome.enemyPool.map((id) => enemyIds.indexOf(id))),
		},
		onSpawn: (w, x, z) => bag.release?.(w, x, z),
		arena,
	});
	const enemyShots = createEnemyShotPool(world);
	const enemyShotSystem = createEnemyShotSystem(enemyShots, damage.queue);
	const behavior = createBehaviorSystem(
		behaviorConfigFromData(
			enemiesData,
			heroData.combat.contactCooldownSeconds,
			roundsData.ai.attackAnimationSeconds,
			roundsData.spawn.maxSimultaneous,
		),
		damage.queue,
		{ events, spawn, shots: enemyShots, drain: damage.drain, enemySpeed: () => stats.stats.enemySpeed },
	);
	const elitePool = [
		{ type: enemyIds.indexOf("husk"), weight: 6 },
		{ type: enemyIds.indexOf("wail"), weight: 4 },
	];
	const elite = createEliteSystem({
		config: elitesData,
		spawn,
		events,
		queue: damage.queue,
		rng: rng.elite,
		pool: () => elitePool,
		ring: { min: roundsData.spawn.ringMin, max: roundsData.spawn.ringMax },
		hero,
		materials,
	});
	hooks.heroHit = (source, taken) => {
		elite.handleHeroHit(source, taken);
		boss.handleHeroHit(source, taken);
	};
	const heroStatus = createHeroStatus();
	const boss = createBossRoster(
		{
			rounds: roundsData.boss,
			spawn,
			events,
			queue: damage.queue,
			hero,
			rng: rng.combat,
			summonType: enemyIds.indexOf("husk"),
			enemyIndex: (id) => enemyIds.indexOf(id),
			heroStatus,
			shots: enemyShots,
			eliteModifiers: elitesData.modifiers,
			seed,
			difficulty: () => difficulty.hpDamageMult,
			materials,
			onDefeated: () => {
				run.bossDied();
				for (let i = 0; i < roundsData.boss.freeWeaponUpgrades; i++) weapon.upgrade();
			},
		},
		bossesData,
	);
	const run = createRunSystem({
		config: { flow: roundsData.flow, duration: roundsData.duration, boss: roundsData.boss },
		spawn,
		events,
		// The first biome ring only until biome selection by distance reaches the spawner (SDD 03 section 5).
		poolFor: () => [
			{ type: enemyIds.indexOf("husk"), weight: 6 },
			{ type: enemyIds.indexOf("wail"), weight: 4 },
		],
		difficultyMult: difficulty.hpDamageMult,
		onRoundStart: (round, isBoss) => {
			playerSpells.onRoundStart();
			elite.onRoundStart(round, isBoss);
			if (isBoss) boss.start(world, round);
		},
		onRoundEnd: (round) => {
			applyHarvest(progress, fragments, xp, round, stats.stats.harvest, stats.stats.xpGain);
			applyRoundEndBonus(progress, fragments, xp, itemEffects.effects, stats.stats.xpGain);
		},
	});
	bag.release = run.releaseFromBag;
	const death = createDeathSystem({
		fragments,
		fragmentsPerType: enemiesData.map((e) => e.fragments),
		rng: rng.loot,
		round: () => run.round,
		effects: itemEffects.effects,
		runStats,
		onDeath: (w, e, x, z) => {
			elite.handleDeath(w, e, x, z);
			boss.handleDeath(w, e, x, z);
			killEffects.onKill(w, e, x, z);
			if (hasComponent(w, e, Elite)) breakables.dropFrom(x, z, "elite");
		},
	});
	const pickup = createPickupSystem({
		fragments,
		xp,
		progress,
		stats: stats.stats,
		effects: itemEffects.effects,
		events,
	});
	const aura = createAuraSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		round: () => run.round,
	});
	const magnet = createMagnetSystem({
		effects: itemEffects.effects,
		pull: (seconds) => pickup.pullAll(seconds),
	});
	const bleed = createBleedSystem({ events, runStats });
	const thorns = createThornsSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		cooldownSeconds: heroData.combat.contactCooldownSeconds,
		events,
	});
	// Spell levels come from the Ossuary (S-22): level 1 is free, each owned node of a spell adds one.
	const classSpells = buildClassSpells(spellsData, heroDef.id, (id) =>
		spellLevel(meta.ossuary, id, spellsData.levels.max),
	);
	const spells = createSpellSystem({
		spells: classSpells.auto,
		queue: damage.queue,
		enemies: separation.hash,
		projectiles,
		events,
		round: () => run.round,
	});
	const playerSpells = createPlayerSpells({
		heal: classSpells.heal,
		super: classSpells.super,
		config: spellsData.super,
		queue: damage.queue,
		enemies: separation.hash,
		events,
		round: () => run.round,
		kills: () => runStats.kills,
	});
	// Declared after `death` only for readability: the death hook calls it once the loop runs.
	const killEffects = createKillEffectsSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		events,
		rng: rng.effects,
		round: () => run.round,
		hero,
	});
	const levelUp = createLevelUpSystem({
		progress,
		run,
		cards: cardsData,
		rng: rng.cards,
		stats,
		events,
	});
	const shop = createShopSystem({
		config: roundsData.shop,
		equipment: equipmentData,
		rng: rng.shop,
		progress,
		stats,
		round: () => run.round,
	});

	const chunkGen = createChunkGenerator(seed, toBiomeDefs(biomesData), {
		chunkSize: worldData.chunkSize,
		maxPropsPerChunk: worldData.maxPropsPerChunk,
	});
	const chunkHooks: ChunkHooks = {};
	const chunks = createChunkSystem(worldData, chunkGen.generate, chunkHooks);
	/** Moves the arena to the biome of the round, regenerating the loaded chunks when it changes (S-24-01). */
	let biomeSet = false;
	function syncBiome(): void {
		const wanted = biome.forced ?? biomeForRound(worldData.biomes, biomesData.length, seed, run.round);
		if (biomeSet && wanted === biome.index) return;
		biomeSet = true;
		biome.index = wanted;
		chunkGen.setBiome(wanted);
		chunks.reset();
	}
	const breakables = createBreakableSystem({
		world,
		chunks,
		chunkSize: worldData.chunkSize,
		origin,
		types: chunkGen.propTypes.map((name) => {
			const prop = propsData.find((p) => p.id === name);
			return { radius: prop?.radius ?? 0, hp: prop?.kind === "breakable" ? (prop.hp ?? 0) : 0 };
		}),
		config: consumablesData,
		rng: rng.loot,
		events,
		pullFragments: (seconds) => pickup.pullAll(seconds),
	});
	chunkHooks.onRelease = breakables.release;
	const propCollision = createPropCollision(chunks, {
		chunkSize: worldData.chunkSize,
		avoidLookahead: worldData.propAvoidLookahead,
		steerGain: worldData.propSteerGain,
		steerMargin: worldData.propSteerMargin,
		radiusByType: Float32Array.from(
			chunkGen.propTypes.map((name) => propsData.find((p) => p.id === name)?.radius ?? 0),
		),
	});

	const fighting = (): boolean => run.state === "Round" || run.state === "BossRound";
	const { hpRegenFirstPoint, hpRegenExtraPoint } = heroData.formulas;
	/** Heals the living hero by the `hp_regen` stat each step, never above max HP (GDD 8). */
	const regenerate = (): void => {
		const hp = Health.hp[hero] ?? 0;
		const max = Health.max[hero] ?? 0;
		if (hp <= 0 || hp >= max) return;
		const perSecond = regenPerSecond(stats.stats.hpRegen, hpRegenFirstPoint, hpRegenExtraPoint);
		Health.hp[hero] = Math.min(max, hp + perSecond * STEP);
	};
	let inShop = false;

	function step(input: Readonly<InputState>): void {
		run.run(world, hero);
		syncBiome();
		// Outside combat nothing else loads chunks: keep the window full so a new biome shows at once.
		if (!fighting())
			chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
		if (fighting()) {
			runStats.seconds += STEP;
			inputSystem(world, hero, input, weapon.speedMultiplier * heroStatus.speedMultiplier);
			dash.run(hero, input);
			heroStatus.run(hero);
			behavior.run(world, hero);
			boss.run(world);
			// A boss that walks through props (thermal vision, flight) keeps the heading and place the props would change.
			const ghost =
				boss.entity >= 0 && hasComponent(world, boss.entity, IgnoresProps) ? boss.entity : -1;
			const ghostVx = Velocity.x[ghost] ?? 0;
			const ghostVz = Velocity.z[ghost] ?? 0;
			propCollision.steer(world, origin);
			if (ghost >= 0) {
				Velocity.x[ghost] = ghostVx;
				Velocity.z[ghost] = ghostVz;
			}
			separation.run(world);
			breakables.populate();
			breakables.insertInto(separation.hash);
			boss.insertInto(separation.hash);
			movementSystem(world);
			cullDistantEnemies(world, Position.x[hero] ?? 0, Position.z[hero] ?? 0, worldData.cullDistance);
			propCollision.resolve(world, origin, hero);
			const ghostX = Position.x[ghost] ?? 0;
			const ghostZ = Position.z[ghost] ?? 0;
			propCollision.resolveEnemies(world, origin);
			if (ghost >= 0) {
				Position.x[ghost] = ghostX;
				Position.z[ghost] = ghostZ;
			}
			arena.confine(world);
			applyOriginShift(world, origin, hero, events, worldData, boss.shiftOrigin);
			chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
			// The class weapon has no shop: its level (1 to 10) is the hero level, capped by the weapon's last tier.
			weapon.setTier(progress.level - 1);
			targeting.run(world, hero, weapon.range);
			weapon.run(world, hero);
			projectileSystem.run(world);
			enemyShotSystem.run(world, hero);
			aura.run(world, hero);
			spells.run(world, hero);
			playerSpells.run(world, hero, input);
			magnet.run();
			thorns.run(world, hero);
			bleed.run(world);
			damage.run(world);
			breakables.run();
			death.run(world);
			pickup.run(world, hero);
			breakables.collect(hero);
			elite.run(world);
			stats.run(hero);
			regenerate();
			levelUp.run();
			if ((Health.hp[hero] ?? 0) <= 0 && !itemEffects.tryRevive(hero)) run.heroDied();
		}
		if (run.state === "Shop" && !inShop) shop.open();
		inShop = run.state === "Shop";
	}

	return {
		world,
		events,
		origin,
		progress,
		runStats,
		hero,
		stats,
		owned,
		dash,
		itemEffects,
		synergies,
		startingWeapon,
		heroDef,
		heroStatsData: runHeroData,
		enemyIds,
		damage,
		separation,
		targeting,
		projectiles,
		weapon,
		projectileSystem,
		maxEnemyRadius,
		spawn,
		enemyShots,
		enemyShotSystem,
		behavior,
		elitePool,
		elite,
		heroStatus,
		boss,
		run,
		death,
		pickup,
		aura,
		bleed,
		thorns,
		killEffects,
		classSpells,
		playerSpells,
		levelUp,
		shop,
		chunkGen,
		chunks,
		biome,
		arena,
		breakables,
		propCollision,
		rng,
		difficulty,
		fighting,
		step,
	};
}

export function createGameSession(options: GameSessionOptions): GameSession {
	return build(options);
}

export interface GameSession {
	readonly world: ReturnType<typeof build>["world"];
	readonly events: ReturnType<typeof build>["events"];
	readonly origin: ReturnType<typeof build>["origin"];
	readonly progress: ReturnType<typeof build>["progress"];
	readonly runStats: ReturnType<typeof build>["runStats"];
	readonly hero: ReturnType<typeof build>["hero"];
	readonly stats: ReturnType<typeof build>["stats"];
	readonly owned: ReturnType<typeof build>["owned"];
	readonly dash: ReturnType<typeof build>["dash"];
	readonly itemEffects: ReturnType<typeof build>["itemEffects"];
	readonly synergies: ReturnType<typeof build>["synergies"];
	readonly startingWeapon: ReturnType<typeof build>["startingWeapon"];
	/** The hero of the run: weapon, passive and recolour. */
	readonly heroDef: ReturnType<typeof build>["heroDef"];
	/** `data/hero.json` with this hero's base overrides and the Ossuary crit multiplier applied. */
	readonly heroStatsData: ReturnType<typeof build>["heroStatsData"];
	readonly enemyIds: ReturnType<typeof build>["enemyIds"];
	readonly damage: ReturnType<typeof build>["damage"];
	readonly separation: ReturnType<typeof build>["separation"];
	readonly targeting: ReturnType<typeof build>["targeting"];
	readonly projectiles: ReturnType<typeof build>["projectiles"];
	readonly weapon: ReturnType<typeof build>["weapon"];
	readonly projectileSystem: ReturnType<typeof build>["projectileSystem"];
	readonly maxEnemyRadius: ReturnType<typeof build>["maxEnemyRadius"];
	readonly spawn: ReturnType<typeof build>["spawn"];
	readonly enemyShots: ReturnType<typeof build>["enemyShots"];
	readonly enemyShotSystem: ReturnType<typeof build>["enemyShotSystem"];
	readonly behavior: ReturnType<typeof build>["behavior"];
	readonly elitePool: ReturnType<typeof build>["elitePool"];
	readonly elite: ReturnType<typeof build>["elite"];
	readonly heroStatus: ReturnType<typeof build>["heroStatus"];
	readonly boss: ReturnType<typeof build>["boss"];
	readonly run: ReturnType<typeof build>["run"];
	readonly death: ReturnType<typeof build>["death"];
	readonly pickup: ReturnType<typeof build>["pickup"];
	readonly aura: ReturnType<typeof build>["aura"];
	readonly bleed: ReturnType<typeof build>["bleed"];
	readonly thorns: ReturnType<typeof build>["thorns"];
	readonly killEffects: ReturnType<typeof build>["killEffects"];
	/** The class's six spells at their Ossuary levels (S-20-02). */
	readonly classSpells: ReturnType<typeof build>["classSpells"];
	/** The heal and the super the player casts. */
	readonly playerSpells: ReturnType<typeof build>["playerSpells"];
	readonly levelUp: ReturnType<typeof build>["levelUp"];
	readonly shop: ReturnType<typeof build>["shop"];
	readonly chunkGen: ReturnType<typeof build>["chunkGen"];
	readonly chunks: ReturnType<typeof build>["chunks"];
	readonly breakables: ReturnType<typeof build>["breakables"];
	/** Index (into `biomes.json`) of the biome of the current round. */
	readonly biome: ReturnType<typeof build>["biome"];
	/** The square the run plays in; it grows with the round. */
	readonly arena: ReturnType<typeof build>["arena"];
	readonly propCollision: ReturnType<typeof build>["propCollision"];
	readonly rng: ReturnType<typeof build>["rng"];
	readonly difficulty: ReturnType<typeof build>["difficulty"];
	/** True while combat is running (a Round or BossRound that is not paused or in its intro). */
	fighting(): boolean;
	/** One fixed simulation step with this input. */
	step(input: Readonly<InputState>): void;
}
