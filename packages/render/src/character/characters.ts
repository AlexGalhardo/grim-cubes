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
import type { GameScene } from "../scene/scene";
import type { Character } from "./character";

export interface CharactersOptions {
	hero: Character;
	/** Shown beside the hero while the shop is open. */
	merchant?: Character | undefined;
	/** The Gravedigger: replaces the horde instance of every `Boss.id > 0` entity. */
	boss?: Character | undefined;
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
	/** Holds every rig on its idle pose (captures). */
	holdIdle(): void;
}

/** Where the Merchant stands relative to the hero while the shop is open. */
const MERCHANT_OFFSET_X = 3;
const MERCHANT_OFFSET_Z = 1.5;
const MERCHANT_SUBMERGE_SECONDS = 0.8;

/** Drives the hero, the Merchant and the Gravedigger rigs from game state and events. */
export function createCharacters(game: GameScene, options: CharactersOptions): Characters {
	const { hero, merchant, boss } = options;
	const baseRadius = game.camera.radius;
	let executionLeft = 0;
	let merchantState: "away" | "in" | "leaving" = "away";
	let merchantLeft = 0;
	let heroEntity = -1;
	let bossEntity = -1;

	hero.setVisible(true);
	merchant?.setVisible(false);
	boss?.setVisible(false);

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
			boss?.holdPose("idle", 0.25);
			merchant?.holdPose("idle", 0.25);
		},
		get executing(): boolean {
			return executionLeft > 0;
		},
		sync(world, alpha, dt, shopOpen): void {
			heroEntity = findHero(world);
			if (heroEntity >= 0) pose(hero, heroEntity, alpha);
			hero.update(dt);

			if (boss) {
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
					boss.setVisible(true);
					pose(boss, bossEntity, alpha);
				} else if (executionLeft <= 0) {
					boss.setVisible(false);
				}
				boss.update(dt);
			}

			if (executionLeft > 0) {
				executionLeft = Math.max(0, executionLeft - dt);
				const progress = 1 - executionLeft / options.executionSeconds;
				// Eases in and holds: the zoom closes in on the kill.
				game.camera.radius = baseRadius * (1 - options.executionZoom * Math.min(1, progress * 3));
				if (executionLeft === 0) {
					game.camera.radius = baseRadius;
					boss?.setVisible(false);
				}
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
		onEvent(type, _a, _b, c, entity): void {
			if (type === EventType.Swung) hero.playOnce("attack_melee");
			else if (type === EventType.Fired) hero.playOnce("attack_ranged");
			else if (type === EventType.PlayerHit && c !== 1) hero.playOnce("hit");
			else if (type === EventType.Died && entity === heroEntity) hero.playFinal("death");
			else if (type === EventType.BossEnraged) boss?.playOnce("enrage");
			else if (type === EventType.BossDied && boss) {
				boss.playFinal("death_execution");
				executionLeft = options.executionSeconds;
			}
		},
	};
}
