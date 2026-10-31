import { RNG_STREAMS, type RunCheckpoint } from "@gc/core";
import { weaponsData } from "./data";
import { Health, Position, PrevPosition } from "./ecs/components";
import type { GameSession } from "./session";

/** Which run the session belongs to; the session itself does not keep them. */
export interface RunIdentity {
	seed: number;
	difficulty: RunCheckpoint["difficulty"];
}

/**
 * The run as it stands when a round is about to start (GDD 21.4): the economy, build, hero and RNG streams, no
 * enemies. Call it while the intro of the round is on, never mid-fight. Allocates; it runs once per round.
 */
export function captureCheckpoint(session: GameSession, identity: RunIdentity): RunCheckpoint {
	const { progress, stats, runStats, hero, origin, weapon, shop, owned, levelUp, itemEffects, run, rng } =
		session;
	const own = session.ossuaryBonus.modifiers.length;
	return {
		seed: identity.seed,
		difficulty: identity.difficulty,
		round: run.round,
		gold: progress.gold,
		xp: progress.xp,
		level: progress.level,
		hp: Health.hp[hero] ?? 0,
		weapon: { id: weapon.weapon.id ?? "", tier: weapon.tier, paid: shop.paid },
		owned: Object.fromEntries(owned),
		// Ossuary modifiers come back by themselves when the session is rebuilt from the same account.
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
	};
}

/**
 * Puts a fresh session (same seed, difficulty and account as the saved run) back at the checkpoint: it starts at the
 * intro of the saved round with the saved build, stats and RNG, and no enemies. Throws if the save names a weapon
 * the game no longer has, so the caller can fall back to a new run.
 */
export function restoreCheckpoint(session: GameSession, cp: RunCheckpoint): void {
	const { progress, stats, runStats, hero, origin, weapon, shop, owned, levelUp, itemEffects, run, rng } =
		session;
	const def = weaponsData.find((w) => w.id === cp.weapon.id);
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
	shop.restorePaid(cp.weapon.paid);
	levelUp.restoreRerollsLeft(cp.cardRerollsLeft);
	runStats.kills = cp.kills;
	runStats.damageDealt = cp.damageDealt;
	runStats.elitesKilled = cp.elitesKilled;
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
