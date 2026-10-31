import { createInputState, createMetaState } from "../../packages/core/src/index";
import {
	createGameSession,
	difficultyData,
	EventType,
	enemiesData,
	Health,
	hashWorld,
	heroData,
	type Modifier,
	Position,
	queryEnemies,
	roundsData,
	STEP,
	weaponsData,
} from "../../packages/game/src/index";

export interface SimOptions {
	seed: number;
	rounds: number;
	difficulty: string;
	weapon?: string;
	/** Stop after this many simulation steps (determinism test); default: enough for `rounds` rounds. */
	maxSteps?: number;
	/** Ossuary node ids the simulated account already owns. */
	ossuary?: readonly string[];
}

export interface RoundReport {
	round: number;
	kills: number;
	damageTaken: number;
	gold: number;
	/** Gold picked up during the round. */
	goldEarned: number;
	/** Mean price of the item slots of the shop that followed (0 when the run ended first). */
	avgItemPrice: number;
	levelUps: number;
}

export type Outcome = "completed" | "died" | "timeout";

export interface BossFight {
	round: number;
	boss: string;
	/** Seconds from the start of the boss round to its death; null when the hero died first. */
	killSeconds: number | null;
	/** Enrage stacks the boss had when the fight ended (GDD 25: a build that needs 3 is too weak). */
	enrageStacks: number;
}

export interface SimReport {
	seed: number;
	roundsRequested: number;
	difficulty: string;
	weapon: string;
	policy: "greedy-kite";
	outcome: Outcome;
	/** Round the run was in when it stopped (the last completed round when `outcome` is "completed"). */
	roundReached: number;
	kills: number;
	damageDealt: number;
	damageTaken: number;
	gold: number;
	level: number;
	heroHp: number;
	steps: number;
	eventsDropped: number;
	/** `hashWorld` of the final state (determinism anchor). */
	worldHash: number;
	perRound: RoundReport[];
	bosses: BossFight[];
	itemsBought: number;
	/** Items owned at the end of the run, by id (how often the greedy bot picks each one). */
	itemsOwned: Record<string, number>;
	/** Id of the enemy that landed the killing blow, "self" or "none" (run still alive). */
	killedBy: string;
}

const MAX_SECONDS_PER_ROUND = 90;

/**
 * Value of a modifier to the greedy player, per unit. This is the *policy* of the simulated player (GDD 25: "buys the
 * best item per cost, picks the card of the stat it lacks most"), not game data: it only decides what the bot picks.
 */
const STAT_WEIGHT: Readonly<Record<string, number>> = {
	damage: 100,
	attack_speed: 100,
	crit_chance: 60,
	max_hp: 0.8,
	hp_regen: 30,
	armor: 6,
	dodge: 80,
	speed: 25,
	life_steal: 300,
	range: 6,
	luck: 0.2,
	harvest: 4,
	pickup_range: 10,
	xp_gain: 30,
};
/** Flat value of an item whose power is a special effect rather than a stat. */
const EFFECT_VALUE = 18;

function modifierValue(mods: readonly Modifier[]): number {
	let total = 0;
	for (const m of mods) {
		const weight = STAT_WEIGHT[m.stat] ?? 0;
		// `mul` modifiers are factors around 1 (0.7 = -30%): worth their distance from 1 on a 100-point scale.
		total += m.op === "mul" ? (m.value - 1) * weight * 0.5 : m.value * weight;
	}
	return total;
}

function difficultyId(id: string): "normal" | "grim" | "nightmare" {
	if (id === "normal" || id === "grim" || id === "nightmare") return id;
	throw new Error(`unknown difficulty "${id}"`);
}

