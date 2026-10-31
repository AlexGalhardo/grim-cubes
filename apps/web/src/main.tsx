import {
	applyRun,
	COLORBLIND_MODES,
	checkKey,
	checkPadButton,
	consoleSink,
	createInputState,
	createKeyMap,
	createLogger,
	createPadMap,
	createStore,
	createTelemetry,
	createVirtualStick,
	type Described,
	i18n,
	type KeyAction,
	type KeyCheck,
	keyBindingsFor,
	loadMeta,
	type MetaState,
	type PadAction,
	type PadCheck,
	padBindingsFor,
	persistRun,
	type RunResult,
	type SaveIO,
	t,
	UI_SCALES,
	updateMeta,
} from "@gc/core";
import {
	addFragmentValue,
	applyOriginShift,
	Bleed,
	Boss,
	biomesData,
	bossesData,
	buyNode,
	chooseDifficulty,
	createGameSession,
	createLoop,
	createTips,
	createTutorial,
	cullDistantEnemies,
	describeEffect,
	describeModifier,
	describeStats,
	difficultyData,
	dropFragment,
	Elite,
	ENEMY_SHOT_POOL_SIZE,
	EnemyType,
	type EventBuffer,
	EventType,
	elitesData,
	enemiesData,
	Fragment,
	type GameSpeed,
	Health,
	heroData,
	isUnlocked,
	KnockbackResist,
	milestonesData,
	movementSystem,
	nextSpeed,
	nodeState,
	ossuaryData,
	Position,
	PrevPosition,
	parseSeed,
	presetsData,
	propsData,
	queryEnemies,
	refundValue,
	renderData,
	resetOssuary,
	roundsData,
	Speed,
	STEP,
	soulsForRun,
	unlockedSkins,
	weaponsData,
	worldData,
	xpForLevel,
} from "@gc/game";
import {
	createElectronStorage,
	createInputSources,
	createWebStorage,
	detectPlatform,
	migrateStorage,
	type StorageKey,
} from "@gc/platform";
import {
	applyPreset,
	auraHex,
	CAMERA,
	type Character,
	choosePresetId,
	createAtmosphere,
	createBenchRecorder,
	createCharacters,
	createChunkRenderer,
	createConsumableRenderer,
	createDynamicScaler,
	createEggRenderer,
	createEliteAuras,
	createEliteView,
	createEnemyShotRenderer,
	createEngine,
	createFragmentRenderer,
	createGameScene,
	createHitStop,
	createHordeRenderer,
	createPortrait,
	createProjectileRenderer,
	createRenderPort,
	createVfx,
	createVision,
	hardwareInfo,
	importModelMesh,
	loadCharacter,
	loadGameAssets,
	PALETTE,
	PLACEHOLDER_PROPS,
	type PropTypeDef,
	pickAutoPreset,
} from "@gc/render";
import {
	App,
	type CardView,
	type HudState,
	type IconRef,
	type PortraitFactory,
	type VolumeBus,
} from "@gc/ui";
import { addComponent, query } from "bitecs";
import { createRoot } from "react-dom/client";
import { bootArtReview } from "./artReview";
import { createAudioEngine } from "./audio/audioEngine";
import { createEventAudio } from "./audio/eventSounds";
import { createWebAudioDeps, musicFor } from "./audio/webAudio";
import { applyLocale, initLocale } from "./locale";
import "./main.css";

const log = createLogger("boot");
const HUD_HZ = 12;
/** Presets that skip the emissive atlases. */
const LOW_PRESETS: readonly string[] = ["minimum", "low"];
/** Screens this wide or narrower draw damage numbers at 0.7x. */
const SMALL_SCREEN_WIDTH = 900;
const SMALL_NUMBER_SCALE = 0.7;
/** Ground footprint radius of an unscaled enemy, the base of the elite aura ring. */
const ELITE_AURA_RADIUS = 0.6;
/** Live projectiles the round20 bench keeps in the pool (SDD 14 section 1: 200). */
const BENCH_PROJECTILES = 200;
/** Flight time of an emitted bench projectile, in steps (5 s). */
const BENCH_PROJECTILE_STEPS = 300;
/** Bench enemy hit points: nothing dies, so the horde stays at the cap. */
const BENCH_ENEMY_HP = 1e9;
/** Fragment piles drawn at once; piles beyond this are simply not shown (the drop cap keeps it far below). */
const MAX_ENTITIES_FRAGMENTS = 256;
/** Instance colour of an elite aura: the token colour pushed past 1 so the texture glows towards it. */
function auraTint(aura: string): readonly [number, number, number] {
	const hex = auraHex(aura).slice(1);
	const channel = (offset: number): number =>
		(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) * 2;
	return [channel(0), channel(2), channel(4)];
}

/** Floor base colour of a biome: its fog colour pulled halfway towards the shadow tone, so floors read lighter than fog. */
function floorTint(fogColor: string): string {
	const mixChannel = (offset: number): string => {
		const a = Number.parseInt(fogColor.slice(1 + offset, 3 + offset), 16);
		const b = Number.parseInt(PALETTE.shadow.slice(1 + offset, 3 + offset), 16);
		return Math.round(a + (b - a) * 0.5)
			.toString(16)
			.padStart(2, "0");
	};
	return `#${mixChannel(0)}${mixChannel(2)}${mixChannel(4)}`;
}

const NO_CARDS: readonly CardView[] = [];
const NO_STATS: HudState["stats"] = [];

