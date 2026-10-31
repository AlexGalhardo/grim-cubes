import { createInputState, createMetaState, createStreams } from "../../packages/core/src/index";
import {
	applyHarvest,
	applyOssuary,
	applyRoundEndBonus,
	availableItems,
	behaviorConfigFromData,
	bossesData,
	cardsData,
	createAuraSystem,
	createBehaviorSystem,
	createBleedSystem,
	createBossRoster,
	createChestSystem,
	createDamageSystem,
	createDeathSystem,
	createEffectsSystem,
	createEliteSystem,
	createEnemyShotPool,
	createEnemyShotSystem,
	createEventBuffer,
	createGameWorld,
	createKillEffectsSystem,
	createLevelUpSystem,
	createPickupSystem,
	createPlayerStats,
	createProgress,
	createProjectilePool,
	createProjectileSystem,
	createRunSystem,
	createSeparationSystem,
	createShopSystem,
	createSpawnSystem,
	createStatsSystem,
	createTargetingSystem,
	createThornsSystem,
	createWeaponSystem,
	cullDistantEnemies,
	damageConfigFromHero,
	difficultyData,
	EventType,
	elitesData,
	enemiesData,
	Health,
	hashWorld,
	heroData,
	inputSystem,
	itemsData,
	type Modifier,
	milestonesData,
	movementSystem,
	ossuaryData,
	Position,
	queryEnemies,
	roundsData,
	STEP,
	spawnHero,
	toEnemyDefs,
	toShopWeapons,
	weaponsData,
	worldData,
} from "../../packages/game/src/index";

export interface SimOptions {
	seed: number;
	rounds: number;
	difficulty: string;
	weapon?: string;
	/** Stop after this many simulation steps (determinism test); default: enough for `rounds` rounds. */
	maxSteps?: number;
	/** Ossuary node ids the simulated account already owns. */
	ossuary?: readonly string[];
}

export interface RoundReport {
	round: number;
	kills: number;
	damageTaken: number;
	gold: number;
	/** Gold picked up during the round. */
	goldEarned: number;
	/** Mean price of the item slots of the shop that followed (0 when the run ended first). */
	avgItemPrice: number;
	levelUps: number;
}

export type Outcome = "completed" | "died" | "timeout";

export interface BossFight {
	round: number;
	boss: string;
	/** Seconds from the start of the boss round to its death; null when the hero died first. */
	killSeconds: number | null;
}

export interface SimReport {
	seed: number;
	roundsRequested: number;
	difficulty: string;
	weapon: string;
	policy: "greedy-kite";
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
	/** `hashWorld` of the final state (determinism anchor). */
	worldHash: number;
	perRound: RoundReport[];
	bosses: BossFight[];
	itemsBought: number;
}

const MAX_SECONDS_PER_ROUND = 90;

/**
 * Value of a modifier to the greedy player, per unit. This is the *policy* of the simulated player (GDD 25: "buys the
 * best item per cost, picks the card of the stat it lacks most"), not game data: it only decides what the bot picks.
 */
const STAT_WEIGHT: Readonly<Record<string, number>> = {
	damage: 100,
	attack_speed: 100,
	crit_chance: 60,
	max_hp: 0.4,
	hp_regen: 8,
	armor: 3,
	dodge: 80,
	speed: 25,
	life_steal: 150,
	range: 6,
	luck: 0.2,
	harvest: 4,
	pickup_range: 10,
	xp_gain: 30,
};
/** Flat value of an item whose power is a special effect rather than a stat. */
const EFFECT_VALUE = 18;

function modifierValue(mods: readonly Modifier[]): number {
	let total = 0;
	for (const m of mods) {
		const weight = STAT_WEIGHT[m.stat] ?? 0;
		// `mul` modifiers are factors around 1 (0.7 = -30%): worth their distance from 1 on a 100-point scale.
		total += m.op === "mul" ? (m.value - 1) * weight * 0.5 : m.value * weight;
	}
	return total;
}

function difficultyId(id: string): "normal" | "grim" | "nightmare" {
	if (id === "normal" || id === "grim" || id === "nightmare") return id;
	throw new Error(`unknown difficulty "${id}"`);
}

