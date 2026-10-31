import {
	applyRun,
	createInputState,
	createLogger,
	createStore,
	createStreams,
	createVirtualStick,
	loadMeta,
	type MetaState,
	persistRun,
	type RunResult,
	type SaveIO,
	updateMeta,
} from "@gc/core";
import {
	addFragmentValue,
	applyHarvest,
	applyOriginShift,
	applyOssuary,
	applyRoundEndBonus,
	availableItems,
	Boss,
	behaviorConfigFromData,
	biomesData,
	bossesData,
	buyNode,
	cardsData,
	chooseDifficulty,
	createAuraSystem,
	createBehaviorSystem,
	createBossSystem,
	createChestSystem,
	createChunkGenerator,
	createChunkSystem,
	createDamageSystem,
	createDashSystem,
	createDeathSystem,
	createEffectsSystem,
	createEliteSystem,
	createEnemyShotPool,
	createEnemyShotSystem,
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
	createRunStats,
	createRunSystem,
	createSeparationSystem,
	createShopSystem,
	createSpawnSystem,
	createStatsSystem,
	createTargetingSystem,
	createWeaponSystem,
	damageConfigFromHero,
	describeEffect,
	describeModifier,
	describeStats,
	difficultyData,
	dropFragment,
	Elite,
	EventType,
	elitesData,
	enemiesData,
	Health,
	heroData,
	inputSystem,
	isUnlocked,
	itemsData,
	milestonesData,
	movementSystem,
	nodeState,
	ossuaryData,
	Position,
	PrevPosition,
	parseSeed,
	propsData,
	queryEnemies,
	refundValue,
	renderData,
	resetOssuary,
	roundsData,
	soulsForRun,
	spawnHero,
	toBiomeDefs,
	toEnemyDefs,
	toShopWeapons,
	unlockedSkins,
	weaponsData,
	worldData,
	xpForLevel,
} from "@gc/game";
import { createInputSources, createWebStorage, detectPlatform, type StorageKey } from "@gc/platform";
import {
	CAMERA,
	createBenchRecorder,
	createChunkRenderer,
	createEliteView,
	createEnemyShotRenderer,
	createEngine,
	createFragmentRenderer,
	createGameScene,
	createHitStop,
	createHordeRenderer,
	createProjectileRenderer,
	createRenderPort,
	createVfx,
	loadGameAssets,
	PALETTE,
	PLACEHOLDER_PROPS,
	type PropTypeDef,
} from "@gc/render";
import { App, type CardView, type HudState } from "@gc/ui";
import { query } from "bitecs";
import { createRoot } from "react-dom/client";
import { bootArtReview } from "./artReview";
import "./main.css";

const log = createLogger("boot");
const HUD_HZ = 12;
/** Live projectiles the round20 bench keeps in the pool (SDD 14 section 1: 200). */
const BENCH_PROJECTILES = 200;
/** Flight time of an emitted bench projectile, in steps (5 s). */
const BENCH_PROJECTILE_STEPS = 300;
/** Bench enemy hit points: nothing dies, so the horde stays at the cap. */
const BENCH_ENEMY_HP = 1e9;
/** Fragment piles drawn at once; piles beyond this are simply not shown (the drop cap keeps it far below). */
const MAX_ENTITIES_FRAGMENTS = 256;
const AURA_COLORS: Readonly<Record<string, string>> = {
	steel_gray: PALETTE.steelGray,
	amber: PALETTE.emberLight,
	wine: PALETTE.bloodLight,
	orange: PALETTE.ember,
};

/** Instance colour of an elite aura: the token colour pushed past 1 so the texture glows towards it. */
function auraTint(aura: string): readonly [number, number, number] {
	const hex = (AURA_COLORS[aura] ?? PALETTE.steelGray).slice(1);
	const channel = (offset: number): number =>
		(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) * 2;
	return [channel(0), channel(2), channel(4)];
}

const NO_CARDS: readonly CardView[] = [];
const NO_STATS: HudState["stats"] = [];

