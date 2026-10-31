import {
	createInputState,
	createMetaState,
	DIFFICULTIES,
	type Difficulty,
} from "../../packages/core/src/index";
import {
	createGameSession,
	difficultyData,
	EventType,
	enemiesData,
	Health,
	hashWorld,
	heroData,
	Position,
	queryEnemies,
	roundsData,
	STEP,
	weaponsData,
} from "../../packages/game/src/index";
import { POLICY_LABEL, type PolicyId, policyFor, tankSteer } from "./policy";

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
	const policy = policyFor(options.policy ?? "greedy");
	const session = createGameSession({
		seed: options.seed,
		difficulty,
		meta,
		// The simulator opens the shop at once: no walk to the Merchant, no steps or randomness spent on it.
		autoShop: true,
		...(options.weapon !== undefined && { weapon: options.weapon }),
	});
	const {
		world,
		hero,
		events,
		progress,
		run,
		shop,
		levelUp,
		chest,
		weapon,
		boss,
		poolItems,
		origin,
		dash,
	} = session;

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

	let dashHeld = false;

	/** The policy's move: hold the weapon's range from the nearest enemy, backing off when it is closer (the tank also runs and dashes). */
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
		if (policy.id === "tank") {
			const spots: { x: number; z: number }[] = [];
			for (const e of queryEnemies(world)) spots.push({ x: Position.x[e] ?? 0, z: Position.z[e] ?? 0 });
			const move = tankSteer({
				hero: { x: hx, z: hz },
				hpFraction: (Health.hp[hero] ?? 0) / Math.max(1, Health.max[hero] ?? 1),
				range: weapon.range,
				enemies: spots,
				canDash: dash.unlocked && dash.charges > 0,
			});
			input.moveX = move.moveX;
			input.moveZ = move.moveZ;
			// The dash fires on the press edge: hold it one step, then let go.
			input.dash = move.dash && !dashHeld;
			dashHeld = move.dash;
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
			if (
				!levelUp.choose(
					pickBest(offer.length, (i) => policy.modifierValue(offer[i]?.modifiers ?? [])),
				)
			)
				break;
		}
		while (chest.offer) {
			const offer = chest.offer;
			const index = pickBest(
				offer.length,
				(i) =>
					policy.modifierValue(offer[i]?.modifiers ?? []) +
					policy.chestBonus(poolItems.find((it) => it.id === offer[i]?.id)?.effects),
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
						policy.modifierValue(item?.modifiers ?? []) +
						(item ? policy.effectValue(item.effects) : 0);
				} else if (slot.kind === "upgrade") {
					benefit = policy.upgradeValue;
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

	const maxSteps =
		options.maxSteps ??
		Math.ceil(
			(options.rounds * (policy.id === "tank" ? TANK_SECONDS_PER_ROUND : MAX_SECONDS_PER_ROUND)) / STEP,
		);
	run.newRun();
	while (steps < maxSteps) {
		if (run.state === "Results") {
			report.outcome = "died";
			break;
		}
		choose();
		if (run.state === "Round" || run.state === "BossRound") steer();
		else input.dash = false;
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
