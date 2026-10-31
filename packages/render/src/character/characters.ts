import {
	Boss,
	bossesData,
	EventType,
	Facing,
	findHero,
	type GameWorld,
	Health,
	Position,
	PrevPosition,
	queryEnemies,
	Velocity,
} from "@gc/game";
import { mixAuras } from "../scene/aura";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import type { Character } from "./character";
import { desiredYaw, type FacingInput, isBackpedaling, turnTowards } from "./facing";

export interface CharactersOptions {
	hero: Character;
	/** Shown beside the hero while the shop is open. */
	merchant?: Character | undefined;
	/** Boss rigs by `Boss.id - 1` (the 1-based position in bosses.json); they replace the horde instance of their boss. */
	bosses: readonly (Character | undefined)[];
	/** Fraction the camera radius shrinks by during the boss execution (GDD 12.2: 20%). */
	executionZoom: number;
	/** Seconds the boss execution lasts (GDD 12.2: 1.5). */
	executionSeconds: number;
	/** Entity the hero is attacking (the session's targeting system), or -1; the rig turns to face it. */
	heroTarget?: (() => number) | undefined;
}

export interface Characters {
	/** Poses and animates the rigs from the ECS; `dt` in seconds (0 while paused). */
	sync(world: GameWorld, alpha: number, dt: number, shopOpen: boolean): void;
	onEvent(type: number, a: number, b: number, c: number, entity: number): void;
	readonly executing: boolean;
	/** The yaw the hero rig is drawn with, in radians (0 looks along +z). */
	readonly heroYaw: number;
	/**
	 * Elite modifiers the current boss carries (A-03-03), by `aura` token: the boss rig takes their mixed colour. Call
	 * every frame with the same array while nothing changes; it only re-tints when the auras change.
	 */
	setBossAuras(auras: readonly string[]): void;
	/** The hero was revived: leave the death pose. */
	revive(): void;
	/** Holds every rig on its idle pose (captures). */
	holdIdle(): void;
}

/** Where the Merchant stands relative to the hero while the shop is open. */
const MERCHANT_OFFSET_X = 4;
const MERCHANT_OFFSET_Z = 0;
const MERCHANT_SUBMERGE_SECONDS = 0.8;
/** Seconds the camera takes to return to its radius after the boss execution. */
const RETURN_SECONDS = 0.6;
/** Time constant of the hero's turn towards its target or movement (about 0.08 s to cover most of the angle). */
const HERO_TURN_SECONDS = 0.08;
/** A stealthed boss shimmers for this long every `STEALTH_PERIOD` seconds so its 0.15 opacity stays readable. */
const STEALTH_PERIOD = 0.5;
const STEALTH_SHIMMER = 0.12;
const STEALTH_SHIMMER_ALPHA = 0.45;
/** Ids in bosses.json of the rigs that get a special motion. */
const NEST_QUEEN = "nest_queen";
/** The airborne Nest Queen hovers this high (u), easing in at `FLY_RISE` u/s, bobbing a little. */
const FLY_HEIGHT = 2.2;
const FLY_RISE = 3;
const FLY_BOB = 0.15;
const FLY_BOB_HZ = 0.8;
/** A leap peaks at this height (u) halfway through its airtime. */
const LEAP_HEIGHT = 3;