function runSeed(): number {
	const param = new URLSearchParams(location.search).get("seed");
	const parsed = param === null ? null : parseSeed(param);
	return parsed ?? crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

const DIFFICULTY_NAMES: Readonly<Record<string, string>> = {
	normal: "Normal",
	grim: "Grim",
	nightmare: "Nightmare",
};
const pt = (n: number): string => String(n).replace(".", ",");

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
	const runStats = createRunStats();

	// Account progress lives in IndexedDB (SDD 06). A corrupt or unreadable save starts a fresh one.
	const storage = createWebStorage();
	// The save keys ("save", "save.bak", "save.corrupt") are all valid storage keys; core only knows strings.
	const saveIO: SaveIO = {
		read: (key) => storage.read(key as StorageKey),
		write: (key, value) => storage.write(key as StorageKey, value),
		// One lock per origin, so two tabs finishing runs never interleave their read-modify-write.
		withLock: (fn) => (navigator.locks ? navigator.locks.request("grim-cubes-save", fn) : fn()),
	};
	// A save that is unreadable or newer is never overwritten: `readOnly` blocks writes for the whole session.
	const loaded = await loadMeta(saveIO);
	const meta: MetaState = loaded.meta;
	if (loaded.notice) log.warn("save problem", loaded.notice);
	const { fragments, xp } = roundsData;

	// A locked or unknown difficulty in the URL falls back to Normal (GDD 17).
	const difficultyId = chooseDifficulty(roundsData.difficulties, params.get("difficulty"), meta.records);
	const difficulty = difficultyData(roundsData.difficulties, difficultyId);

	// Permanent Ossuary nodes shape the run before it starts (GDD 19).
	const ossuaryBonus = applyOssuary(ossuaryData, meta);
	const runHeroData = {
		...heroData,
		base: { ...heroData.base, critMult: ossuaryBonus.critMult ?? heroData.base.critMult },
	};
	progress.gold += ossuaryBonus.startGold;

	const hero = spawnHero(world, {
		speed: heroData.base.speed,
		maxHp: heroData.base.maxHp,
		radius: heroData.base.radius,
	});
	const stats = createStatsSystem(runHeroData, createPlayerStats());
	stats.add(ossuaryBonus.modifiers);
	stats.run(hero);

	const owned = new Map<string, number>();
	// Milestone-gated items (GDD 20) stay out of shops and chests until the account reaches them; the run starts with
	// the pool the saved stats allow.
	const poolItems = availableItems(itemsData, milestonesData, meta);
	const dash = createDashSystem(heroData.dash, {
		unlocked: ossuaryBonus.dashUnlocked,
		charges: ossuaryBonus.dashCharges,
		cooldownReductionSeconds: ossuaryBonus.dashCooldownReductionSeconds,
	});
	let touchDash = false;
	const itemEffects = createEffectsSystem(itemsData, owned, {
		fragmentGain: ossuaryBonus.fragmentGain,
		soulGain: ossuaryBonus.soulGain,
		weakReviveHpFraction: ossuaryBonus.weakReviveHpFraction,
	});

	const startingWeapon = weaponsData.find((w) => w.id === heroData.startingWeapon);
	if (!startingWeapon) throw new Error(`Unknown starting weapon ${heroData.startingWeapon}`);
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
	const bag: { release?: (w: typeof world, x: number, z: number) => void } = {};
	const spawn = createSpawnSystem({
		config: roundsData.spawn,
		enemies: toEnemyDefs(enemiesData),
		rng: rng.spawn,
		events,
		// propCollision is created further down; it is only called once the loop runs.
		isBlocked: (x, z) => propCollision.overlaps(origin, x, z, maxEnemyRadius),
		onSpawn: (w, x, z) => bag.release?.(w, x, z),
	});
	let benchEmit = 0;
	let benchAngle = 0;
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
	const benchPool = [
		{ type: enemyIds.indexOf("husk"), weight: 6 },
		{ type: enemyIds.indexOf("wail"), weight: 4 },
	];
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
	});
	hooks.heroHit = elite.handleHeroHit;
	const bossDef = bossesData.find((b) => b.round === 10);
	if (!bossDef) throw new Error("No boss defined for round 10");
	const bossName = bossDef.name;
	const boss = createBossSystem({
		def: bossDef,
		rounds: roundsData.boss,
		spawn,
		events,
		queue: damage.queue,
		hero,
		rng: rng.combat,
		summonType: enemyIds.indexOf("husk"),
		difficulty: () => difficulty.hpDamageMult,
		onDefeated: () => {
			run.bossDied();
			for (let i = 0; i < roundsData.boss.freeWeaponUpgrades; i++) weapon.upgrade();
		},
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
		difficultyMult: difficulty.hpDamageMult,
		onRoundStart: (round, isBoss) => {
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
		},
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
	const chest = createChestSystem({
		reward: elitesData.reward,
		items: poolItems,
		rng: rng.loot,
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
		tiers: roundsData.tierChance,
		catalog: { items: poolItems, weapons: toShopWeapons(weaponsData) },
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
		steerGain: worldData.propSteerGain,
		steerMargin: worldData.propSteerMargin,
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
		chest: NO_CARDS,
		shop: null,
		stats: [],
		results: null,
		notice: loaded.notice,
		boss: null,
		bossIntro: null,
		ossuary: null,
		difficulty: null,
		dash: null,
	});
	createRoot(uiRoot).render(
		<App
			store={hud}
			stick={stick}
			onChooseCard={(index) => levelUp.choose(index)}
			onChooseChest={(index) => chest.choose(index)}
			onDashHold={(down) => {
				touchDash = down;
			}}
			onRestart={() => {
				difficultyOpen = true;
				publishNow();
			}}
			difficultyActions={{
				cancel: () => {
					difficultyOpen = false;
					publishNow();
				},
				start: (id, seedText) => {
					// Other parameters (debug, bench) survive; only the seed and difficulty are replaced.
					const next = new URLSearchParams(location.search);
					next.delete("seed");
					next.set("difficulty", chooseDifficulty(roundsData.difficulties, id, meta.records));
					const typed = parseSeed(seedText);
					if (typed !== null) next.set("seed", String(typed));
					location.search = next.toString();
				},
			}}
			ossuaryActions={{
				open: () => {
					ossuaryOpen = true;
					publishNow();
				},
				close: () => {
					ossuaryOpen = false;
					publishNow();
				},
				buy: (id) => changeOssuary((m) => buyAndThrow(m, id)),
				reset: () => changeOssuary((m) => void resetOssuary(ossuaryData, m)),
			}}
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
						flashBrightness: renderData.vfx.flashBrightness,
						boss: {
							scale: renderData.vfx.bossScale,
							enrageTint: renderData.vfx.bossEnrageTint as [number, number, number],
						},
						elite: {
							scale: elitesData.scale,
							tints: elitesData.modifiers.map((modifier) => auraTint(modifier.aura)),
						},
					},
				)
			: undefined;
	// Hit-stop pauses the simulation, not the rendering, so the freeze frame still shows the burst.
	const hitStop = createHitStop({
		pause: () => loop.pause(),
		resume: () => loop.resume(),
		now: () => performance.now(),
	});
	const vfx = createVfx(game, {
		onHitStop: (ms) => hitStop.request(ms),
		// Elites get the long hit-stop of a boss kill too (GDD section 23).
		isBoss: (entity) => (Boss.id[entity] ?? 0) > 0 || (Elite.modifier[entity] ?? 0) > 0,
	});
	const projectileView = createProjectileRenderer(
		game,
		projectiles.capacity,
		renderData.vfx.projectileSize,
	);
	let frozenAt: number | null = null;
	const eliteView = createEliteView(game);
	const enemyShotView = createEnemyShotRenderer(game, 128, renderData.vfx.enemyShotSize);
	const fragmentView = createFragmentRenderer(game, MAX_ENTITIES_FRAGMENTS);
	const port = createRenderPort(game, horde, {
		origin,
		followRate: CAMERA.followRate,
		vfx,
		elite: eliteView,
	});
	const skin = unlockedSkins(milestonesData, meta).at(-1);
	if (skin) game.setHeroTint(skin.tint);
	const propTypes: PropTypeDef[] = [];
	for (const name of chunkGen.propTypes) {
		const placeholder = PLACEHOLDER_PROPS.find((p) => name.startsWith(p.name)) ?? PLACEHOLDER_PROPS[0];
		if (!placeholder) continue;
		const mesh = assets?.props.get(name);
		const data = propsData.find((p) => p.id === name);
		// Tall props fade while they hide the hero (P-02-03).
		const fade =
			data && data.height > renderData.propFade.minHeight
				? { fade: { radius: data.radius, height: data.height } }
				: {};
		propTypes.push({ ...placeholder, name, ...(mesh ? { mesh } : {}), ...fade });
	}
	const chunkRenderer = createChunkRenderer(
		game,
		chunks,
		{
			chunkSize: worldData.chunkSize,
			maxPropsPerChunk: worldData.maxPropsPerChunk,
			loadRadius: worldData.loadRadius,
			fade: renderData.propFade,
		},
		propTypes,
	);

	const fighting = (): boolean => run.state === "Round" || run.state === "BossRound";
	let lastOffer: readonly CardView[] = NO_CARDS;
	let lastOfferSource: unknown = null;
	let lastChest: readonly CardView[] = NO_CARDS;
	let lastBossJson = "";
	let lastBoss: HudState["boss"] = null;
	let lastChestSource: unknown = null;
	let lastHud = Number.NEGATIVE_INFINITY;
	let inShop = false;
	let settled = false;
	let results: HudState["results"] = null;
	let lastShopJson = "";
	let lastShop: HudState["shop"] = null;

	/** Credits the run to the account once: souls, record and totals, then saves (SDD 06). */
	function settleRun(): void {
		settled = true;
		const souls = soulsForRun(
			{
				perRound: roundsData.souls.perRound,
				perElite: roundsData.souls.perElite,
				bossBase: roundsData.boss.soulsBase,
				bossPerRound: roundsData.boss.soulsPerRound,
			},
			{ round: run.round, elitesKilled: runStats.elitesKilled, bossRounds: runStats.bossRounds },
			difficulty.soulsMult,
			itemEffects.effects.soulGain,
		);
		const newRecord = run.round > meta.records[difficultyId];
		const result: RunResult = {
			souls,
			round: run.round,
			difficulty: difficultyId,
			kills: runStats.kills,
			bossKills: runStats.bossRounds.length,
			elitesKilled: runStats.elitesKilled,
		};
		applyRun(meta, result);
		if (!loaded.readOnly) {
			// The stored save is re-read and the run added to it, so progress from another tab is kept.
			persistRun(saveIO, result, __APP_VERSION__)
				.then((merged) => {
					Object.assign(meta, merged);
					if (results)
						results = {
							...results,
							totalSouls: merged.souls,
							record: merged.records[difficultyId],
						};
					publishNow();
				})
				.catch((error: unknown) => log.error("save failed", error));
		}

		const weaponName = weaponsData.find((w) => w.id === weapon.weapon.id)?.name ?? weapon.weapon.id ?? "";
		const killer = runStats.killer;
		results = {
			round: run.round,
			kills: runStats.kills,
			damage: Math.round(runStats.damageDealt),
			cause:
				killer.kind === "enemy"
					? (enemiesData[killer.type]?.name ?? "Desconhecido")
					: killer.kind === "self"
						? "Explosão própria"
						: "Desconhecido",
			build: [
				`${weaponName} (T${weapon.tier + 1})`,
				...[...owned].map(([id, count]) => {
					const name = itemsData.find((i) => i.id === id)?.name ?? id;
					return count > 1 ? `${name} ×${count}` : name;
				}),
			],
			souls,
			totalSouls: meta.souls,
			record: meta.records[difficultyId],
			newRecord,
			seed,
		};
		publishNow();
	}

	let ossuaryOpen = false;
	let difficultyOpen = false;

	function difficultyView(): NonNullable<HudState["difficulty"]> {
		return {
			selected: difficultyId,
			options: roundsData.difficulties.map((def) => {
				const locked = !isUnlocked(def, meta.records);
				const needed = def.unlockedBy;
				return {
					id: def.id,
					name: DIFFICULTY_NAMES[def.id] ?? def.id,
					summary: `HP e dano ×${pt(def.hpDamageMult)} · almas ×${pt(def.soulsMult)}`,
					locked,
					requirement: needed
						? `Chegue ao round ${needed.round} em ${DIFFICULTY_NAMES[needed.difficulty] ?? needed.difficulty}`
						: "",
				};
			}),
		};
	}

	function buyAndThrow(m: MetaState, id: string): void {
		const result = buyNode(ossuaryData, m, id, __IS_DEMO__);
		if (!result.ok) throw new Error(`ossuary: ${result.reason}`);
	}

	/** Applies a tree change to the stored save under the lock, then mirrors it in memory. */
	function changeOssuary(mutate: (m: MetaState) => void): void {
		if (loaded.readOnly) return;
		updateMeta(saveIO, mutate, __APP_VERSION__)
			.then((merged) => {
				Object.assign(meta, merged);
				publishNow();
			})
			.catch((error: unknown) => log.warn("ossuary change refused", error));
	}

	function ossuaryView(): NonNullable<HudState["ossuary"]> {
		return {
			souls: meta.souls,
			refund: refundValue(ossuaryData, meta),
			branches: ossuaryData.branches.map((branch) => ({
				id: branch.id,
				name: branch.name,
				nodes: branch.nodes.map((node) => ({
					id: node.id,
					lines: [
						...node.modifiers.map(describeModifier),
						...node.effects.map((e) => describeEffect(e.id, e.params)),
					],
					cost: node.cost,
					state: nodeState(ossuaryData, meta, node, __IS_DEMO__),
					affordable: meta.souls >= node.cost,
				})),
			})),
		};
	}

	function publishNow(): void {
		const offer = levelUp.offer;
		if (offer !== lastOfferSource) {
			lastOfferSource = offer;
			lastOffer = offer ? offer.map((c) => ({ id: c.id, name: c.name, double: c.double })) : NO_CARDS;
		}
		const chestOffer = chest.offer;
		if (chestOffer !== lastChestSource) {
			lastChestSource = chestOffer;
			lastChest = chestOffer
				? chestOffer.map((c) => ({
						id: c.id,
						name: [c.name, ...c.modifiers.map(describeModifier)].join(": "),
						double: false,
					}))
				: NO_CARDS;
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
		const view = boss.view();
		if (view === null) {
			lastBossJson = "";
			lastBoss = null;
		} else {
			const json = JSON.stringify(view);
			if (json !== lastBossJson) {
				lastBossJson = json;
				lastBoss = view;
			}
		}
		const bossView = lastBoss;
		const next: HudState = {
			hp: Math.max(0, Math.ceil(Health.hp[hero] ?? 0)),
			maxHp: Math.ceil(Health.max[hero] ?? 0),
			round: run.round,
			level: progress.level,
			xp: Math.floor(progress.xp),
			xpNeeded: xpForLevel(xp, progress.level),
			gold: Math.floor(progress.gold),
			cards: lastOffer,
			chest: lastChest,
			shop: shopView,
			stats: shopView ? describeStats(stats.stats) : NO_STATS,
			results,
			notice: loaded.notice,
			boss: bossView,
			ossuary: ossuaryOpen ? ossuaryView() : null,
			difficulty: difficultyOpen ? difficultyView() : null,
			bossIntro: run.state === "BossIntro" ? bossName : null,
			dash: dash.unlocked
				? {
						charges: dash.charges,
						max: dash.maxCharges,
						recharge: Math.floor(dash.recharge * 20) / 20,
					}
				: null,
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
			cur.chest !== next.chest ||
			cur.boss !== next.boss ||
			cur.dash?.charges !== next.dash?.charges ||
			cur.dash?.recharge !== next.dash?.recharge ||
			cur.ossuary !== null ||
			cur.difficulty !== null ||
			next.difficulty !== null ||
			next.ossuary !== null ||
			cur.bossIntro !== next.bossIntro ||
			cur.shop !== next.shop ||
			cur.results !== next.results
		) {
			hud.publish(next);
		}
	}

	/** Real shots die in the crowd around the hero, so a ring emitter keeps the pool at the reference load: slow
	 * harmless pellets that circle the horde and live 5 s. */
	const emitBenchProjectiles = (): void => {
		benchEmit += BENCH_PROJECTILES / BENCH_PROJECTILE_STEPS;
		while (benchEmit >= 1) {
			benchEmit -= 1;
			benchAngle += 2.399963;
			const radius = 7 + (benchAngle % 3);
			projectiles.acquire({
				x: (Position.x[hero] ?? 0) + Math.cos(benchAngle) * radius,
				z: (Position.z[hero] ?? 0) + Math.sin(benchAngle) * radius,
				vx: -Math.sin(benchAngle) * 3,
				vz: Math.cos(benchAngle) * 3,
				damage: 0,
				critChance: 0,
				knockback: 0,
				pierce: 0,
				lifeSteps: BENCH_PROJECTILE_STEPS,
				radius: 0.15,
				explosionRadius: 0,
				selfFraction: 0,
			});
		}
	};

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
				// Keep the horde at the cap: enemies are made effectively immortal (the bench measures the load, not the
				// balance) and a spent quota starts another round.
				if (spawn.remaining === 0) spawn.startRound(20, { pool: benchPool, difficultyMult: 1 });
				const benchEnemies = queryEnemies(world);
				for (let i = 0; i < benchEnemies.length; i++) {
					const e = benchEnemies[i] ?? 0;
					Health.hp[e] = Health.max[e] = BENCH_ENEMY_HP;
				}
				if (bench === "round20") {
					targeting.run(world, hero, weapon.range);
					weapon.run(world, hero);
					// Real shots die in the crowd around the hero, so a ring emitter keeps the pool at the reference
					// load: harmless slow pellets that circle the horde and live 5 s.
					emitBenchProjectiles();
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
				dash.run(hero, input);
				behavior.run(world, hero);
				boss.run(world);
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
				enemyShotSystem.run(world, hero);
				aura.run(world, hero);
				damage.run(world);
				death.run(world);
				pickup.run(world, hero);
				elite.run(world);
				chest.run(world, hero);
				stats.run(hero);
				levelUp.run();
				if ((Health.hp[hero] ?? 0) <= 0 && !itemEffects.tryRevive(hero)) run.heroDied();
			}
			if (run.state === "Shop" && !inShop) shop.open();
			inShop = run.state === "Shop";
			// No results screen yet (P-05-08): a finished run starts over.
			if (run.state === "Results" && !settled) settleRun();
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
			// VFX stop with the world while paused (level-up) so a captured frame is stable.
			vfx.update(run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000));
			projectileView.sync(world, alpha);
			enemyShotView.sync(world, alpha);
			eliteView.update(
				run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000),
				game.hero.position.x,
				game.hero.position.z,
			);
			fragmentView.sync(world, alpha, (frozenAt ?? performance.now()) / 1000);
			hitStop.update();
			const camera = game.camera;
			chunkRenderer.updateFade(
				{
					cameraX: camera.position.x,
					cameraZ: camera.position.z,
					cameraHeight: camera.position.y,
					heroX: game.hero.position.x,
					heroZ: game.hero.position.z,
					heroHeight: renderData.propFade.heroHeight,
				},
				Math.min(0.1, render.engine.getDeltaTime() / 1000),
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
			spawnElite: (modifier?: number) => {
				elite.spawnNow(world, (Position.x[hero] ?? 0) + 1.5, Position.z[hero] ?? 0, modifier);
			},
			toRound: (n: number) => {
				run.setRound(n - 1);
				run.forceEnd(world);
			},
			killBoss: () => {
				for (const e of query(world, [Boss])) {
					// The chest drops where the boss dies; bring it within pickup range so the test need not walk there.
					Position.x[e] = (Position.x[hero] ?? 0) + 1.5;
					Position.z[e] = Position.z[hero] ?? 0;
					Health.hp[e] = 0;
				}
			},
			/** Announces a chest next to the hero (placeholder render, P-05-06b capture). */
			showChest: () => {
				events.push(
					EventType.ChestDropped,
					(Position.x[hero] ?? 0) + 3,
					(Position.z[hero] ?? 0) + 2,
					0,
					0,
				);
			},
			killElites: () => {
				for (const e of query(world, [Elite])) Health.hp[e] = 0;
			},
			killHero: () => {
				Health.hp[hero] = 0;
			},
			meta: () => ({ souls: meta.souls, record: meta.records.normal, runs: meta.stats.runs }),
			/** Nearest loaded blocking prop taller than propFade.minHeight, in scene coordinates (P-02-03). */
			tallProp: () => {
				let best: { x: number; z: number; radius: number } | null = null;
				let bestDistance = Number.POSITIVE_INFINITY;
				for (const chunk of chunks.slots) {
					if (!chunk) continue;
					for (let p = 0; p < chunk.propCount; p++) {
						const name = chunkGen.propTypes[chunk.propType[p] ?? 0];
						const data = propsData.find((d) => d.id === name);
						if (!data || data.height <= renderData.propFade.minHeight) continue;
						const x = chunk.cx * worldData.chunkSize + (chunk.propX[p] ?? 0) - origin.x;
						const z = chunk.cz * worldData.chunkSize + (chunk.propZ[p] ?? 0) - origin.z;
						const distance = Math.hypot(x - (Position.x[hero] ?? 0), z - (Position.z[hero] ?? 0));
						if (distance < bestDistance) {
							bestDistance = distance;
							best = { x, z, radius: data.radius };
						}
					}
				}
				return best;
			},
			teleport: (x: number, z: number) => {
				Position.x[hero] = PrevPosition.x[hero] = x;
				Position.z[hero] = PrevPosition.z[hero] = z;
			},
			minPropAlpha: () => chunkRenderer.minAlpha(),
			setGore: (full: boolean) => vfx.setGore(full),
			/** Drops `count` fragment piles in a ring around the hero (P-04-06 capture). */
			dropFragments: (count: number) => {
				for (let i = 0; i < count; i++) {
					const angle = (i / count) * Math.PI * 2;
					const radius = 4 + (i % 3);
					dropFragment(
						world,
						(Position.x[hero] ?? 0) + Math.cos(angle) * radius,
						(Position.z[hero] ?? 0) + Math.sin(angle) * radius,
						5 + i,
					);
				}
			},
			vfx: () => ({
				particles: { ...vfx.particles.stats, capacity: vfx.particles.capacity },
				decals: {
					live: vfx.decals.live,
					capacity: vfx.decals.capacity,
					recycled: vfx.decals.recycled,
				},
				numbers: { live: vfx.numbers.live, dropped: vfx.numbers.dropped },
				projectiles: { live: projectileView.live, capacity: projectileView.capacity },
				fragments: { live: fragmentView.live, capacity: fragmentView.capacity },
				hitStopActive: hitStop.active,
			}),
			/** Stops the simulation and the horde clock so the frame can be captured. */
			freeze: () => {
				run.pause();
				loop.pause();
				frozenAt = performance.now();
			},
			saveNotice: () => loaded.notice,
			heroMaxHp: () => Health.max[hero] ?? 0,
			heroPos: () => ({ x: origin.x + (Position.x[hero] ?? 0), z: origin.z + (Position.z[hero] ?? 0) }),
			difficulty: () => difficultyId,
			openOssuary: () => {
				ossuaryOpen = true;
				publishNow();
			},
			grantSouls: (amount: number) => {
				changeOssuary((m) => {
					m.souls += amount;
				});
			},
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
		// Start already at the reference load: fill the cap and the projectile pool before the warm-up begins.
		for (
			let step = 0;
			step < 900 && queryEnemies(world).length < roundsData.spawn.maxSimultaneous;
			step++
		) {
			spawn.run(world, hero);
		}
		if (bench === "round20") {
			for (let step = 0; step < BENCH_PROJECTILE_STEPS; step++) {
				emitBenchProjectiles();
				projectileSystem.run(world);
			}
		}
		const heavy = weaponsData.find((w) => w.id === "mg");
		// Maximum-cadence MG at its top tier fires for real; the emitter below holds the projectile count.
		if (bench === "round20" && heavy) weapon.setWeapon(heavy, weapon.maxTier);
	} else {
		run.newRun();
	}
	if (__DEBUG_API__ && bench && window.gc.debug) {
		const recorder = createBenchRecorder(game.scene, render.engine);
		window.gc.debug.bench = {
			scenario: bench,
			enemies: () => queryEnemies(world).length,
			projectiles: () => projectiles.active,
			/**
			 * Warm-up is discarded; resolves with the SDD 14 metrics of the measured window plus the mean live
			 * enemies and projectiles over it (sampled every 100 ms), so a report proves the load it measured.
			 */
			run: (warmupMs: number, measureMs: number) =>
				new Promise((resolve) => {
					setTimeout(() => {
						let samples = 0;
						let enemySum = 0;
						let projectileSum = 0;
						const sampler = setInterval(() => {
							samples++;
							enemySum += queryEnemies(world).length;
							projectileSum += projectiles.active;
						}, 100);
						recorder.start();
						setTimeout(() => {
							clearInterval(sampler);
							resolve({
								...recorder.stop(),
								enemiesAvg: samples > 0 ? enemySum / samples : 0,
								projectilesAvg: samples > 0 ? projectileSum / samples : 0,
							});
						}, measureMs);
					}, warmupMs);
				}),
		};
	}
	render.engine.runRenderLoop(() => {
		// Once per frame: getGamepads() allocates, and several steps may run per frame.
		sources.poll(input);
		if (touchDash) input.dash = true;
		loop.frame(performance.now());
	});
	window.addEventListener("resize", () => render.engine.resize());
	game.scene.executeWhenReady(() => {
		window.gc.ready = true;
		log.info("ready", { version: __APP_VERSION__, target: __BUILD_TARGET__, demo: __IS_DEMO__, seed });
	});
}

boot().catch((error: unknown) => log.error("boot failed", error));