export function runSim(options: SimOptions): SimReport {
	const difficulty = difficultyData(roundsData.difficulties, difficultyId(options.difficulty));
	const weaponId = options.weapon ?? heroData.startingWeapon;
	const weaponDef = weaponsData.find((w) => w.id === weaponId);
	if (!weaponDef) throw new Error(`unknown weapon "${weaponId}"`);

	const meta = createMetaState();
	for (const node of options.ossuary ?? []) meta.ossuary[node] = true;
	const bonus = applyOssuary(ossuaryData, meta);
	const poolItems = availableItems(itemsData, milestonesData, meta);

	const streams = createStreams(options.seed);
	const world = createGameWorld();
	const events = createEventBuffer();
	const progress = createProgress();
	progress.gold += bonus.startGold;
	const hero = spawnHero(world, {
		speed: heroData.base.speed,
		maxHp: heroData.base.maxHp,
		radius: heroData.base.radius,
	});
	const stats = createStatsSystem(
		{ ...heroData, base: { ...heroData.base, critMult: bonus.critMult ?? heroData.base.critMult } },
		createPlayerStats(),
	);
	stats.add(bonus.modifiers);
	stats.run(hero);
	const owned = new Map<string, number>();
	const itemEffects = createEffectsSystem(itemsData, owned, {
		fragmentGain: bonus.fragmentGain,
		soulGain: bonus.soulGain,
		weakReviveHpFraction: bonus.weakReviveHpFraction,
	});

	const enemyIds = enemiesData.map((e) => e.id);
	const maxRadius = Math.max(...enemiesData.map((e) => e.radius));
	// Same first-biome ring the game spawns from (apps/web main.tsx poolFor); keep the two in step.
	const pool = [
		{ type: enemyIds.indexOf("husk"), weight: 6 },
		{ type: enemyIds.indexOf("wail"), weight: 4 },
	];

	const damage = createDamageSystem({
		config: damageConfigFromHero(heroData),
		rng: { dodge: streams.dodge, combat: streams.combat },
		events,
		hero,
		stats: stats.stats,
		effects: itemEffects.effects,
	});
	const separation = createSeparationSystem({ weight: roundsData.ai.separationWeight, maxRadius });
	const targeting = createTargetingSystem(
		{ priorityDistanceMult: heroData.combat.targetPriorityDistanceMult, retargetEvery: 3 },
		separation.hash,
	);
	const projectiles = createProjectilePool(world, events);
	const weapon = createWeaponSystem({
		weapon: weaponDef,
		tier: 0,
		stats: stats.stats,
		attackSpeedCap: heroData.caps.attackSpeedPerSecond,
		queue: damage.queue,
		events,
		targeting,
		enemies: separation.hash,
		rng: streams.weapon,
		projectiles,
		effects: itemEffects.effects,
	});
	const projectileSystem = createProjectileSystem({
		pool: projectiles,
		queue: damage.queue,
		enemies: separation.hash,
		maxEnemyRadius: maxRadius,
		hero,
		events,
	});
	const bag: { release?: (w: typeof world, x: number, z: number) => void } = {};
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: streams.spawn,
		events,
		onSpawn: (w, x, z) => bag.release?.(w, x, z),
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
		{ events, spawn, shots: enemyShots, drain: damage.drain },
	);
	const elite = createEliteSystem({
		config: elitesData,
		spawn,
		events,
		queue: damage.queue,
		rng: streams.elite,
		pool: () => pool,
		ring: { min: roundsData.spawn.ringMin, max: roundsData.spawn.ringMax },
		hero,
	});
	let steps = 0;
	let bossStartStep = 0;
	const bosses: BossFight[] = [];
	const boss = createBossRoster(
		{
			rounds: roundsData.boss,
			spawn,
			events,
			queue: damage.queue,
			hero,
			rng: streams.combat,
			summonType: enemyIds.indexOf("husk"),
			enemyIndex: (id) => enemyIds.indexOf(id),
			shots: enemyShots,
			difficulty: () => difficulty.hpDamageMult,
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
		poolFor: () => pool,
		difficultyMult: difficulty.hpDamageMult,
		onRoundStart: (round, isBoss) => {
			elite.onRoundStart(round, isBoss);
			if (isBoss) {
				boss.start(world, round);
				bossStartStep = steps;
				bosses.push({ round, boss: boss.defFor(round).id, killSeconds: null });
			}
		},
		onRoundEnd: (round) => {
			applyHarvest(
				progress,
				roundsData.fragments,
				roundsData.xp,
				round,
				stats.stats.harvest,
				stats.stats.xpGain,
			);
			applyRoundEndBonus(
				progress,
				roundsData.fragments,
				roundsData.xp,
				itemEffects.effects,
				stats.stats.xpGain,
			);
		},
	});
	bag.release = run.releaseFromBag;
	const killEffects = createKillEffectsSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		events,
		rng: streams.effects,
		round: () => run.round,
		hero,
	});
	const death = createDeathSystem({
		fragments: roundsData.fragments,
		fragmentsPerType: enemiesData.map((e) => e.fragments),
		rng: streams.loot,
		round: () => run.round,
		effects: itemEffects.effects,
		onDeath: (w, e, x, z) => {
			elite.handleDeath(w, e, x, z);
			boss.handleDeath(w, e, x, z);
			killEffects.onKill(w, e, x, z);
		},
	});
	const pickup = createPickupSystem({
		fragments: roundsData.fragments,
		xp: roundsData.xp,
		progress,
		stats: stats.stats,
		effects: itemEffects.effects,
	});
	const aura = createAuraSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		round: () => run.round,
	});
	const bleed = createBleedSystem({ events });
	const thorns = createThornsSystem({
		effects: itemEffects.effects,
		queue: damage.queue,
		enemies: separation.hash,
		cooldownSeconds: heroData.combat.contactCooldownSeconds,
	});
	const levelUp = createLevelUpSystem({
		progress,
		run,
		cards: cardsData,
		rng: streams.cards,
		stats,
		events,
		rerolls: bonus.cardRerolls,
	});
	const chest = createChestSystem({
		reward: elitesData.reward,
		items: poolItems,
		rng: streams.loot,
		run,
		stats,
		owned,
		onItemTaken: itemEffects.refresh,
		events,
		blocked: () => levelUp.offer !== null,
		pickupRadius: () => stats.stats.pickupRadius,
	});
	const shop = createShopSystem({
		config: roundsData.shop,
		guaranteedUncommon: bonus.guaranteedUncommonShopItems,
		tiers: roundsData.tierChance,
		catalog: { items: poolItems, weapons: toShopWeapons(weaponsData) },
		weaponDefs: weaponsData,
		rng: streams.shop,
		progress,
		stats,
		weapon,
		round: () => run.round,
		owned,
		onItemBought: itemEffects.refresh,
	});

	const input = createInputState();
	const report: SimReport = {
		seed: options.seed,
		roundsRequested: options.rounds,
		difficulty: options.difficulty,
		weapon: weaponId,
		policy: "greedy-kite",
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
		worldHash: 0,
		perRound: [],
		bosses,
		itemsBought: 0,
	};
	let roundKills = 0;
	let roundDamageTaken = 0;
	let roundLevelUps = 0;
	let roundGoldEarned = 0;
	let lastGold = progress.gold;
	let avgPriceOfNextShop = 0;

	const visit = (type: number, a: number, b: number, _c: number, entity: number): void => {
		if (type === EventType.Damaged) report.damageDealt += a;
		else if (type === EventType.PlayerHit) {
			report.damageTaken += a;
			roundDamageTaken += a;
		} else if (type === EventType.Died && entity !== hero && b === 0) {
			report.kills++;
			roundKills++;
		} else if (type === EventType.LevelUp) {
			roundLevelUps++;
		} else if (type === EventType.BossDied) {
			const last = bosses.at(-1);
			if (last && last.killSeconds === null) last.killSeconds = (steps - bossStartStep) * STEP;
		} else if (type === EventType.RoundEnded) {
			report.perRound.push({
				round: a,
				kills: roundKills,
				damageTaken: roundDamageTaken,
				gold: progress.gold,
				goldEarned: roundGoldEarned,
				avgItemPrice: 0,
				levelUps: roundLevelUps,
			});
			roundKills = 0;
			roundDamageTaken = 0;
			roundLevelUps = 0;
			roundGoldEarned = 0;
		}
	};

	/** Greedy-kite policy: hold the weapon's range from the nearest enemy, backing off when it is closer. */
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
		if (!(length > 0) || !Number.isFinite(length)) {
			input.moveX = 0;
			input.moveZ = 0;
			return;
		}
		const want = Math.max(1, weapon.range * 0.8);
		const sign = length > want + 0.5 ? 1 : length < want - 0.5 ? -1 : 0;
		input.moveX = (sign * dx) / length;
		input.moveZ = (sign * dz) / length;
	}

	function pickBest(count: number, scoreOf: (index: number) => number): number {
		let best = 0;
		for (let i = 1; i < count; i++) if (scoreOf(i) > scoreOf(best)) best = i;
		return best;
	}

	/** Takes the pending level-up card and chest item with the highest policy value. */
	function choose(): void {
		while (levelUp.offer) {
			const offer = levelUp.offer;
			if (!levelUp.choose(pickBest(offer.length, (i) => modifierValue(offer[i]?.modifiers ?? []))))
				break;
		}
		while (chest.offer) {
			const offer = chest.offer;
			const index = pickBest(
				offer.length,
				(i) => modifierValue(offer[i]?.modifiers ?? []) + EFFECT_VALUE,
			);
			if (!chest.choose(index)) break;
		}
	}

	/** Buys by value per gold until nothing worth it is affordable. */
	function shopGreedy(): void {
		const prices = shop.slots.filter((s) => s.kind === "item").map((s) => s.price);
		avgPriceOfNextShop = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
		for (;;) {
			let bestIndex = -1;
			let bestRatio = 0;
			shop.slots.forEach((slot, i) => {
				if (slot.sold || slot.price > progress.gold) return;
				let benefit = 0;
				if (slot.kind === "item") {
					const item = poolItems.find((it) => it.id === slot.id);
					benefit =
						modifierValue(item?.modifiers ?? []) +
						(item && item.effects.length > 0 ? EFFECT_VALUE : 0);
				} else if (slot.kind === "upgrade") {
					benefit = 40;
				}
				const ratio = benefit / Math.max(1, slot.price);
				if (benefit > 0 && ratio > bestRatio) {
					bestRatio = ratio;
					bestIndex = i;
				}
			});
			if (bestIndex < 0 || !shop.buy(bestIndex)) return;
			report.itemsBought++;
		}
	}

	const maxSteps = options.maxSteps ?? Math.ceil((options.rounds * MAX_SECONDS_PER_ROUND) / STEP);
	run.newRun();
	let inShop = false;
	while (steps < maxSteps) {
		const state = run.state;
		if (state === "Results") {
			report.outcome = "died";
			break;
		}
		if (state === "Shop") {
			if (!inShop) {
				shop.open();
				shopGreedy();
				const last = report.perRound.at(-1);
				if (last) last.avgItemPrice = avgPriceOfNextShop;
				inShop = true;
			}
			if (run.round >= options.rounds) {
				report.outcome = "completed";
				break;
			}
			run.closeShop();
			inShop = false;
			continue;
		}

		choose();
		run.run(world, hero);
		if (run.state === "Round" || run.state === "BossRound") {
			steer();
			inputSystem(world, hero, input, weapon.speedMultiplier);
			behavior.run(world, hero);
			boss.run(world);
			separation.run(world);
			movementSystem(world);
			// The game culls stragglers at the same point of the step; without it the sim and the game diverge (P-03-05).
			cullDistantEnemies(world, Position.x[hero] ?? 0, Position.z[hero] ?? 0, worldData.cullDistance);
			targeting.run(world, hero, weapon.range);
			weapon.run(world, hero);
			projectileSystem.run(world);
			enemyShotSystem.run(world, hero);
			aura.run(world, hero);
			thorns.run(world, hero);
			bleed.run(world);
			damage.run(world);
			death.run(world);
			pickup.run(world, hero);
			elite.run(world);
			chest.run(world, hero);
			stats.run(hero);
			levelUp.run();
			if ((Health.hp[hero] ?? 0) <= 0 && !itemEffects.tryRevive(hero)) run.heroDied();
		}
		if (progress.gold > lastGold) roundGoldEarned += progress.gold - lastGold;
		lastGold = progress.gold;
		events.consume(visit);
		steps++;
	}

	report.steps = steps;
	report.roundReached = run.round;
	report.gold = progress.gold;
	report.level = progress.level;
	report.heroHp = Math.max(0, Health.hp[hero] ?? 0);
	report.eventsDropped = events.dropped;
	report.worldHash = hashWorld(world);
	return report;
}
