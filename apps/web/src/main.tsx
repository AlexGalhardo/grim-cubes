import { createInputState, createLogger, createStore, createStreams, createVirtualStick } from "@gc/core";
import {
	addFragmentValue,
	applyHarvest,
	applyOriginShift,
	applyRoundEndBonus,
	biomesData,
	cardsData,
	createAuraSystem,
	createBehaviorSystem,
	createChunkGenerator,
	createChunkSystem,
	createDamageSystem,
	createDeathSystem,
	createEffectsSystem,
	createEventBuffer,
	createGameWorld,
	createLevelUpSystem,
	createLoop,
	createOrigin,
	createPickupSystem,
	createPlayerStats,
	createProgress,
	createProjectilePool,
	createProjectileSystem,
	createPropCollision,
	createRunSystem,
	createSeparationSystem,
	createShopSystem,
	createSpawnSystem,
	createStatsSystem,
	createTargetingSystem,
	createWeaponSystem,
	damageConfigFromHero,
	describeStats,
	enemiesData,
	Health,
	heroData,
	inputSystem,
	itemsData,
	movementSystem,
	Position,
	propsData,
	queryEnemies,
	roundsData,
	spawnHero,
	toBiomeDefs,
	toEnemyDefs,
	toShopWeapons,
	weaponsData,
	worldData,
	xpForLevel,
} from "@gc/game";
import { createInputSources, detectPlatform } from "@gc/platform";
import {
	CAMERA,
	createBenchRecorder,
	createChunkRenderer,
	createEngine,
	createGameScene,
	createHordeRenderer,
	createRenderPort,
	loadGameAssets,
	PLACEHOLDER_PROPS,
	type PropTypeDef,
} from "@gc/render";
import { App, type CardView, type HudState } from "@gc/ui";
import { createRoot } from "react-dom/client";
import { bootArtReview } from "./artReview";
import "./main.css";

const log = createLogger("boot");
const HUD_HZ = 12;
const NO_CARDS: readonly CardView[] = [];
const NO_STATS: HudState["stats"] = [];

