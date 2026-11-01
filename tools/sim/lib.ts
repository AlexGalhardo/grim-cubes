import {
	createInputState,
	createMetaState,
	DIFFICULTIES,
	type Difficulty,
} from "../../packages/core/src/index";
import {
	createBot,
	createGameSession,
	difficultyData,
	EventType,
	enemiesData,
	Health,
	hashWorld,
	heroData,
	POLICY_LABEL,
	type PolicyId,
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
	/** Who plays: the damage-first `greedy` bot (default) or the survival-first `tank` (B-02-02). */
	policy?: PolicyId;
	/** Soak test: the hero's HP is refilled every step so the run keeps going to the requested round. */
	immortal?: boolean;
	/** The bot sidesteps props it is stuck against (the soak needs it to reach every boss). */
	unstick?: boolean;
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
	policy: "greedy-kite" | "tank-kite";
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
/** The tank stands and fights, so its boss rounds run long: it gets a longer budget before a run counts as a timeout. */
const TANK_SECONDS_PER_ROUND = 150;

function difficultyId(id: string): Difficulty {
	const found = DIFFICULTIES.find((d) => d === id);
	if (found) return found;
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
	const { world, hero, events, progress, run, shop, boss } = session;

	const input = createInputState();
	const bosses: BossFight[] = [];
	const report: SimReport = {
		seed: options.seed,
		roundsRequested: options.rounds,
		difficulty: options.difficulty,
		weapon: weaponId,
		policy: POLICY_LABEL[options.policy ?? "greedy"],
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

	const bot = createBot(session, options.policy ?? "greedy", {
		unstick: options.unstick === true,
		onShopOpened: (average) => {
			avgPriceOfNextShop = average;
		},
		onItemBought: () => {
			report.itemsBought++;
		},
	});

	const maxSteps =
		options.maxSteps ??
		Math.ceil(
			(options.rounds *
				((options.policy ?? "greedy") === "tank" ? TANK_SECONDS_PER_ROUND : MAX_SECONDS_PER_ROUND)) /
				STEP,
		);
	run.newRun();
	while (steps < maxSteps) {
		if (run.state === "Results") {
			report.outcome = "died";
			break;
		}
		bot.prepare(input);
		session.step(input);
		if (options.immortal) Health.hp[hero] = Health.max[hero] ?? 0;
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
			bot.shop();
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