function runSeed(): number {
	const param = new URLSearchParams(location.search).get("seed");
	const parsed = param === null ? null : parseSeed(param);
	return parsed ?? crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

/** Turns a key plus parameters from the game into text for the active locale. */
const text = (d: Described): string => t(d.key, d.params);

async function boot(): Promise<void> {
	initLocale();
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

	// Account progress lives in IndexedDB on the web and in files under the app data folder in Electron (SDD 06,
	// ADR-0009). A corrupt or unreadable save starts a fresh one.
	const desktop = window.gcDesktop;
	const storage = desktop ? createElectronStorage(desktop.storage) : createWebStorage();
	if (desktop) {
		// First run with files: the save the same origin kept in IndexedDB before moves over once.
		const moved = await migrateStorage(createWebStorage(), storage).catch((error: unknown) => {
			log.warn("save migration from IndexedDB failed", error);
			return [];
		});
		if (moved.length > 0) log.info("save moved from IndexedDB to files", moved);
	}
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
	// The saved language applies unless `?lang=` forces one for this session.
	if (!params.has("lang")) applyLocale(meta.settings.locale);
	const { fragments, xp } = roundsData;

	// A locked or unknown difficulty in the URL falls back to Normal (GDD 17).
	const difficultyId = chooseDifficulty(roundsData.difficulties, params.get("difficulty"), meta.records);
	const difficulty = difficultyData(roundsData.difficulties, difficultyId);

	// The web demo ends at the first boss: no walk to the Merchant there, the DemoEnd shows at once.
	const demoLastRound = bossesData[0]?.round ?? 10;
	const session = createGameSession({
		seed,
		difficulty,
		meta,
		autoShop: __IS_DEMO__ ? (round: number) => round >= demoLastRound : false,
	});
	const {
		events,
		world,
		origin,
		progress,
		runStats,
		hero,
		stats,
		owned,
		dash,
		itemEffects,
		enemyIds,
		damage,
		separation,
		targeting,
		projectiles,
		weapon,
		projectileSystem,
		spawn,
		behavior,
		elite,
		boss,
		run,
		death,
		pickup,
		levelUp,
		chest,
		shop,
		chunkGen,
		chunks,
		biomeMap,
	} = session;
	// Bench-only state (P-03-06): the ring emitter and the horde it keeps at the cap.
	let touchDash = false;
	let benchEmit = 0;
	let benchAngle = 0;
	const benchPool = [
		{ type: enemyIds.indexOf("husk"), weight: 6 },
		{ type: enemyIds.indexOf("wail"), weight: 4 },
	];

	// Round 1 tips are for the first runs of a player; seeded, debug and bench runs (tests, replays) skip them
	// unless `?tips=1` asks for them.
	const tips = createTips();
	const tutorial = createTutorial();
	const tutorialOn = new URLSearchParams(location.search).get("tutorial") === "1";
	const tipsEnabled = (): boolean => {
		const params = new URLSearchParams(location.search);
		if (params.has("tips")) return params.get("tips") === "1";
		return meta.stats.runs < 3 && !params.has("seed") && !params.has("debug") && !params.has("bench");
	};
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
		vignette: 0,
		tip: null,
		ossuary: null,
		difficulty: null,
		dash: null,
		cardRerolls: 0,
		options: null,
		speed: meta.settings.gameSpeed,
		uiScale: meta.settings.uiScale,
		rerollKey: meta.settings.keys.reroll,
		inputDevice: "keyboard",
		padReroll: meta.settings.pad.reroll,
		colorblind: meta.settings.colorblind !== "off",
		caption: null,
		merchant: null,
		demoEnd: false,
		menu: null,
	});
	// The handlers are function declarations further down; the screen only calls them after boot.
	const optionsActions = {
		setPreset: (id: string): void => setPresetOption(id),
		setVolume: (bus: VolumeBus, percent: number): void => {
			audio.setVolume(bus, percent);
			void changeSettings((st) => (st.volume[bus] = percent));
		},
		setScreenShake: (on: boolean): void => void changeSettings((st) => (st.screenShake = on)),
		setGameSpeed: (speed: number): void => setSpeed(speed),
		setTelemetry: (on: boolean): void => {
			void changeSettings((st) => (st.telemetry = on));
			if (on) telemetry.track("session_start", { version: __APP_VERSION__, target: __BUILD_TARGET__ });
			else telemetry.flush();
		},
		setBrightness: (percent: number): void => {
			vision.setBrightness(percent / 100);
			void changeSettings((st) => (st.brightness = Math.round(percent)));
		},
		setContrast: (percent: number): void => {
			vision.setContrast(percent / 100);
			void changeSettings((st) => (st.contrast = Math.round(percent)));
		},
		setColorblind: (mode: string): void => {
			const next = COLORBLIND_MODES.find((m) => m === mode) ?? "off";
			vision.setColorblindMode(next);
			void changeSettings((st) => (st.colorblind = next));
		},
		setFlashReduction: (on: boolean): void => {
			vision.setFlashReduction(on);
			void changeSettings((st) => (st.flashReduction = on));
		},
		setUiScale: (percent: number): void => {
			const next = UI_SCALES.find((s) => s === percent) ?? 100;
			void changeSettings((st) => (st.uiScale = next));
		},
		setGore: (full: boolean): void => {
			vfx.setGore(full);
			void changeSettings((st) => (st.gore = full));
		},
		setKey: (action: KeyAction, code: string): KeyCheck => {
			const check = checkKey(meta.settings.keys, action, code);
			if (check.ok) {
				void changeSettings((st) => (st.keys[action] = code));
				sources.keyboard.setBindings(keyBindingsFor(meta.settings.keys));
			}
			return check;
		},
		resetKeys: (): void => {
			void changeSettings((st) => Object.assign(st.keys, createKeyMap()));
			sources.keyboard.setBindings(keyBindingsFor(meta.settings.keys));
		},
		setPadButton: (action: PadAction, button: number): PadCheck => {
			const check = checkPadButton(meta.settings.pad, action, button);
			if (check.ok) {
				void changeSettings((st) => (st.pad[action] = button));
				sources.setPadBindings(padBindingsFor(meta.settings.pad));
			}
			return check;
		},
		resetPad: (): void => {
			void changeSettings((st) => Object.assign(st.pad, createPadMap()));
			sources.setPadBindings(padBindingsFor(meta.settings.pad));
		},
		setSubtitles: (on: boolean): void => {
			void changeSettings((st) => (st.subtitles = on));
			if (!on) captionText = null;
		},
		setLocale: (id: string): void => setLocaleOption(id),
		close: (): void => {
			optionsOpen = false;
			loop.resume();
			publishNow();
		},
	};
	// The Merchant rig loads after the UI mounts; the factory resolves it on use and draws nothing until it exists.
	let makePortrait: PortraitFactory | undefined;
	const shopPortrait: PortraitFactory = (canvas) =>
		makePortrait?.(canvas) ?? { start: () => undefined, stop: () => undefined };
	createRoot(uiRoot).render(
		<App
			// shortcut: the registerView portrait shrinks the game canvas while the Shop is open (S1 is moving it to a render target); off until then.
			shopPortrait={shopPortrait}
			store={hud}
			version={__APP_VERSION__}
			demo={__IS_DEMO__}
			stick={stick}
			onChooseCard={(index) => levelUp.choose(index)}
			onRerollCards={() => levelUp.reroll()}
			onChooseChest={(index) => chest.choose(index)}
			onDashHold={(down) => {
				touchDash = down;
			}}
			onOpenOptions={() => {
				optionsOpen = true;
				loop.pause();
				publishNow();
			}}
			optionsActions={optionsActions}
			menuActions={{
				play: () => {
					difficultyOpen = true;
					publishNow();
				},
				ossuary: () => {
					ossuaryOpen = true;
					publishNow();
				},
				options: () => {
					optionsOpen = true;
					loop.pause();
					publishNow();
				},
			}}
			onCycleSpeed={() => setSpeed(nextSpeed(loop.speed))}
			onMerchantTalk={() => {
				session.merchant.talk();
				publishNow();
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
				start: (id, seedText, tutorial) => {
					// Other parameters (debug, bench) survive; only the seed and difficulty are replaced.
					const next = new URLSearchParams(location.search);
					next.delete("seed");
					next.delete("tutorial");
					if (tutorial) next.set("tutorial", "1");
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
					if (run.state === "Shop" && !(__IS_DEMO__ && run.round >= (bossesData[0]?.round ?? 10)))
						run.closeShop();
					publishNow();
				},
			}}
		/>,
	);

	const input = createInputState();
	let lastDevice: "keyboard" | "pad" = "keyboard";
	const sources = createInputSources({
		target: window,
		bindings: keyBindingsFor(meta.settings.keys),
		padBindings: padBindingsFor(meta.settings.pad),
		getGamepads: () => navigator.getGamepads(),
		...(stick ? { stick } : {}),
	});

	const render = await createEngine(canvas);
	const game = createGameScene(render.engine, platform.mobile);
	// Accessibility look (Options screen): the Options wiring calls its setters; the VFX read `flashReduced`.
	const vision = createVision(game);
	// Video preset (SDD 14 section 5): `?preset=` in debug builds, else the hardware rule table (R-01-03).
	const forced = __DEBUG_API__ ? params.get("preset") : null;
	const hardware = hardwareInfo(
		platform.mobile,
		navigator as { hardwareConcurrency?: number; deviceMemory?: number },
		render.engine.getGlInfo().renderer,
	);
	const pinned = __DEBUG_API__ && (bench !== null || params.has("debug"));
	const autoId = choosePresetId(
		forced,
		pinned,
		pickAutoPreset(presetsData.auto, hardware),
		presetsData.default,
	);
	/** "auto" (or an id that no longer exists) resolves through the hardware table. */
	const presetFor = (id: string): (typeof presetsData.presets)[number] | undefined =>
		presetsData.presets.find((p) => p.id === id) ??
		presetsData.presets.find((p) => p.id === autoId) ??
		presetsData.presets[0];
	// A query or a pinned bench/debug run wins over the saved Options choice, so measurements stay comparable.
	const preset = presetFor(forced || pinned ? autoId : meta.settings.preset);
	// Models, VATs and atlases come from `assets:build`. Without them (dev server before the first build) the game
	// keeps the placeholder boxes and the horde simply does not render.
	const assets = await loadGameAssets(game.scene, {
		baseUrl: "/assets/",
		enemyIds,
		propIds: chunkGen.propTypes,
		warn: (message) => log.warn(message),
		// The emissive atlases cost ~16 MB of GPU each: the two lowest presets go without them (SDD 14).
		emissive: !LOW_PRESETS.includes(preset?.id ?? ""),
	}).catch((error: unknown) => {
		log.warn("assets unavailable, using placeholders", error);
		return null;
	});
	// Skeleton characters (P-06-06): the hero, the Merchant and the Gravedigger. Missing models keep the placeholders.
	const loadRig = async (
		id: string,
		rig: { refSpeed: number; idle: string; move: string },
	): Promise<Character | undefined> => {
		const entry = assets?.manifest.entries[id];
		if (!assets || !entry) return undefined;
		try {
			return await loadCharacter(game.scene, `/assets/${entry.url}`, {
				blendSeconds: renderData.character.blendSeconds,
				material: assets.characterMaterial ?? undefined,
				...rig,
			});
		} catch (error) {
			log.warn(`character ${id} unavailable, using the placeholder`, error);
			return undefined;
		}
	};
	const heroRig = await loadRig("hero", { refSpeed: heroData.base.speed, idle: "idle", move: "run" });
	const merchantRig = await loadRig("bone_merchant", { refSpeed: 1, idle: "idle", move: "idle" });
	// One rig per boss, by Boss.id - 1; a boss whose model is missing keeps its horde instance.
	const bossRigs = await Promise.all(
		bossesData.map((def) => loadRig(def.id, { refSpeed: def.speed ?? 2.4, idle: "idle", move: "walk" })),
	);
	if (heroRig && assets) {
		game.hero.isVisible = false;
		const weaponEntry = assets.manifest.entries[`weapon_${heroData.startingWeapon}`];
		if (weaponEntry) {
			const weaponMesh = await importModelMesh(game.scene, `/assets/${weaponEntry.url}`).catch(
				() => null,
			);
			if (weaponMesh) {
				if (assets.characterMaterial) weaponMesh.material = assets.characterMaterial;
				heroRig.attachWeapon(weaponMesh);
			}
		}
	}
	if (merchantRig) makePortrait = (canvas) => createPortrait(game, canvas, merchantRig);
	const characters = heroRig
		? createCharacters(game, {
				hero: heroRig,
				merchant: merchantRig,
				merchantView: () => session.merchant.view,
				bosses: bossRigs,
				heroTarget: () => targeting.target,
				executionZoom: renderData.character.executionZoom,
				executionSeconds: renderData.character.executionSeconds,
			})
		: undefined;
	const horde =
		assets && assets.enemies.length > 0
			? createHordeRenderer(
					[
						...assets.enemies.map((enemy, index) => ({
							mesh: enemy.mesh,
							vat: enemy.vat,
							walkRefSpeed: enemiesData[index]?.walkRefSpeed ?? 1,
							radius: enemiesData[index]?.radius ?? 0.6,
						})),
						// Cosmetic variants share their base type's stats; only the mesh and the VAT differ.
						...assets.variants.flatMap((variant) => {
							const base = assets.enemies.findIndex((enemy) => enemy.id === variant.base);
							return base < 0
								? []
								: [
										{
											mesh: variant.mesh,
											vat: variant.vat,
											walkRefSpeed: enemiesData[base]?.walkRefSpeed ?? 1,
											radius: enemiesData[base]?.radius ?? 0.6,
											base,
										},
									];
						}),
					],
					{
						capacity: roundsData.spawn.maxSimultaneous + worldData.hordeRenderSlack,
						ghostCapacity: worldData.hordeRenderSlack,
						// Frozen while paused (level-up) so the frame is stable for screenshots and the horde does not keep animating.
						deltaSeconds: () =>
							run.state === "Paused" ? 0 : render.engine.getDeltaTime() / 1000,
						flashBrightness: renderData.vfx.flashBrightness,
						flashReduced: () => vision.flashReduced,
						hitSquash: renderData.vfx.hitSquash,
						cullCamera: game.camera,
						skipBoss: (id) => bossRigs[id - 1] !== undefined,
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
	log.info("preset", {
		id: preset?.id,
		reason: forced ? "query" : pinned ? "default" : meta.settings.preset === "auto" ? "auto" : "options",
		hardware,
	});
	if (!preset) throw new Error("data/presets.json has no preset");
	let applied = applyPreset(game, render.engine, preset);
	spawn.setCap(preset.enemyCap);
	// Dynamic resolution only for presets that ask for it; the others keep the fixed scale `applyPreset` set.
	const scaler = preset.dynamicScale
		? createDynamicScaler(render.engine, presetsData.dynamicScale, window.devicePixelRatio)
		: null;
	const vfx = createVfx(game, {
		// The pools are sized once, at creation: a preset change applies them on the next launch.
		// Allocated for the largest preset so a change in Options applies live (`vfx.setPools`).
		config: {
			...renderData.vfx,
			decalPool: Math.max(...presetsData.presets.map((p) => p.decalPool)),
			particlePool: Math.max(...presetsData.presets.map((p) => p.particlePool)),
		},
		onHitStop: (ms) => hitStop.request(ms),
		flashReduced: () => vision.flashReduced,
		// Elites get the long hit-stop of a boss kill too (GDD section 23).
		reducedMotion: () =>
			!meta.settings.screenShake || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		heroHealth: () => (Health.hp[hero] ?? 0) / Math.max(1, Health.max[hero] ?? 1),
		isBoss: (entity) => (Boss.id[entity] ?? 0) > 0 || (Elite.modifier[entity] ?? 0) > 0,
	});
	// Saved visual options, applied at boot (the Options screen changes them live).
	vision.setBrightness(meta.settings.brightness / 100);
	vision.setContrast(meta.settings.contrast / 100);
	vision.setColorblindMode(meta.settings.colorblind);
	vision.setFlashReduction(meta.settings.flashReduction);
	vfx.setGore(meta.settings.gore);
	// The small landscape targets (896x414, 800x360) draw the damage numbers smaller.
	const fitNumbers = (): void =>
		vfx.setNumberScale(window.innerWidth <= SMALL_SCREEN_WIDTH ? SMALL_NUMBER_SCALE : 1);
	fitNumbers();
	window.addEventListener("resize", fitNumbers);
	vfx.setPools(preset.particlePool, preset.decalPool);
	const projectileView = createProjectileRenderer(
		game,
		projectiles.capacity,
		renderData.vfx.projectileSize,
	);
	let frozenAt: number | null = null;
	const eliteView = createEliteView(game);
	const eggView = createEggRenderer(game);
	const eliteAuras = createEliteAuras(
		game,
		elitesData.modifiers.map((modifier) => modifier.aura),
		ELITE_AURA_RADIUS * elitesData.scale,
	);
	const enemyShotView = createEnemyShotRenderer(game, ENEMY_SHOT_POOL_SIZE, renderData.vfx.enemyShotSize);
	const consumableView = createConsumableRenderer(game);
	const fragmentView = createFragmentRenderer(game, MAX_ENTITIES_FRAGMENTS);
	const port = createRenderPort(game, horde, {
		origin,
		followRate: CAMERA.followRate,
		vfx,
		elite: eliteView,
		characters,
		// Frozen while paused: the camera must stop easing too, or a frozen capture keeps drifting for a moment.
		deltaSeconds: () => (run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000)),
		onEvent: (type) => {
			if (type === EventType.PropBroken) chunkRenderer.invalidateProps();
		},
	});
	const skin = unlockedSkins(milestonesData, meta).at(-1);
	if (skin) {
		game.setHeroTint(skin.tint);
		const tokenKey = skin.tint.replace(/-([a-z0-9])/g, (_, c: string) =>
			c.toUpperCase(),
		) as keyof typeof PALETTE;
		heroRig?.setTint(PALETTE[tokenKey]);
	}
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
			floorTints: biomesData.map((biome, index) =>
				index === 0 || !biome.fogColor ? undefined : floorTint(biome.fogColor),
			),
		},
		propTypes,
	);

	// Telemetry (A-06-04): off by default; there is no service yet, so batches only reach the log.
	const telemetry = createTelemetry({
		enabled: () => meta.settings.telemetry,
		sink: consoleSink((line) => log.info("telemetry", line)),
		now: () => performance.now(),
	});
	telemetry.track("session_start", { version: __APP_VERSION__, target: __BUILD_TARGET__ });

	// Sound (P-06-04): silent until the first input, then bus volumes from the Options screen.
	const audio = createAudioEngine(createWebAudioDeps((message, id) => log.warn(message, id)));
	for (const bus of ["master", "music", "sfx"] as const) {
		audio.setVolume(bus, meta.settings.volume[bus]);
	}
	const unlockAudio = (): void => {
		void audio.unlock();
		for (const type of ["pointerdown", "keydown", "touchstart"])
			window.removeEventListener(type, unlockAudio);
	};
	for (const type of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(type, unlockAudio);
	// Subtitle of the boss voice line being heard (Options can turn them off); cleared after a few seconds.
	let captionText: string | null = null;
	let captionTimer = 0;
	const showCaption = (key: string): void => {
		if (!meta.settings.subtitles) return;
		captionText = t(key);
		window.clearTimeout(captionTimer);
		captionTimer = window.setTimeout(() => {
			captionText = null;
			publishNow();
		}, 4000);
		publishNow();
	};
	const eventAudio = createEventAudio(
		audio,
		{
			hero,
			enemyDeath: (entity) => `sfx_enemy_${enemyIds[EnemyType.id[entity] ?? 0] ?? "husk"}_death`,
			bossId: (entity) => bossesData[(Boss.id[entity] ?? 0) - 1]?.id ?? "",
		},
		showCaption,
	);
	// The render port drains the buffer, so the audio listens on the way through.
	const tappedEvents: EventBuffer = {
		push: (type, a, b, c, entity) => events.push(type, a, b, c, entity),
		consume: (visit) =>
			events.consume((type, a, b, c, entity) => {
				eventAudio(type, a, b, c, entity);
				visit(type, a, b, c, entity);
			}),
		get size() {
			return events.size;
		},
		get dropped() {
			return events.dropped;
		},
	};
	let biomeTrack: string | null = null;
	let musicKey = "";
	let lastAudioState = "";
	const updateAudioState = (): void => {
		const key = `${run.state}|${difficultyOpen || menuOpen}|${biomeTrack}`;
		if (key === musicKey) return;
		musicKey = key;
		audio.setMusic(musicFor({ state: run.state, menu: difficultyOpen || menuOpen, biomeTrack }));
		if (run.state === "BossIntro" && lastAudioState !== "BossIntro") {
			const id = boss.defFor(run.round).id;
			audio.play(`sfx_boss_${id}_entry`, { priority: "boss", maxVoices: 1 });
			audio.play(`voice_${id}_entry`, { priority: "boss", maxVoices: 1, pitchSpread: 0 });
			showCaption(`voice.${id}.entry`);
		}
		lastAudioState = run.state;
	};
	document.addEventListener("click", (event) => {
		if ((event.target as Element | null)?.closest("button"))
			audio.play("sfx_ui_confirm", { priority: "ui", maxVoices: 2 });
	});
	document.addEventListener("pointerover", (event) => {
		if ((event.target as Element | null)?.closest("button"))
			audio.play("sfx_ui_hover", { priority: "ui", maxVoices: 2 });
	});

	const atmosphere = createAtmosphere(
		game,
		biomeMap,
		biomesData.map((biome) => ({ fogColor: biome.fogColor, music: biome.music })),
		(track) => {
			log.info("biome music", track);
			biomeTrack = track;
		},
	);

	const _fighting = (): boolean => run.state === "Round" || run.state === "BossRound";
	let lastOffer: readonly CardView[] = NO_CARDS;
	let lastOfferSource: unknown = null;
	let lastChest: readonly CardView[] = NO_CARDS;
	let lastBossJson = "";
	let lastBoss: HudState["boss"] = null;
	let lastBossAuras = "";
	let lastChestSource: unknown = null;
	let lastHud = Number.NEGATIVE_INFINITY;
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
		telemetry.track("run_end", {
			round: run.round,
			difficulty: difficultyId,
			kills: runStats.kills,
			bosses: runStats.bossRounds.length,
			died: run.state === "Results",
		});
		telemetry.flush();
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

		const weaponName = t(`weapon.${weapon.weapon.id}`);
		const killer = runStats.killer;
		results = {
			round: run.round,
			kills: runStats.kills,
			damage: Math.round(runStats.damageDealt),
			cause:
				killer.kind === "enemy"
					? t(`enemy.${enemiesData[killer.type]?.id ?? ""}`)
					: killer.kind === "self"
						? t("results.causeSelf")
						: t("results.causeUnknown"),
			build: [
				t("results.weaponTier", { name: weaponName, tier: weapon.tier + 1 }),
				...[...owned].map(([id, count]) => {
					const name = t(`item.${id}`);
					return count > 1 ? t("results.stack", { name, count }) : name;
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
	let optionsOpen = false;
	// The title screen shows on a plain load; links with a seed, difficulty, tutorial or a debug flag go straight in.
	const menuOpen = !["seed", "difficulty", "tutorial", "debug", "bench", "tips", "preset"].some((key) =>
		params.has(key),
	);

	function menuView(): NonNullable<HudState["menu"]> {
		return {
			records: roundsData.difficulties.map((def) => ({
				id: def.id,
				name: t(`difficultyName.${def.id}`),
				round: meta.records[def.id as keyof typeof meta.records] ?? 0,
			})),
		};
	}

	const nextSpeedOf = (speed: number): GameSpeed => (speed === 3 ? 3 : speed === 2 ? 2 : 1);

	/** Arrow and talk prompt while the Merchant waits; the angle is rounded to 15 degrees so the HUD does not churn. */
	function merchantPrompt(): HudState["merchant"] {
		const m = session.merchant.view;
		if (run.state !== "MerchantWait" || !m) return null;
		const angle = Math.atan2(m.x - (Position.x[hero] ?? 0), m.z - (Position.z[hero] ?? 0));
		const step = Math.PI / 12;
		return {
			angle: Math.round(angle / step) * step,
			near: session.merchant.distance() <= session.merchant.config.talkRadius,
			secondsLeft: Math.ceil(run.ticksLeft * STEP),
		};
	}

	function optionsView(): NonNullable<HudState["options"]> {
		return {
			preset: meta.settings.preset,
			presets: presetsData.presets.map((p) => ({ id: p.id, name: p.name })),
			volume: meta.settings.volume,
			screenShake: meta.settings.screenShake,
			gameSpeed: meta.settings.gameSpeed,
			telemetry: meta.settings.telemetry,
			brightness: meta.settings.brightness,
			contrast: meta.settings.contrast,
			colorblind: meta.settings.colorblind,
			flashReduction: meta.settings.flashReduction,
			uiScale: meta.settings.uiScale,
			gore: meta.settings.gore,
			keys: meta.settings.keys,
			pad: meta.settings.pad,
			subtitles: meta.settings.subtitles,
			locale: meta.settings.locale,
			locales: [
				{ id: "pt-BR", name: "Português" },
				{ id: "en", name: "English" },
			],
		};
	}

	/** Applies the change in memory at once and saves it under the lock (a read-only save only keeps it for this session). */
	function changeSettings(mutate: (s: MetaState["settings"]) => unknown): Promise<void> {
		mutate(meta.settings);
		publishNow();
		if (loaded.readOnly) return Promise.resolve();
		return updateMeta(
			saveIO,
			(m) => {
				mutate(m.settings);
			},
			__APP_VERSION__,
		)
			.then(() => undefined)
			.catch((error: unknown) => log.warn("settings change refused", error));
	}

	function setSpeed(speed: number): void {
		const next = nextSpeedOf(speed);
		loop.setSpeed(next);
		void changeSettings((st) => (st.gameSpeed = next));
	}

	function setPresetOption(id: string): void {
		const next = presetFor(id);
		if (!next) return;
		void changeSettings((s) => (s.preset = id));
		applied = applyPreset(game, render.engine, next);
		spawn.setCap(next.enemyCap);
		vfx.setPools(next.particlePool, next.decalPool);
	}

	/** The catalog is picked at boot, so a language change reloads (`?lang=` is dropped so the saved one wins). */
	function setLocaleOption(id: string): void {
		const next = new URLSearchParams(location.search);
		next.delete("lang");
		if (loaded.readOnly) next.set("lang", id);
		void changeSettings((s) => (s.locale = id === "en" ? "en" : "pt-BR")).then(() => {
			location.search = next.toString();
		});
	}

	function difficultyView(): NonNullable<HudState["difficulty"]> {
		return {
			selected: difficultyId,
			options: roundsData.difficulties.map((def) => {
				const locked = !isUnlocked(def, meta.records);
				const needed = def.unlockedBy;
				return {
					id: def.id,
					name: t(`difficultyName.${def.id}`),
					summary: t("difficulty.summary", { hpDamage: def.hpDamageMult, souls: def.soulsMult }),
					locked,
					requirement: needed
						? t("difficulty.requirement", {
								round: needed.round,
								difficulty: t(`difficultyName.${needed.difficulty}`),
							})
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

	/** An `icon_<kind>_<id>` of the UI atlas as the CSS cut-out the UI draws; undefined while assets are missing. */
	const iconCache = new Map<string, IconRef | undefined>();
	function iconFor(kind: "item" | "card" | "node", id: string): IconRef | undefined {
		const key = `${kind}_${id}`;
		if (iconCache.has(key)) return iconCache.get(key);
		const entry = assets?.manifest.entries[`icon_${key}`];
		const atlas = assets?.manifest.entries.atlas_vfx_ui;
		const icon =
			entry?.rect && atlas?.width && atlas.height
				? {
						url: `/assets/${entry.url}`,
						x: entry.rect.x,
						y: entry.rect.y,
						w: entry.rect.w,
						h: entry.rect.h,
						atlasWidth: atlas.width,
						atlasHeight: atlas.height,
					}
				: undefined;
		iconCache.set(key, icon);
		return icon;
	}

	function ossuaryView(): NonNullable<HudState["ossuary"]> {
		return {
			souls: meta.souls,
			refund: refundValue(ossuaryData, meta),
			branches: ossuaryData.branches.map((branch) => ({
				id: branch.id,
				name: t(`branch.${branch.id}`),
				nodes: branch.nodes.map((node) => ({
					id: node.id,
					lines: [
						...node.modifiers.map((m) => text(describeModifier(m))),
						...node.effects.map((e) => text(describeEffect(e.id, e.params))),
					],
					icon: iconFor("node", node.id),
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
			lastOffer = offer
				? offer.map((c) => ({
						id: c.id,
						name: t(`card.${c.id}`),
						double: c.double,
						icon: iconFor("card", c.id),
					}))
				: NO_CARDS;
		}
		const chestOffer = chest.offer;
		if (chestOffer !== lastChestSource) {
			lastChestSource = chestOffer;
			lastChest = chestOffer
				? chestOffer.map((c) => ({
						id: c.id,
						name: [t(`item.${c.id}`), ...c.modifiers.map((m) => text(describeModifier(m)))].join(
							": ",
						),
						double: false,
						icon: iconFor("item", c.id),
					}))
				: NO_CARDS;
		}
		// Web demo: the Gravedigger is the last fight. Settle the run once, hide the shop and never open round 11.
		const demoEnd = __IS_DEMO__ && run.state === "Shop" && run.round >= (bossesData[0]?.round ?? 10);
		if (demoEnd && !settled) settleRun();
		let shopView: HudState["shop"] = null;
		if (run.state === "Shop" && !demoEnd) {
			const view = shop.view();
			const json = JSON.stringify(view);
			if (json !== lastShopJson) {
				lastShopJson = json;
				lastShop = {
					...view,
					slots: view.slots.map((slot) => ({
						...slot,
						name:
							slot.kind === "item"
								? t(`item.${slot.id}`)
								: slot.kind === "upgrade"
									? t("shop.upgradeName", { name: t(`weapon.${slot.id}`) })
									: t(`weapon.${slot.id}`),
						lines: slot.lines.map(text),
						icon: slot.kind === "item" ? iconFor("item", slot.id) : undefined,
					})),
				};
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
				lastBoss = { ...view, name: t(`boss.${boss.defFor(run.round).id}`) };
			}
		}
		const bossView = lastBoss;
		// The elite modifiers of a late boss (A-03-03) tint its rig and lengthen its charge line.
		const carried = (view?.modifiers ?? []).flatMap((name) => {
			const found = elitesData.modifiers.find((modifier) => modifier.name === name);
			return found ? [found] : [];
		});
		const auraKey = carried.map((modifier) => modifier.aura).join(",");
		if (auraKey !== lastBossAuras) {
			lastBossAuras = auraKey;
			characters?.setBossAuras(carried.map((modifier) => modifier.aura));
			vfx.setBossSpeedMult(carried.reduce((mult, modifier) => mult * (modifier.speedMult ?? 1), 1));
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
			cardRerolls: levelUp.rerollsLeft,
			chest: lastChest,
			shop: shopView,
			stats: shopView
				? describeStats(stats.stats).map((line) => ({
						label: t(line.key),
						value: `${i18n.formatNumber(line.percent ? line.value * 100 : line.value)}${line.percent ? "%" : ""}`,
					}))
				: NO_STATS,
			results,
			notice: loaded.notice,
			boss: bossView,
			ossuary: ossuaryOpen ? ossuaryView() : null,
			difficulty: difficultyOpen ? difficultyView() : null,
			options: optionsOpen ? optionsView() : null,
			speed: loop.speed,
			uiScale: meta.settings.uiScale,
			rerollKey: meta.settings.keys.reroll,
			inputDevice: lastDevice,
			padReroll: meta.settings.pad.reroll,
			colorblind: meta.settings.colorblind !== "off",
			caption: captionText,
			merchant: merchantPrompt(),
			menu: menuOpen ? menuView() : null,
			demoEnd,
			bossIntro: run.state === "BossIntro" ? t(`boss.${boss.defFor(run.round).id}`) : null,
			dash: dash.unlocked
				? {
						charges: dash.charges,
						max: dash.maxCharges,
						recharge: Math.floor(dash.recharge * 20) / 20,
					}
				: null,
			vignette: Math.round(vfx.vignette * 20) / 20,
			tip: menuOpen
				? null
				: tutorialOn && !tutorial.done
					? tutorial.update({
							round: run.round,
							state: run.state,
							heroX: Position.x[hero] ?? 0,
							heroZ: Position.z[hero] ?? 0,
							kills: runStats.kills,
							gold: progress.gold,
							nowMs: performance.now(),
							enabled: true,
						})
					: tips.update({
							round: run.round,
							state: run.state,
							heroX: Position.x[hero] ?? 0,
							heroZ: Position.z[hero] ?? 0,
							piles: query(world, [Fragment]).length,
							gold: progress.gold,
							nowMs: performance.now(),
							// After the tutorial the round 1 tips follow, whatever the run count.
							enabled: tutorial.done || tipsEnabled(),
						}),
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
			cur.cardRerolls !== next.cardRerolls ||
			cur.chest !== next.chest ||
			cur.boss !== next.boss ||
			cur.dash?.charges !== next.dash?.charges ||
			cur.dash?.recharge !== next.dash?.recharge ||
			cur.ossuary !== null ||
			cur.difficulty !== null ||
			next.difficulty !== null ||
			cur.speed !== next.speed ||
			cur.uiScale !== next.uiScale ||
			cur.caption !== next.caption ||
			cur.merchant?.angle !== next.merchant?.angle ||
			cur.merchant?.near !== next.merchant?.near ||
			cur.merchant?.secondsLeft !== next.merchant?.secondsLeft ||
			(cur.merchant === null) !== (next.merchant === null) ||
			cur.rerollKey !== next.rerollKey ||
			cur.inputDevice !== next.inputDevice ||
			cur.padReroll !== next.padReroll ||
			cur.colorblind !== next.colorblind ||
			cur.menu !== null ||
			next.menu !== null ||
			cur.demoEnd !== next.demoEnd ||
			cur.options !== null ||
			next.options !== null ||
			next.ossuary !== null ||
			cur.bossIntro !== next.bossIntro ||
			cur.tip !== next.tip ||
			cur.vignette !== next.vignette ||
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
			// Behind the title screen the world stands still.
			if (menuOpen) return;
			if (bench) {
				// Fixed horde around a stationary hero: no run flow, no level-ups, no shop (SDD 14 section 4).
				behavior.run(world, hero);
				separation.run(world);
				movementSystem(world);
				cullDistantEnemies(
					world,
					Position.x[hero] ?? 0,
					Position.z[hero] ?? 0,
					worldData.cullDistance,
				);
				applyOriginShift(world, origin, hero, events, worldData, boss.shiftOrigin);
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
			session.step(input);
			// No results screen yet (P-05-08): a finished run starts over.
			if (run.state === "Results" && !settled) settleRun();
		},
		render: (alpha) => {
			port.sync(world, alpha);
			audio.beginFrame();
			port.consumeEvents(tappedEvents);
			atmosphere.update(origin.x + (Position.x[hero] ?? 0), origin.z + (Position.z[hero] ?? 0));
			updateAudioState();
			chunkRenderer.update(
				origin.x,
				origin.z,
				origin.x + (Position.x[hero] ?? 0),
				origin.z + (Position.z[hero] ?? 0),
			);
			// VFX stop with the world while paused (level-up) so a captured frame is stable.
			scaler?.frame(render.engine.getDeltaTime());
			const vfxDelta = run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000);
			vfx.syncStatus(world, vfxDelta);
			vfx.update(vfxDelta);
			projectileView.sync(world, alpha);
			enemyShotView.sync(world, alpha);
			characters?.sync(
				world,
				alpha,
				run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000),
				run.state === "Shop",
			);
			eliteView.update(
				run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000),
				game.hero.position.x,
				game.hero.position.z,
			);
			eggView.sync(world, (frozenAt ?? performance.now()) / 1000);
			eliteAuras.sync(world, alpha, (frozenAt ?? performance.now()) / 1000);
			consumableView.sync(world, alpha, (frozenAt ?? performance.now()) / 1000);
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
				run.state === "Paused" ? 0 : Math.min(0.1, render.engine.getDeltaTime() / 1000),
			);
			game.scene.render();
		},
		publish: (now) => {
			if (now - lastHud < 1000 / HUD_HZ) return;
			lastHud = now;
			publishNow();
		},
	});

	let faceDummy = -1;
	if (__DEBUG_API__ && new URLSearchParams(location.search).has("debug")) {
		window.gc.debug = {
			hero: () => ({ x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 }),
			/** Yaw the hero rig is drawn with (radians, 0 looks along +z), or null without the skeleton rig. */
			heroYaw: () => characters?.heroYaw ?? null,
			state: () => ({ run: run.state, round: run.round, level: progress.level }),
			grantXp: (amount: number) => addFragmentValue(progress, fragments, xp, amount),
			grantGold: (amount: number) => {
				progress.gold += amount;
			},
			endRound: () => run.forceEnd(world),
			/** Ends the walk to the Merchant (A-05-01): the shop opens at once. No-op outside `MerchantWait`. */
			openShop: () => run.enterShop(),
			/** VFX budget check (P-04-05): off = no particles, no decals, no damage numbers. */
			setVfx: (on: boolean) => {
				vfx.setPools(on ? preset.particlePool : 0, on ? preset.decalPool : 0);
				vfx.setNumberScale(on ? 1 : 0);
			},
			/** Variant budget check: 0 draws no cosmetic variants, 30 is the default share. */
			setVariants: (percent: number) => horde?.setVariantPercent(percent),
			/** The Merchant the session keeps in the world (fixed spot capture). */
			merchant: () => session.merchant.view,
			/** Game speed 1, 2 or 3 (perf margin check). */
			setSpeed: (speed: number) => loop.setSpeed(speed),
			/**
			 * Effect captures. "bleed": three bleeding enemies; "thorns": a ThornsHit on each of three enemies every 200 ms;
			 * "boss:<index>": a motionless boss of that bosses.json index that is executed after 0.6 s.
			 */
			fx: (kind: string) => {
				const spawnNear = (dx: number, dz: number): number => {
					const e = spawn.spawnEnemy(
						world,
						0,
						(Position.x[hero] ?? 0) + dx,
						(Position.z[hero] ?? 0) + dz,
					);
					Health.hp[e] = Health.max[e] = 1e6;
					Speed.value[e] = 0;
					KnockbackResist.value[e] = 1;
					return e;
				};
				if (kind === "bleed" || kind === "thorns") {
					const list = [spawnNear(2, 0), spawnNear(-2, 1), spawnNear(0, -2)];
					if (kind === "bleed") {
						for (const e of list) {
							addComponent(world, e, Bleed);
							Bleed.perStep[e] = 0;
							Bleed.ticks[e] = 3000;
						}
					} else {
						const timer = setInterval(() => {
							for (const e of list) {
								events.push(
									EventType.ThornsHit,
									Position.x[e] ?? 0,
									Position.z[e] ?? 0,
									Math.hypot(
										(Position.x[e] ?? 0) - (Position.x[hero] ?? 0),
										(Position.z[e] ?? 0) - (Position.z[hero] ?? 0),
									),
									e,
								);
							}
						}, 200);
						setTimeout(() => clearInterval(timer), 3000);
					}
				} else if (kind.startsWith("boss:")) {
					const e = spawnNear(4, 0);
					Boss.id[e] = Number(kind.slice(5)) + 1;
					setTimeout(() => {
						Health.hp[e] = 0;
						events.push(EventType.BossDied, Position.x[e] ?? 0, Position.z[e] ?? 0, 0, e);
					}, 600);
				}
			},

			/** Accessibility look (brightness, contrast, colour-blind mode, flash reduction) for captures. */
			vision,
			/** One enemy of the given type index at (x, z) relative to the hero (A-02-02b capture). */
			spawnEnemy: (typeIndex: number, x: number, z: number) =>
				spawn.spawnEnemy(world, typeIndex, (Position.x[hero] ?? 0) + x, (Position.z[hero] ?? 0) + z),
			/** Weapon scale capture: swaps the weapon in the hero's hand for `weapon_<id>` and closes the camera in. */
			showWeapon: async (id: string) => {
				const entry = assets?.manifest.entries[`weapon_${id}`];
				if (!heroRig || !assets || !entry) return false;
				const mesh = await importModelMesh(game.scene, `/assets/${entry.url}`).catch(() => null);
				if (!mesh) return false;
				if (assets.characterMaterial) mesh.material = assets.characterMaterial;
				heroRig.attachWeapon(mesh);
				game.camera.radius = 5;
				return true;
			},
			/**
			 * Hero-facing capture: one motionless, tough enemy 1.2 u to the right (inside the sword range) of the hero and a closer camera. Walk left
			 * (key A) and the rig must keep looking at it.
			 */
			faceTest: () => {
				// Alone with the dummy: no more spawns and the round's enemies die, so it is the only possible target.
				spawn.setCap(0);
				for (const other of queryEnemies(world)) Health.hp[other] = 0;
				const e = spawn.spawnEnemy(world, 0, (Position.x[hero] ?? 0) + 1.2, Position.z[hero] ?? 0);
				Health.hp[e] = Health.max[e] = 1e6;
				Speed.value[e] = 0;
				KnockbackResist.value[e] = 1;
				game.camera.radius = 9;
				faceDummy = e;
			},
			/** State of the `faceTest` dummy: where it is, whether it lives and whether it is the current target. */
			faceDummy: () =>
				faceDummy < 0
					? null
					: {
							x: Position.x[faceDummy] ?? 0,
							z: Position.z[faceDummy] ?? 0,
							hp: Health.hp[faceDummy] ?? 0,
							targeted: targeting.target === faceDummy,
						},
			/** Applies a video preset live (shadows, scale, enemy cap, particle and decal pools). */
			setPreset: (id: string) => {
				const next = presetsData.presets.find((p) => p.id === id);
				if (!next) return null;
				applied = applyPreset(game, render.engine, next);
				spawn.setCap(next.enemyCap);
				vfx.setPools(next.particlePool, next.decalPool);
				return applied.id;
			},
			preset: () => ({
				id: applied.id,
				shadowsEnabled: game.scene.shadowsEnabled,
				enemyCap: spawn.cap,
				hardwareScalingLevel: render.engine.getHardwareScalingLevel(),
			}),
			/** One enemy of every type in a row 5 u in front of the hero: the horde, VAT included, in a single frame. */
			spawnLineup: () => {
				const count = enemyIds.length;
				const spacing = 2.2;
				const perRow = 4;
				const heroX = Position.x[hero] ?? 0;
				const heroZ = Position.z[hero] ?? 0;
				// A slot is usable when no prop is on it or just south of it (the camera looks north: a tall prop hides what
				// stands behind it).
				const slotFree = (x: number, z: number): boolean =>
					!session.propCollision.overlaps(origin, x, z, 1.8) &&
					!session.propCollision.overlaps(origin, x, z - 2.5, 1.8);
				const placed: number[] = [];
				for (let first = 0; first < count; first += perRow) {
					const size = Math.min(perRow, count - first);
					let best: { x: number; z: number } | null = null;
					for (let z = 4; z <= 12 && !best; z += 1) {
						for (let x = -9; x <= 9 && !best; x += 1) {
							let ok = true;
							for (let i = 0; i < size && ok; i++) {
								const slotX = x + i * spacing;
								ok = slotFree(heroX + slotX, heroZ + z);
								// Not on top of a slot already placed.
								for (let k = 0; k < placed.length && ok; k += 2) {
									ok =
										Math.abs((placed[k] ?? 0) - slotX) >= spacing ||
										Math.abs((placed[k + 1] ?? 0) - z) >= 1.5;
								}
							}
							if (ok) best = { x, z };
						}
					}
					// Crowded everywhere: fall back to a plain row 5 u ahead.
					const origin0 = best ?? { x: -((size - 1) * spacing) / 2, z: 5 + first };
					for (let i = 0; i < size; i++) {
						spawn.spawnEnemy(
							world,
							first + i,
							heroX + origin0.x + i * spacing,
							heroZ + origin0.z,
						);
						placed.push(origin0.x + i * spacing, origin0.z);
					}
				}
				return placed;
			},
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
			/** Biome under the hero and whether its chunk is loaded (biome captures, A-02-01). */
			biome: () => ({
				id: biomesData[atmosphere.biome]?.id ?? "",
				loaded: chunks.slots.some((c) => c?.biome === atmosphere.biome),
			}),
			minPropAlpha: () => chunkRenderer.minAlpha(),
			setGore: (full: boolean) => vfx.setGore(full),
			/** Fires `count` enemy deaths on a ring around the hero (gore comparison capture, P-04-05). */
			holdIdle: () => characters?.holdIdle(),
			killRing: (count: number) => {
				const x = Position.x[hero] ?? 0;
				const z = Position.z[hero] ?? 0;
				for (let i = 0; i < count; i++) {
					const angle = (i / count) * Math.PI * 2;
					Position.x[hero] = x + Math.cos(angle) * 5;
					Position.z[hero] = z + Math.sin(angle) * 5;
					vfx.onEvent(EventType.Died, 0, 0, 0, hero);
				}
				Position.x[hero] = x;
				Position.z[hero] = z;
			},
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
			/**
			 * Steps the simulation, synchronously and one fixed step per frame, from round 9's shop to the first frame of the
			 * boss round (boss on the field), then freezes. The same step count on every run: a capture of the boss
			 * no longer depends on how fast the machine renders.
			 */
			toBossFrame: () => {
				run.setRound(9);
				run.forceEnd(world);
				if (run.state === "Shop") run.closeShop();
				// A previous freeze() leaves the loop paused: frame() would not advance it.
				loop.resume();
				let now = performance.now();
				for (let i = 0; i < 1200 && !(run.state === "BossRound" && boss.view() !== null); i++) {
					// The capture does not walk to the Merchant.
					if (run.state === "MerchantWait") run.enterShop();
					if (run.state === "Shop") run.closeShop();
					now += STEP * 1000;
					loop.frame(now);
				}
				if (run.state !== "BossRound" || boss.view() === null) {
					throw new Error(`toBossFrame did not reach the boss round (state ${run.state})`);
				}
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

	loop.setSpeed(meta.settings.gameSpeed);
	// Enter talks to the Merchant when he is close (the on-screen prompt does the same for touch).
	window.addEventListener("keydown", (event) => {
		if ((event.code !== "Enter" && event.code !== "NumpadEnter") || event.repeat) return;
		if (run.state !== "MerchantWait" || document.querySelector('[role="dialog"]')) return;
		if (session.merchant.talk()) publishNow();
	});

	// The speed key (TAB by default, remappable) cycles the speed during play; inside a dialog TAB moves the focus.
	window.addEventListener("keydown", (event) => {
		if (
			event.code !== meta.settings.keys.speed ||
			event.repeat ||
			document.querySelector('[role="dialog"]')
		)
			return;
		event.preventDefault();
		setSpeed(nextSpeed(loop.speed));
	});

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
	for (const type of ["keydown", "pointerdown"])
		window.addEventListener(type, () => (lastDevice = "keyboard"), true);
	let wasDashing = false;
	let wasSpeedButton = false;
	render.engine.runRenderLoop(() => {
		// Once per frame: getGamepads() allocates, and several steps may run per frame.
		sources.poll(input);
		if (touchDash) input.dash = true;
		// While the Merchant waits the dash action (A on the pad, by default) talks to him: there is nothing to dash from.
		if (input.dash && !wasDashing && run.state === "MerchantWait" && session.merchant.talk())
			publishNow();
		wasDashing = input.dash;
		// The gamepad speed button (Back by default) cycles the speed like the key does, outside dialogs.
		const speedButton = sources.padButton(meta.settings.pad.speed);
		if (speedButton && !wasSpeedButton && !document.querySelector('[role="dialog"]')) {
			setSpeed(nextSpeed(loop.speed));
		}
		wasSpeedButton = speedButton;
		// The hints name the keyboard key or the pad button, whichever was used last.
		if (sources.padActive()) lastDevice = "pad";
		loop.frame(performance.now());
	});
	window.addEventListener("resize", () => render.engine.resize());
	game.scene.executeWhenReady(() => {
		window.gc.ready = true;
		log.info("ready", { version: __APP_VERSION__, target: __BUILD_TARGET__, demo: __IS_DEMO__, seed });
	});
}

boot().catch((error: unknown) => log.error("boot failed", error));
