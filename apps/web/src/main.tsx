import { createInputState, createLogger, createStore, createStreams, createVirtualStick } from "@gc/core";
import {
	addFragmentValue,
	applyHarvest,
	applyOriginShift,
	biomesData,
	cardsData,
	createBehaviorSystem,
	createChunkGenerator,
	createChunkSystem,
	createDamageSystem,
	createDeathSystem,
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
	createRunSystem,
	createSeparationSystem,
	createSpawnSystem,
	createStatsSystem,
	createTargetingSystem,
	createWeaponSystem,
	damageConfigFromHero,
	enemiesData,
	Health,
	heroData,
	inputSystem,
	movementSystem,
	Position,
	roundsData,
	spawnHero,
	toBiomeDefs,
	toEnemyDefs,
	weaponsData,
	worldData,
	xpForLevel,
} from "@gc/game";
import { createInputSources, detectPlatform } from "@gc/platform";
import {
	createChunkRenderer,
	createEngine,
	createGameScene,
	createRenderPort,
	PLACEHOLDER_PROPS,
} from "@gc/render";
import { App, type CardView, type HudState } from "@gc/ui";
import { createRoot } from "react-dom/client";
import "./main.css";

const log = createLogger("boot");
const HUD_HZ = 12;
const NO_CARDS: readonly CardView[] = [];

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
	const platform = detectPlatform();
	const stick = platform.touch ? createVirtualStick() : undefined;

	const seed = runSeed();
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
		},
	});
	bag.release = run.releaseFromBag;

	const death = createDeathSystem({
		fragments,
		fragmentsPerType: enemiesData.map((e) => e.fragments),
		rng: rng.loot,
		round: () => run.round,
	});
	const pickup = createPickupSystem({ fragments, xp, progress, stats: stats.stats });
	const levelUp = createLevelUpSystem({ progress, run, cards: cardsData, rng: rng.cards, stats, events });

	const chunkGen = createChunkGenerator(seed, toBiomeDefs(biomesData), {
		chunkSize: worldData.chunkSize,
		maxPropsPerChunk: worldData.maxPropsPerChunk,
	});
	const chunks = createChunkSystem(worldData, chunkGen.generate);

	const hud = createStore<HudState>({
		hp: heroData.base.maxHp,
		maxHp: heroData.base.maxHp,
		round: 1,
		level: 1,
		xp: 0,
		xpNeeded: xpForLevel(xp, 1),
		gold: 0,
		cards: NO_CARDS,
	});
	createRoot(uiRoot).render(
		<App store={hud} stick={stick} onChooseCard={(index) => levelUp.choose(index)} />,
	);

	const input = createInputState();
	const sources = createInputSources({
		target: window,
		getGamepads: () => navigator.getGamepads(),
		...(stick ? { stick } : {}),
	});

	const render = await createEngine(canvas);
	const game = createGameScene(render.engine, platform.mobile);
	const port = createRenderPort(game);
	const propTypes = chunkGen.propTypes.map(
		(name) => PLACEHOLDER_PROPS.find((p) => name.startsWith(p.name)) ?? PLACEHOLDER_PROPS[0],
	);
	const chunkRenderer = createChunkRenderer(
		game,
		chunks,
		{
			chunkSize: worldData.chunkSize,
			maxPropsPerChunk: worldData.maxPropsPerChunk,
			loadRadius: worldData.loadRadius,
		},
		propTypes.filter((p) => p !== undefined),
	);

	const fighting = (): boolean => run.state === "Round" || run.state === "BossRound";
	let lastOffer: readonly CardView[] = NO_CARDS;
	let lastOfferSource: unknown = null;
	let lastHud = Number.NEGATIVE_INFINITY;

	const loop = createLoop({
		simulate: () => {
			run.run(world, hero);
			if (fighting()) {
				inputSystem(world, hero, input, weapon.speedMultiplier);
				behavior.run(world, hero);
				separation.run(world);
				movementSystem(world);
				applyOriginShift(world, origin, hero, events, worldData);
				chunks.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
				targeting.run(world, hero, weapon.range);
				weapon.run(world, hero);
				projectileSystem.run(world);
				damage.run(world);
				death.run(world);
				pickup.run(world, hero);
				stats.run(hero);
				levelUp.run();
				if ((Health.hp[hero] ?? 0) <= 0) run.heroDied();
			}
			// No shop screen yet (P-05-04): skip straight to the next round.
			if (run.state === "Shop") run.closeShop();
			// No results screen yet: a finished run starts over.
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
			const offer = levelUp.offer;
			if (offer !== lastOfferSource) {
				lastOfferSource = offer;
				lastOffer = offer
					? offer.map((c) => ({ id: c.id, name: c.name, double: c.double }))
					: NO_CARDS;
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
			};
			const cur = hud.get();
			if (
				cur.hp !== next.hp ||
				cur.maxHp !== next.maxHp ||
				cur.round !== next.round ||
				cur.level !== next.level ||
				cur.xp !== next.xp ||
				cur.gold !== next.gold ||
				cur.cards !== next.cards
			) {
				hud.publish(next);
			}
		},
	});

	if (__DEBUG_API__ && new URLSearchParams(location.search).has("debug")) {
		window.gc.debug = {
			hero: () => ({ x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 }),
			state: () => ({ run: run.state, round: run.round, level: progress.level }),
			grantXp: (amount: number) => addFragmentValue(progress, fragments, xp, amount),
		};
	}

	run.newRun();
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
