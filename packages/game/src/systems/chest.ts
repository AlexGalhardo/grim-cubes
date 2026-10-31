import { removeEntity } from "bitecs";
import type { ElitesData, ItemData } from "../data/types";
import { Chest, Health, Position } from "../ecs/components";
import { type EventBuffer, EventType } from "../ecs/events";
import { createQueryCache, type GameWorld } from "../ecs/world";
import type { Modifier } from "../rules/stats";
import type { RunSystem } from "./round";
import type { StatsSystem } from "./stats";

export interface ChestOffer {
	id: string;
	name: string;
	tier: number;
	modifiers: readonly Modifier[];
}

export interface ChestSystemDeps {
	reward: ElitesData["reward"];
	items: readonly ItemData[];
	/** The `loot` RNG stream. */
	rng: { int(n: number): number };
	run: RunSystem;
	stats: StatsSystem;
	owned: Map<string, number>;
	onItemTaken: () => void;
	events: EventBuffer;
	/** Whether another full-screen choice (level-up) is already open. */
	blocked: () => boolean;
	pickupRadius: () => number;
}

export interface ChestSystem {
	/** The items on offer while a chest is open; the run is paused until `choose`. */
	readonly offer: readonly ChestOffer[] | null;
	run(world: GameWorld, hero: number): void;
	choose(index: number): boolean;
}

const chests = createQueryCache([Chest, Position]);

/**
 * Elite chests (GDD 11): walking within pickup range opens one, heals the hero and offers `offered` items of
 * at least the chest's tier; the hero keeps `picks` of them. The run pauses while the offer is open.
 */
export function createChestSystem(deps: ChestSystemDeps): ChestSystem {
	const { reward, items, rng, run, stats, owned, onItemTaken, events, blocked, pickupRadius } = deps;
	let offer: ChestOffer[] | null = null;

	function draw(tier: number): ChestOffer[] {
		let pool = items.filter((i) => i.tier >= tier);
		if (pool.length === 0) pool = [...items];
		const out: ChestOffer[] = [];
		while (out.length < reward.chest.offered && pool.length > 0) {
			const [pick] = pool.splice(rng.int(pool.length), 1);
			if (pick) out.push({ id: pick.id, name: pick.name, tier: pick.tier, modifiers: pick.modifiers });
		}
		return out;
	}

	return {
		get offer(): readonly ChestOffer[] | null {
			return offer;
		},
		run(world: GameWorld, hero: number): void {
			if (offer !== null || blocked() || (run.state !== "Round" && run.state !== "BossRound")) return;
			const list = chests(world);
			const hx = Position.x[hero] ?? 0;
			const hz = Position.z[hero] ?? 0;
			const reach = pickupRadius();
			for (let i = 0; i < list.length; i++) {
				const c = list[i] ?? 0;
				if (Math.hypot((Position.x[c] ?? 0) - hx, (Position.z[c] ?? 0) - hz) > reach) continue;
				offer = draw(Chest.tier[c] ?? reward.chest.tier);
				removeEntity(world, c);
				Health.hp[hero] = Math.min((Health.hp[hero] ?? 0) + reward.healHp, Health.max[hero] ?? 0);
				run.pause();
				events.push(EventType.ChestOpened, 0, 0, 0, 0);
				return;
			}
		},
		choose(index: number): boolean {
			const picked = offer?.[index];
			if (!picked) return false;
			stats.add(picked.modifiers);
			owned.set(picked.id, (owned.get(picked.id) ?? 0) + 1);
			onItemTaken();
			offer = null;
			run.resume();
			return true;
		},
	};
}
