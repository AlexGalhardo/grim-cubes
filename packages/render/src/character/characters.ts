import {
	Boss,
	EventType,
	Facing,
	findHero,
	type GameWorld,
	Position,
	PrevPosition,
	queryEnemies,
	Velocity,
} from "@gc/game";
import { mixAuras } from "../scene/aura";
import { PALETTE } from "../scene/palette";
import type { GameScene } from "../scene/scene";
import type { Character } from "./character";

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
}

export interface Characters {
	/** Poses and animates the rigs from the ECS; `dt` in seconds (0 while paused). */
	sync(world: GameWorld, alpha: number, dt: number, shopOpen: boolean): void;
	onEvent(type: number, a: number, b: number, c: number, entity: number): void;
	readonly executing: boolean;
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

/** Drives the hero, the Merchant and the Gravedigger rigs from game state and events. */
export function createCharacters(game: GameScene, options: CharactersOptions): Characters {
	const { hero, merchant, bosses } = options;
	const baseRadius = game.camera.radius;
	let executionLeft = 0;
	let merchantState: "away" | "in" | "leaving" = "away";
	let merchantLeft = 0;
	let heroEntity = -1;
	let bossEntity = -1;
	/** The rig of the boss on screen; kept through its death so the execution plays on it. */
	let activeBoss: Character | undefined;
	let returnLeft = 0;
	let phaseTinted: Character | undefined;
	let auraKey = "";
	let auraTinted: Character | undefined;

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
		get executing(): boolean {
			return executionLeft > 0;
		},
		sync(world, alpha, dt, shopOpen): void {
			heroEntity = findHero(world);
			if (heroEntity >= 0) pose(hero, heroEntity, alpha);
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
			} else if (type === EventType.BossDied && activeBoss) {
				activeBoss.playFinal("death_execution");
				executionLeft = options.executionSeconds;
			}
		},
	};
}
