import { EventType } from "@gc/game";
import type { AudioEngine, PlayOptions } from "./audioEngine";

/** What the mapper needs to know about the world to name a sound. */
export interface SoundContext {
	hero: number;
	/** The death sound of an enemy entity (by its type). */
	enemyDeath(entity: number): string;
	/** The id of a boss entity from bosses.json ("gravedigger"), or "" when unknown. */
	bossId(entity: number): string;
}

interface Sound {
	ids: string | readonly string[];
	options?: PlayOptions;
}

const HIT: PlayOptions = { priority: "enemy", maxVoices: 8 };
const HERO: PlayOptions = { priority: "hero", maxVoices: 2 };
const BOSS: PlayOptions = { priority: "boss", maxVoices: 2 };
const ELITE: PlayOptions = { priority: "elite", maxVoices: 2 };
const VOICE: PlayOptions = { priority: "boss", maxVoices: 1, pitchSpread: 0 };

/**
 * The sound of one ring-buffer event (SDD 08 section 2), or null when the event is silent. Pure: the engine owns
 * throttling, voice limits and the per-frame budget. Files that do not exist yet play as silence.
 */
export function soundFor(
	type: number,
	a: number,
	b: number,
	c: number,
	entity: number,
	ctx: SoundContext,
): Sound | null {
	switch (type) {
		case EventType.Damaged:
			return b === 1
				? { ids: "sfx_enemy_hit_01", options: HIT }
				: { ids: ["sfx_sword_hit_01", "sfx_sword_hit_02"], options: HIT };
		case EventType.Died:
			if (entity === ctx.hero) return { ids: "sfx_player_death", options: HERO };
			// b = 1: purged at the round end, not a kill.
			return b === 1
				? null
				: { ids: ctx.enemyDeath(entity), options: { priority: "enemy", maxVoices: 6 } };
		case EventType.Dodged:
			return { ids: "sfx_player_dodge", options: HERO };
		case EventType.PlayerHit:
			// c = 1: the leech drain, which hurts without a blow.
			return c === 1 ? null : { ids: "sfx_player_hit", options: HERO };
		case EventType.RoundStarted:
			return { ids: "sfx_round_start_drum", options: HERO };
		case EventType.RoundEnded:
			return { ids: "sfx_round_end_bell", options: HERO };
		case EventType.Swung:
			return { ids: "sfx_sword_swing_01", options: { priority: "hero", maxVoices: 4 } };
		case EventType.Fired:
			return { ids: "sfx_pistol_shot_01", options: { priority: "hero", maxVoices: 6 } };
		case EventType.Exploded:
			return { ids: "sfx_explosion_01", options: { priority: "hero", maxVoices: 4 } };
		case EventType.LevelUp:
			return { ids: "sfx_player_levelup", options: HERO };
		case EventType.EliteIncoming:
			return { ids: "sfx_elite_incoming", options: ELITE };
		case EventType.EliteSpawned:
			return { ids: "sfx_elite_spawn", options: ELITE };
		case EventType.ChestDropped:
			return { ids: "sfx_chest_drop", options: ELITE };
		case EventType.ChestOpened:
			return { ids: "sfx_chest_open", options: HERO };
		case EventType.BossTelegraph:
			return { ids: "sfx_boss_telegraph", options: BOSS };
		case EventType.BossSummon:
			return { ids: "sfx_boss_summon", options: BOSS };
		case EventType.BossEnraged:
			return { ids: "sfx_boss_enrage", options: BOSS };
		case EventType.BossDied: {
			const id = ctx.bossId(entity);
			return id ? { ids: `voice_${id}_death`, options: VOICE } : null;
		}
		case EventType.BossPhase: {
			const id = ctx.bossId(entity);
			return id ? { ids: `voice_${id}_phase`, options: VOICE } : null;
		}
		case EventType.BossPool:
			return { ids: "sfx_boss_pool", options: BOSS };
		case EventType.BossScream:
			return { ids: "sfx_boss_scream", options: BOSS };
		case EventType.BossShockwave:
			return { ids: "sfx_boss_shockwave", options: BOSS };
		case EventType.BossStealth:
			return { ids: a === 1 ? "sfx_boss_stealth" : "sfx_boss_reveal", options: BOSS };
		case EventType.BossLeap:
			return { ids: "sfx_boss_leap", options: BOSS };
		case EventType.BossEggLaid:
			return { ids: "sfx_egg_laid", options: BOSS };
		case EventType.BossEggBroken:
			return { ids: "sfx_egg_broken", options: BOSS };
		case EventType.BossEggHatched:
			return { ids: "sfx_egg_hatched", options: BOSS };
		case EventType.BossSweep:
			return { ids: "sfx_boss_sweep", options: BOSS };
		case EventType.BossBomb:
			return { ids: "sfx_boss_bomb", options: BOSS };
		case EventType.DashStarted:
			return { ids: "sfx_dash", options: HERO };
		case EventType.PropBroken:
			return { ids: "sfx_prop_break", options: HIT };
		case EventType.FragmentPicked:
			return { ids: "sfx_pickup_fragment_01", options: { priority: "hero", maxVoices: 3 } };
		case EventType.ConsumablePicked:
			return { ids: "sfx_pickup_consumable", options: HERO };
		case EventType.Revived:
			return { ids: "sfx_player_revive", options: HERO };
		default:
			return null;
	}
}

/** The visitor to give the event buffer: plays what `soundFor` names and ducks the music on a hero hit. */
export function createEventAudio(
	engine: AudioEngine,
	ctx: SoundContext,
): (type: number, a: number, b: number, c: number, entity: number) => void {
	return (type, a, b, c, entity) => {
		const sound = soundFor(type, a, b, c, entity, ctx);
		if (!sound) return;
		engine.play(sound.ids, sound.options);
		if (type === EventType.PlayerHit) engine.duck();
	};
}