export function runSim(options: SimOptions): SimReport {
	const difficulty = difficultyData(roundsData.difficulties, difficultyId(options.difficulty));
	const weaponId = options.weapon ?? heroData.startingWeapon;
	if (!weaponsData.some((w) => w.id === weaponId)) throw new Error(`unknown weapon "${weaponId}"`);

	const meta = createMetaState();
	for (const node of options.ossuary ?? []) meta.ossuary[node] = true;
	// The same wiring the game runs (P-07-05): shop, cards, elites, bosses, props, hero status, item effects.
	const session = createGameSession({
		seed: options.seed,
		difficulty,
		meta,
		// The simulator opens the shop at once: no walk to the Merchant, no steps or randomness spent on it.
		autoShop: true,
		...(options.weapon !== undefined && { weapon: options.weapon }),
	});
	const { world, hero, events, progress, run, shop, levelUp, chest, weapon, boss, poolItems, origin } =
		session;

	const input = createInputState();
	const bosses: BossFight[] = [];
	const report: SimReport = {
		seed: options.seed,
		roundsRequested: options.rounds,
		difficulty: options.difficulty,
		weapon: weaponId,
		policy: "greedy-kite",
		outcome: "timeout",
		roundReached: 1,
		kills: 0,
		damageDealt: 0,
		damageTaken: 0,
		gold: 0,
		level: 1,
		heroHp: heroData.base.maxHp,
		steps: 0,
		eventsDropped: 0,
		worldHash: 0,
		perRound: [],
		bosses,
		itemsBought: 0,
		itemsOwned: {},
		killedBy: "none",
	};
	let steps = 0;
	let bossStartStep = 0;
	let roundKills = 0;
	let roundDamageTaken = 0;
	let roundLevelUps = 0;
	let roundGoldEarned = 0;
	let lastGold = progress.gold;
	let avgPriceOfNextShop = 0;

	const visit = (type: number, a: number, b: number, _c: number, entity: number): void => {
		if (type === EventType.Damaged) report.damageDealt += a;
		else if (type === EventType.PlayerHit) {
			report.damageTaken += a;
			roundDamageTaken += a;
		} else if (type === EventType.Died && entity !== hero && b === 0) {
			report.kills++;
			roundKills++;
		} else if (type === EventType.LevelUp) {
			roundLevelUps++;
		} else if (type === EventType.BossEnraged) {
			const last = bosses.at(-1);
			if (last) last.enrageStacks = a;
		} else if (type === EventType.BossDied) {
			const last = bosses.at(-1);
			if (last && last.killSeconds === null) last.killSeconds = (steps - bossStartStep) * STEP;
		} else if (type === EventType.RoundEnded) {
			report.perRound.push({
				round: a,
				kills: roundKills,
				damageTaken: roundDamageTaken,
				gold: progress.gold,
				goldEarned: roundGoldEarned,
				avgItemPrice: 0,
				levelUps: roundLevelUps,
			});
			roundKills = 0;
			roundDamageTaken = 0;
			roundLevelUps = 0;
			roundGoldEarned = 0;
		}
	};

	/** Greedy-kite policy: hold the weapon's range from the nearest enemy, backing off when it is closer. */
	function steer(): void {
		const hx = Position.x[hero] ?? 0;
		const hz = Position.z[hero] ?? 0;
		// The bot roams outwards as the run goes on (20 u + 8 u per round): ring 1 starts at 120 u, so a median run
		// meets the Swamp from round ~13, the Forge from ~30. Beyond that radius it walks back towards the centre.
		const fromCentreX = origin.x + hx;
		const fromCentreZ = origin.z + hz;
		const fromCentre = Math.hypot(fromCentreX, fromCentreZ);
		if (fromCentre > 20 + 8 * run.round) {
			input.moveX = -fromCentreX / fromCentre;
			input.moveZ = -fromCentreZ / fromCentre;
			return;
		}
		let best = Number.POSITIVE_INFINITY;
		let dx = 0;
		let dz = 0;
		const list = queryEnemies(world);
		for (let i = 0; i < list.length; i++) {
			const e = list[i] ?? 0;
			const ex = (Position.x[e] ?? 0) - hx;
			const ez = (Position.z[e] ?? 0) - hz;
			const d = ex * ex + ez * ez;
			if (d < best) {
				best = d;
				dx = ex;
				dz = ez;
			}
		}
		const length = Math.sqrt(best);
		if (!(length > 0) || !Number.isFinite(length)) {
			input.moveX = 0;
			input.moveZ = 0;
			return;
		}
		const want = Math.max(1, weapon.range * 0.8);
		const sign = length > want + 0.5 ? 1 : length < want - 0.5 ? -1 : 0;
		input.moveX = (sign * dx) / length;
		input.moveZ = (sign * dz) / length;
	}

	function pickBest(count: number, scoreOf: (index: number) => number): number {
		let best = 0;
		for (let i = 1; i < count; i++) if (scoreOf(i) > scoreOf(best)) best = i;
		return best;
	}

	/** Takes the pending level-up card and chest item with the highest policy value. */
	function choose(): void {
		while (levelUp.offer) {
			const offer = levelUp.offer;
			if (!levelUp.choose(pickBest(offer.length, (i) => modifierValue(offer[i]?.modifiers ?? []))))
				break;
		}
		while (chest.offer) {
			const offer = chest.offer;
			const index = pickBest(
				offer.length,
				(i) => modifierValue(offer[i]?.modifiers ?? []) + EFFECT_VALUE,
			);
			if (!chest.choose(index)) break;
		}
	}

	/** Buys by value per gold until nothing worth it is affordable. */
	function shopGreedy(): void {
		const prices = shop.slots.filter((s) => s.kind === "item").map((s) => s.price);
		avgPriceOfNextShop = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
		for (;;) {
			let bestIndex = -1;
			let bestRatio = 0;
			for (const [i, slot] of shop.slots.entries()) {
				if (slot.sold || slot.price > progress.gold) continue;
				let benefit = 0;
				if (slot.kind === "item") {
					const item = poolItems.find((it) => it.id === slot.id);
					benefit =
						modifierValue(item?.modifiers ?? []) +
						(item && item.effects.length > 0 ? EFFECT_VALUE : 0);
				} else if (slot.kind === "upgrade") {
					benefit = 40;
				}
				const ratio = benefit / Math.max(1, slot.price);
				if (benefit > 0 && ratio > bestRatio) {
					bestRatio = ratio;
					bestIndex = i;
				}
			}
			if (bestIndex < 0 || !shop.buy(bestIndex)) return;
			report.itemsBought++;
		}
	}

	const maxSteps = options.maxSteps ?? Math.ceil((options.rounds * MAX_SECONDS_PER_ROUND) / STEP);
	run.newRun();
	while (steps < maxSteps) {
		if (run.state === "Results") {
			report.outcome = "died";
			break;
		}
		choose();
		if (run.state === "Round" || run.state === "BossRound") steer();
		session.step(input);
		// A level-up or chest pauses the round mid-fight, so the fight is told apart by its round, not by the state.
		if (run.state === "BossRound" && bosses.at(-1)?.round !== run.round) {
			bossStartStep = steps;
			bosses.push({
				round: run.round,
				boss: boss.defFor(run.round).id,
				killSeconds: null,
				enrageStacks: 0,
			});
		}
		if (progress.gold > lastGold) roundGoldEarned += progress.gold - lastGold;
		lastGold = progress.gold;
		events.consume(visit);
		steps++;
		if (run.state === "Shop") {
			shopGreedy();
			const last = report.perRound.at(-1);
			if (last) last.avgItemPrice = avgPriceOfNextShop;
			lastGold = progress.gold;
			if (run.round >= options.rounds) {
				report.outcome = "completed";
				break;
			}
			run.closeShop();
		}
	}

	const killer = session.runStats.killer;
	report.killedBy =
		killer.kind === "enemy"
			? (enemiesData[killer.type]?.id ?? "enemy")
			: killer.kind === "self"
				? "self"
				: "none";
	report.steps = steps;
	report.roundReached = run.round;
	report.gold = progress.gold;
	report.itemsOwned = Object.fromEntries(shop.owned);
	report.level = progress.level;
	report.heroHp = Math.max(0, Health.hp[hero] ?? 0);
	report.eventsDropped = events.dropped;
	report.worldHash = hashWorld(world);
	return report;
}
