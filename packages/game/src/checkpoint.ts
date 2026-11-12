import { RNG_STREAMS, type RunCheckpoint } from "@gc/core";
import { heroesData, weaponsData } from "./data";
import { Health, Position, PrevPosition } from "./ecs/components";
import { DamageOrigin } from "./rules/runstats";
import type { GameSession } from "./session";

/** Which run the session belongs to; the session itself does not keep them. */
export interface RunIdentity {
	seed: number;
	difficulty: RunCheckpoint["difficulty"];
	/** UTC date of the daily challenge the run plays, if any. */
	daily?: string | null;
}

/**
 * The run as it stands when a round is about to start (GDD 21.4): the economy, build, hero and RNG streams, no
 * enemies. Call it while the intro of the round is on, never mid-fight. Allocates; it runs once per round.
 */
export function captureCheckpoint(session: GameSession, identity: RunIdentity): RunCheckpoint {
	const { progress, stats, runStats, hero, origin, weapon, shop, owned, levelUp, itemEffects, run, rng } =
		session;
	const own = session.heroDef.passive.modifiers.length;
	return {
		seed: identity.seed,
		difficulty: identity.difficulty,
		round: run.round,
		gold: progress.gold,
		xp: progress.xp,
		level: progress.level,
		hp: Health.hp[hero] ?? 0,
		weapon: { id: weapon.weapon.id ?? "", tier: weapon.tier },
		equipment: [...shop.levels],
		eliteFragments: progress.eliteFragments,
		relics: progress.relics,
		owned: Object.fromEntries(owned),
		// The hero passive modifiers come back by themselves when the session is rebuilt.
		modifiers: stats.modifiers.slice(own).map((m) => ({ stat: m.stat, op: m.op, value: m.value })),
		cardRerollsLeft: levelUp.rerollsLeft,
		revivesSpent: itemEffects.revivesSpent,
		bag: run.bag.value,
		rng: RNG_STREAMS.map((name) => rng[name].state()),
		origin: { x: origin.x, z: origin.z },
		position: { x: Position.x[hero] ?? 0, z: Position.z[hero] ?? 0 },
		kills: runStats.kills,
		damageDealt: runStats.damageDealt,
		elitesKilled: runStats.elitesKilled,
		bossRounds: [...runStats.bossRounds],
		hero: session.heroDef.id,
		seconds: Math.round(runStats.seconds),
		daily: identity.daily ?? null,
	};
}

/**
 * Puts a fresh session (same seed, difficulty and account as the saved run) back at the checkpoint: it starts at the
 * intro of the saved round with the saved build, stats and RNG, and no enemies. A save of a class that no longer exists
 * (ADR-0030) continues as the session's class with that class's weapon. Throws if the save names a weapon the game no
 * longer has or another class that still exists, so the caller can fall back to a new run.
 */
export function restoreCheckpoint(session: GameSession, cp: RunCheckpoint): void {
	const { progress, stats, runStats, hero, origin, weapon, shop, owned, levelUp, itemEffects, run, rng } =
		session;
	const classExists = heroesData.some((h) => h.id === cp.hero);
	if (classExists && cp.hero !== session.heroDef.id)
		throw new Error(`checkpoint is for hero ${cp.hero}, the session plays ${session.heroDef.id}`);
	const def = classExists ? weaponsData.find((w) => w.id === cp.weapon.id) : session.startingWeapon;
	if (!def) throw new Error(`checkpoint names an unknown weapon: ${cp.weapon.id}`);
	RNG_STREAMS.forEach((name, i) => {
		rng[name].setState(cp.rng[i] ?? 0);
	});
	progress.gold = cp.gold;
	progress.xp = cp.xp;
	progress.level = cp.level;
	progress.pendingLevelUps = 0;
	progress.roundGold = 0;
	owned.clear();
	for (const [id, count] of Object.entries(cp.owned)) owned.set(id, count);
	stats.add(cp.modifiers);
	itemEffects.restoreRevivesSpent(cp.revivesSpent);
	weapon.setWeapon(def, cp.weapon.tier);
	shop.restoreLevels(cp.equipment);
	progress.eliteFragments = cp.eliteFragments;
	progress.relics = cp.relics;
	levelUp.restoreRerollsLeft(cp.cardRerollsLeft);
	runStats.kills = cp.kills;
	runStats.damageDealt = cp.damageDealt;
	// The checkpoint keeps no per-source split: the damage dealt before the save counts as the weapon's.
	runStats.damageBySource.fill(0);
	runStats.damageBySource[DamageOrigin.Weapon] = cp.damageDealt;
	runStats.elitesKilled = cp.elitesKilled;
	runStats.seconds = cp.seconds;
	runStats.bossRounds.length = 0;
	runStats.bossRounds.push(...cp.bossRounds);
	origin.x = cp.origin.x;
	origin.z = cp.origin.z;
	Position.x[hero] = cp.position.x;
	Position.z[hero] = cp.position.z;
	PrevPosition.x[hero] = cp.position.x;
	PrevPosition.z[hero] = cp.position.z;
	session.chunks.update(cp.origin.x + cp.position.x, cp.origin.z + cp.position.z);
	// Max HP and speed follow the restored stats; the saved HP applies on top.
	stats.run(hero);
	Health.hp[hero] = Math.min(cp.hp, Health.max[hero] ?? cp.hp);
	run.resumeAt(cp.round, cp.bag);
}