/** Drives the hero, the Merchant and the Gravedigger rigs from game state and events. */
export function createCharacters(game: GameScene, options: CharactersOptions): Characters {
	const { hero, merchant, bosses } = options;
	const baseRadius = game.camera.radius;
	let executionLeft = 0;
	let merchantState: "away" | "in" | "leaving" = "away";
	let merchantLeft = 0;
	let heroEntity = -1;
	let heroYaw = 0;
	// Scratch objects reused every frame: nothing is allocated in `sync`.
	const facing: FacingInput = { x: 0, z: 0, target: undefined, vx: 0, vz: 0 };
	const aim = { x: 0, z: 0 };
	let heroYawReady = false;
	let bossEntity = -1;
	/** The rig of the boss on screen; kept through its death so the execution plays on it. */
	let activeBoss: Character | undefined;
	let returnLeft = 0;
	let phaseTinted: Character | undefined;
	let auraKey = "";
	let auraTinted: Character | undefined;
	/** Nest Queen phase 2: flying. */
	let flying = false;
	let flyLift = 0;
	let flyClock = 0;
	let stealthAlpha = 1;
	let stealthClock = 0;
	let stealthDrawn = -1;
	let leapTotal = 0;
	let leapLeft = 0;

	hero.setVisible(true);
	merchant?.setVisible(false);
	for (const rig of bosses) rig?.setVisible(false);

	function pose(rig: Character, e: number, alpha: number): void {
		const px = PrevPosition.x[e] ?? 0;
		const pz = PrevPosition.z[e] ?? 0;
		rig.setPose(
			px + ((Position.x[e] ?? 0) - px) * alpha,
			pz + ((Position.z[e] ?? 0) - pz) * alpha,
			Facing.yaw[e] ?? 0,
		);
		rig.setSpeed(Math.hypot(Velocity.x[e] ?? 0, Velocity.z[e] ?? 0));
	}

	return {
		holdIdle(): void {
			hero.holdPose("idle", 0.25);
			for (const rig of bosses) rig?.holdPose("idle", 0.25);
			merchant?.holdPose("idle", 0.25);
		},
		setBossAuras(auras): void {
			const key = auras.join(",");
			if (key === auraKey) return;
			auraKey = key;
			auraTinted = undefined;
		},
		revive(): void {
			hero.clearFinal();
		},
		get heroYaw(): number {
			return heroYaw;
		},
		get executing(): boolean {
			return executionLeft > 0;
		},
		sync(world, alpha, dt, shopOpen): void {
			heroEntity = findHero(world);
			if (heroEntity >= 0) {
				pose(hero, heroEntity, alpha);
				const target = options.heroTarget?.() ?? -1;
				const aimed = target >= 0 && (Health.hp[target] ?? 0) > 0;
				facing.x = Position.x[heroEntity] ?? 0;
				facing.z = Position.z[heroEntity] ?? 0;
				facing.vx = Velocity.x[heroEntity] ?? 0;
				facing.vz = Velocity.z[heroEntity] ?? 0;
				aim.x = Position.x[target] ?? 0;
				aim.z = Position.z[target] ?? 0;
				facing.target = aimed ? aim : undefined;
				const want = desiredYaw(facing);
				if (!heroYawReady) {
					heroYaw = want ?? Facing.yaw[heroEntity] ?? 0;
					heroYawReady = true;
				} else if (want !== null) heroYaw = turnTowards(heroYaw, want, dt, HERO_TURN_SECONDS);
				const px = PrevPosition.x[heroEntity] ?? 0;
				const pz = PrevPosition.z[heroEntity] ?? 0;
				hero.setSpeed(
					Math.hypot(Velocity.x[heroEntity] ?? 0, Velocity.z[heroEntity] ?? 0),
					isBackpedaling(heroYaw, Velocity.x[heroEntity] ?? 0, Velocity.z[heroEntity] ?? 0),
				);
				hero.setPose(
					px + ((Position.x[heroEntity] ?? 0) - px) * alpha,
					pz + ((Position.z[heroEntity] ?? 0) - pz) * alpha,
					heroYaw,
				);
			}
			hero.update(dt);

			const enemies = queryEnemies(world);
			bossEntity = -1;
			for (let i = 0; i < enemies.length; i++) {
				const e = enemies[i] ?? 0;
				if ((Boss.id[e] ?? 0) > 0) {
					bossEntity = e;
					break;
				}
			}
			if (bossEntity >= 0) {
				const rig = bosses[(Boss.id[bossEntity] ?? 1) - 1];
				if (rig !== activeBoss) {
					activeBoss?.setVisible(false);
					activeBoss = rig;
				}
				activeBoss?.setVisible(true);
				if (activeBoss) pose(activeBoss, bossEntity, alpha);
				if (activeBoss) {
					flyClock += dt;
					const queen = bossesData[(Boss.id[bossEntity] ?? 1) - 1]?.id === NEST_QUEEN;
					flying = queen && (Boss.phase[bossEntity] ?? 0) >= 1;
					const target = flying
						? FLY_HEIGHT + Math.sin(flyClock * FLY_BOB_HZ * Math.PI * 2) * FLY_BOB
						: 0;
					flyLift +=
						Math.sign(target - flyLift) * Math.min(Math.abs(target - flyLift), FLY_RISE * dt);
					let lift = flyLift;
					if (leapLeft > 0) {
						leapLeft = Math.max(0, leapLeft - dt);
						const t = 1 - leapLeft / leapTotal;
						lift += LEAP_HEIGHT * 4 * t * (1 - t);
					}
					activeBoss.setLift(lift);
					if (stealthAlpha < 1) {
						stealthClock += dt;
						const shimmer = stealthClock % STEALTH_PERIOD < STEALTH_SHIMMER;
						const drawn = shimmer ? STEALTH_SHIMMER_ALPHA : stealthAlpha;
						if (drawn !== stealthDrawn) {
							stealthDrawn = drawn;
							activeBoss.setAlpha(drawn);
						}
					}
				}
			} else if (executionLeft <= 0 && activeBoss) {
				activeBoss.setVisible(false);
				activeBoss = undefined;
			}
			if (activeBoss && auraKey !== "" && auraTinted !== activeBoss) {
				auraTinted = activeBoss;
				activeBoss.setTint(mixAuras(auraKey.split(",")));
			}
			for (const rig of bosses) rig?.update(dt);

			if (executionLeft > 0) {
				executionLeft = Math.max(0, executionLeft - dt);
				const progress = 1 - executionLeft / options.executionSeconds;
				// Closes in fast on the kill and holds.
				game.camera.radius = baseRadius * (1 - options.executionZoom * Math.min(1, progress * 3));
				if (executionLeft === 0) {
					activeBoss?.setVisible(false);
					activeBoss = undefined;
					returnLeft = RETURN_SECONDS;
				}
			} else if (returnLeft > 0) {
				// Eases back out (smoothstep) instead of snapping to the base radius.
				returnLeft = Math.max(0, returnLeft - dt);
				const k = returnLeft / RETURN_SECONDS;
				game.camera.radius = baseRadius * (1 - options.executionZoom * k * k * (3 - 2 * k));
			}

			if (merchant) {
				if (shopOpen && merchantState !== "in") {
					merchantState = "in";
					merchant.setVisible(true);
					merchant.playOnce("emerge");
				} else if (!shopOpen && merchantState === "in") {
					merchantState = "leaving";
					merchantLeft = MERCHANT_SUBMERGE_SECONDS;
					merchant.playOnce("submerge");
				}
				if (merchantState === "leaving") {
					merchantLeft -= dt;
					if (merchantLeft <= 0) {
						merchantState = "away";
						merchant.setVisible(false);
					}
				}
				if (merchantState !== "away" && heroEntity >= 0) {
					merchant.setPose(
						(Position.x[heroEntity] ?? 0) + MERCHANT_OFFSET_X,
						(Position.z[heroEntity] ?? 0) + MERCHANT_OFFSET_Z,
						-Math.PI / 2,
					);
				}
				merchant.update(dt);
			}
		},
		onEvent(type, a, _b, c, _entity): void {
			if (type === EventType.Swung) hero.playOnce("attack_melee");
			else if (type === EventType.Fired) hero.playOnce("attack_ranged");
			else if (type === EventType.PlayerHit && c !== 1) hero.playOnce("hit");
			else if (type === EventType.DashStarted) hero.playOnce("dash");
			else if (type === EventType.Died && _entity === heroEntity) hero.playFinal("death");
			else if (type === EventType.Revived) hero.clearFinal();
			else if (type === EventType.BossEnraged) activeBoss?.playOnce("enrage");
			else if (type === EventType.BossPhase && a >= 2 && activeBoss && phaseTinted !== activeBoss) {
				// Phase 2 of the Forgemaster: the armour shows as a metallic tint.
				phaseTinted = activeBoss;
				activeBoss.setTint(PALETTE.ironLight);
			} else if (type === EventType.BossStealth && activeBoss) {
				// a = 1 vanished (b = the opacity to draw with), 0 revealed.
				stealthAlpha = a === 1 ? _b : 1;
				stealthClock = 0;
				stealthDrawn = -1;
				activeBoss.setAlpha(stealthAlpha);
			} else if (type === EventType.BossLeap && activeBoss) {
				leapTotal = Math.max(c, 0.1);
				leapLeft = leapTotal;
			} else if (type === EventType.BossDied && activeBoss) {
				stealthAlpha = 1;
				activeBoss.setAlpha(1);
				activeBoss.setLift(0);
				flying = false;
				flyLift = 0;
				activeBoss.playFinal("death_execution");
				executionLeft = options.executionSeconds;
			}
		},
	};
}