function runSeed(): number {
	const param = new URLSearchParams(location.search).get("seed");
	if (param !== null && Number.isInteger(Number(param))) return Number(param) >>> 0;
	return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

async function boot(): Promise<void> {
	const canvas = document.querySelector<HTMLCanvasElement>("#game");
	const uiRoot = document.querySelector<HTMLElement>("#ui");
	if (!canvas || !uiRoot) throw new Error("Missing #game or #ui element");

	window.gc = { ready: false };
	const params = new URLSearchParams(location.search);
	if (__DEBUG_API__ && params.has("art")) {
		await bootArtReview(canvas, params);
		return;
	}
	const platform = detectPlatform();
	const stick = platform.touch ? createVirtualStick() : undefined;

	// Bench scenarios (P-03-06) are debug-only and always run on the same seed.
	const bench = __DEBUG_API__ ? params.get("bench") : null;
	const seed = bench ? 42 : runSeed();
	const rng = createStreams(seed);
	const events = createEventBuffer();
	const world = createGameWorld();
	const origin = createOrigin();
	const progress = createProgress();
	const { fragments, xp } = roundsData;

	const hero = spawnHero(world, {
		speed: heroData.base.speed,
		maxHp: heroData.base.maxHp,
		radius: heroData.base.radius,
	});
	const stats = createStatsSystem(heroData, createPlayerStats());
	stats.stats.dirty = true;
	stats.run(hero);

	const owned = new Map<string, number>();
	const itemEffects = createEffectsSystem(itemsData, owned);

	const startingWeapon = weaponsData.find((w) => w.id === heroData.startingWeapon);
	if (!startingWeapon) throw new Error(`Unknown starting weapon ${heroData.startingWeapon}`);
	const enemyIds = enemiesData.map((e) => e.id);
	const zigzagParams = enemiesData.find((e) => e.behavior === "zigzag")?.behaviorParams;

	const damage = createDamageSystem({
		config: damageConfigFromHero(heroData),
		rng,
		events,
		hero,
		stats: stats.stats,
		effects: itemEffects.effects,
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
	const behavior = createBehaviorSystem(
		{
			zigzag: {
				amplitude: Number(zigzagParams?.amplitude ?? 1.5),
				periodSeconds: Number(zigzagParams?.periodSeconds ?? 0.8),
			},
			contactCooldownSeconds: heroData.combat.contactCooldownSeconds,
			attackAnimationSeconds: roundsData.ai.attackAnimationSeconds,
		},
		damage.queue,
	);

	// `run` is created after `spawn` but spawn must call back into it for the fragment bag.
	const bag: { release?: (w: typeof world, x: number, z: number) => void } = {};
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: rng.spawn,
		events,
		onSpawn: (w, x, z) => bag.release?.(w, x, z),
	});
	const benchPool = [
		{ type: enemyIds.indexOf("husk"), weight: 6 },
		{ type: enemyIds.indexOf("wail"), weight: 4 },
	];
	const run = createRunSystem({
		config: { flow: roundsData.flow, duration: roundsData.duration, boss: roundsData.boss },
		spawn,
		events,
		// The first biome ring only until biome selection by distance reaches the spawner (SDD 03 section 5).
		poolFor: () => [
			{ type: enemyIds.indexOf("husk"), weight: 6 },
			{ type: enemyIds.indexOf("wail"), weight: 4 },
		],
		difficultyMult: 1,
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
	});
	const pickup = createPickupSystem({
		fragments,
		xp,
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
	const levelUp = createLevelUpSystem({ progress, run, cards: cardsData, rng: rng.cards, stats, events });
	const shop = createShopSystem({
		config: roundsData.shop,
		tiers: roundsData.tierChance,
		catalog: { items: itemsData, weapons: toShopWeapons(weaponsData) },
		weaponDefs: weaponsData,
		rng: rng.shop,
		progress,
		stats,
		weapon,
		round: () => run.round,
		owned,
		onItemBought: itemEffects.refresh,
	});

	const chunkGen = createChunkGenerator(seed, toBiomeDefs(biomesData), {
		chunkSize: worldData.chunkSize,
		maxPropsPerChunk: worldData.maxPropsPerChunk,
	});
	const chunks = createChunkSystem(worldData, chunkGen.generate);
	const propCollision = createPropCollision(chunks, {
		chunkSize: worldData.chunkSize,
		avoidLookahead: worldData.propAvoidLookahead,
		radiusByType: Float32Array.from(
			chunkGen.propTypes.map((name) => propsData.find((p) => p.id === name)?.radius ?? 0),
		),
	});

	const hud = createStore<HudState>({
		hp: heroData.base.maxHp,
		maxHp: heroData.base.maxHp,
		round: 1,
		level: 1,
		xp: 0,
		xpNeeded: xpForLevel(xp, 1),
		gold: 0,
		cards: NO_CARDS,
		shop: null,
		stats: [],
	});
	createRoot(uiRoot).render(
		<App
			store={hud}
			stick={stick}
			onChooseCard={(index) => levelUp.choose(index)}
			shopActions={{
				buy: (index) => {
					shop.buy(index);
					publishNow();
				},
				toggleLock: (index) => {
					shop.toggleLock(index);
					publishNow();
				},
				reroll: () => {
					shop.reroll();
					publishNow();
				},
				next: () => {
					if (run.state === "Shop") run.closeShop();
					publishNow();
				},
			}}
		/>,
	);

	const input = createInputState();
	const sources = createInputSources({
		target: window,
		getGamepads: () => navigator.getGamepads(),
		...(stick ? { stick } : {}),
	});

	const render = await createEngine(canvas);
	const game = createGameScene(render.engine, platform.mobile);
	// Models, VATs and atlases come from `assets:build`. Without them (dev server before the first build) the game
	// keeps the placeholder boxes and the horde simply does not render.
	const assets = await loadGameAssets(game.scene, {
		baseUrl: "/assets/",
		enemyIds,
		propIds: chunkGen.propTypes,
	}).catch((error: unknown) => {
		log.warn("assets unavailable, using placeholders", error);
		return null;
	});
	const horde =
		assets && assets.enemies.length > 0
			? createHordeRenderer(
					assets.enemies.map((enemy, index) => ({
						mesh: enemy.mesh,
						vat: enemy.vat,
						walkRefSpeed: enemiesData[index]?.walkRefSpeed ?? 1,
					})),
					{
						capacity: roundsData.spawn.maxSimultaneous + worldData.hordeRenderSlack,
						ghostCapacity: worldData.hordeRenderSlack,
						// Frozen while paused (level-up) so the frame is stable for screenshots and the horde does not keep animating.
						deltaSeconds: () =>
							run.state === "Paused" ? 0 : render.engine.getDeltaTime() / 1000,
					},
				)
			: undefined;
	const port = createRenderPort(game, horde, { origin, followRate: CAMERA.followRate });
	const propTypes: PropTypeDef[] = [];
	for (const name of chunkGen.propTypes) {
		const placeholder = PLACEHOLDER_PROPS.find((p) => name.startsWith(p.name)) ?? PLACEHOLDER_PROPS[0];
		if (!placeholder) continue;
		const mesh = assets?.props.get(name);
		propTypes.push({ ...placeholder, name, ...(mesh ? { mesh } : {}) });
	}
	const chunkRenderer = createChunkRenderer(
		game,
		chunks,
		{
			chunkSize: worldData.chunkSize,
			maxPropsPerChunk: worldData.maxPropsPerChunk,
			loadRadius: worldData.loadRadius,
		},
		propTypes,
	);

	const fighting = (): boolean => run.state === "Round" || run.state === "BossRound";
	let lastOffer: readonly CardView[] = NO_CARDS;
	let lastOfferSource: unknown = null;
	let lastHud = Number.NEGATIVE_INFINITY;
	let inShop = false;
	let lastShopJson = "";
	let lastShop: HudState["shop"] = null;

	function publishNow(): void {
		const offer = levelUp.offer;
		if (offer !== lastOfferSource) {
			lastOfferSource = offer;
			lastOffer = offer ? offer.map((c) => ({ id: c.id, name: c.name, double: c.double })) : NO_CARDS;
		}
		let shopView: HudState["shop"] = null;
		if (run.state === "Shop") {
			const view = shop.view();
			const json = JSON.stringify(view);
			if (json !== lastShopJson) {
				lastShopJson = json;
				lastShop = view;
			}
			shopView = lastShop;
		} else {
			lastShopJson = "";
		}
		const next: HudState = {
			hp: Math.max(0, Math.ceil(Health.hp[hero] ?? 0)),
			maxHp: Math.ceil(Health.max[hero] ?? 0),
			round: run.round,
			level: progress.level,
			xp: Math.floor(progress.xp),
			xpNeeded: xpForLevel(xp, progress.level),
			gold: Math.floor(progress.gold),
			cards: lastOffer,
			shop: shopView,
			stats: shopView ? describeStats(stats.stats) : NO_STATS,
		};
		const cur = hud.get();
		if (
			cur.hp !== next.hp ||
			cur.maxHp !== next.maxHp ||
			cur.round !== next.round ||
			cur.level !== next.level ||
			cur.xp !== next.xp ||
			cur.gold !== next.gold ||
			cur.cards !== next.cards ||
			cur.shop !== next.shop
		) {
			hud.publish(next);
		}
	}

	const loop = createLoop({
		simulate: () => {
			if (bench) {
				// Fixed horde around a stationary hero: no run flow, no level-ups, no shop (SDD 14 section 4).
				behavior.run(world, hero);
				separation.run(world);
				movementSystem(world);
				applyOriginShift(world, origin, hero, events, worldData);
				chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
				spawn.run(world, hero);
				if (bench === "round20") {
					targeting.run(world, hero, weapon.range);
					weapon.run(world, hero);
					projectileSystem.run(world);
				}
				damage.run(world);
				death.run(world);
				pickup.run(world, hero);
				return;
			}
			run.run(world, hero);
			if (fighting()) {
				inputSystem(world, hero, input, weapon.speedMultiplier);
				behavior.run(world, hero);
				propCollision.steer(world, origin);
				separation.run(world);
				movementSystem(world);
				propCollision.resolve(world, origin, hero);
				propCollision.resolveEnemies(world, origin);
				applyOriginShift(world, origin, hero, events, worldData);
				chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
				targeting.run(world, hero, weapon.range);
				weapon.run(world, hero);
				projectileSystem.run(world);
				aura.run(world, hero);
				damage.run(world);
				death.run(world);
				pickup.run(world, hero);
				stats.run(hero);
				levelUp.run();
				if ((Health.hp[hero] ?? 0) <= 0 && !itemEffects.tryRevive(hero)) run.heroDied();
			}
			if (run.state === "Shop" && !inShop) shop.open();
			inShop = run.state === "Shop";
			// No results screen yet (P-05-08): a finished run starts over.
			if (run.state === "Results") location.reload();
		},
		render: (alpha) => {
			port.sync(world, alpha);
			port.consumeEvents(events);
			chunkRenderer.update(
				origin.x,
				origin.z,
				origin.x + (Position.x[hero] ?? 0),
				origin.z + (Position.z[hero] ?? 0),
			);
			game.scene.render();
		},
		publish: (now) => {
			if (now - lastHud < 1000 / HUD_HZ) return;
			lastHud = now;
			publishNow();
		},
	});

	if (__DEBUG_API__ && new URLSearchParams(location.search).has("debug")) {
		window.gc.debug = {
			hero: () => ({ x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 }),
			state: () => ({ run: run.state, round: run.round, level: progress.level }),
			grantXp: (amount: number) => addFragmentValue(progress, fragments, xp, amount),
			grantGold: (amount: number) => {
				progress.gold += amount;
			},
			endRound: () => run.forceEnd(world),
		};
	}

	// SDD 02 section 1: a hidden tab pauses the simulation and resuming ignores the time spent away.
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) loop.pause();
		else loop.resume();
	});

	if (bench) {
		// Round 20 against the spawn cap: the 100-enemy reference load (SDD 14 section 1).
		spawn.startRound(20, { pool: benchPool, difficultyMult: 1 });
	} else {
		run.newRun();
	}
	if (__DEBUG_API__ && bench && window.gc.debug) {
		const recorder = createBenchRecorder(game.scene, render.engine);
		window.gc.debug.bench = {
			scenario: bench,
			enemies: () => queryEnemies(world).length,
			/** Warm-up is discarded; resolves with the SDD 14 metrics of the measured window. */
			run: (warmupMs: number, measureMs: number) =>
				new Promise((resolve) => {
					setTimeout(() => {
						recorder.start();
						setTimeout(() => resolve(recorder.stop()), measureMs);
					}, warmupMs);
				}),
		};
	}
	render.engine.runRenderLoop(() => {
		// Once per frame: getGamepads() allocates, and several steps may run per frame.
		sources.poll(input);
		loop.frame(performance.now());
	});
	window.addEventListener("resize", () => render.engine.resize());
	game.scene.executeWhenReady(() => {
		window.gc.ready = true;
		log.info("ready", { version: __APP_VERSION__, target: __BUILD_TARGET__, demo: __IS_DEMO__, seed });
	});
}

boot().catch((error: unknown) => log.error("boot failed", error));
