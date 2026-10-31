import { createInputState, createMetaState } from "@gc/core";
import { addComponent, query, removeEntity } from "bitecs";
import { expect, test } from "vitest";
import { heroData, roundsData } from "./data";
import {
	Boss,
	ContactDamage,
	EnemyFaction,
	Health,
	Invulnerable,
	KnockbackResist,
	Position,
	Speed,
} from "./ecs/components";
import { EventType } from "./ecs/events";
import { dropFragment } from "./ecs/fragments";
import { armorMultiplier } from "./rules/damage";
import { difficultyData } from "./rules/difficulty";
import type { Modifier } from "./rules/stats";
import { createGameSession, type GameSession } from "./session";

/**
 * "Every stat does something": each test changes one stat through a modifier, as a card, item or Ossuary node would,
 * and measures the effect in the real session (the owning system wired as the game wires it).
 */
const difficulty = difficultyData(roundsData.difficulties, "normal");
const add = (stat: string, value: number): Modifier => ({ stat, op: "add", value });

/** A round with no horde: only what the test places is on the field. */
function arena(mods: readonly Modifier[] = [], weapon?: string) {
	const session = createGameSession({
		seed: 11,
		difficulty,
		meta: createMetaState(),
		...(weapon ? { weapon } : {}),
	});
	session.stats.add(mods);
	session.run.newRun();
	const input = createInputState();
	while (!session.fighting()) session.step(input);
	session.spawn.startRound(session.run.round, {
		pool: [{ type: 0, weight: 1 }],
		difficultyMult: 1,
		totalScale: 0,
	});
	for (const e of query(session.world, [EnemyFaction])) removeEntity(session.world, e);
	Health.hp[session.hero] = Health.max[session.hero] = 1e9;
	session.events.consume(() => undefined);
	return { session, input };
}

/** A motionless, tough, harmless enemy at (x, z). */
function dummy(session: GameSession, x: number, z: number, pushable = false): number {
	const e = session.spawn.spawnEnemy(session.world, 0, x, z);
	Speed.value[e] = 0;
	Health.hp[e] = Health.max[e] = 1e9;
	ContactDamage.value[e] = 0;
	// Without this the first hit knocks it out of reach and the rest of the test measures nothing.
	KnockbackResist.value[e] = pushable ? 0 : 1;
	return e;
}

interface Hits {
	count: number;
	sum: number;
	crits: number;
	exploded: number[];
}

function fight(session: GameSession, input: ReturnType<typeof createInputState>, steps: number): Hits {
	const hits: Hits = { count: 0, sum: 0, crits: 0, exploded: [] };
	for (let i = 0; i < steps; i++) {
		session.step(input);
		session.events.consume((type, a, b, c) => {
			if (type === EventType.Damaged) {
				hits.count++;
				hits.sum += a;
				hits.crits += b === 1 ? 1 : 0;
			} else if (type === EventType.Exploded) {
				hits.exploded.push(c);
			}
		});
	}
	return hits;
}

const base = heroData.base;

test("maxHp raises max HP and heals by the gain", () => {
	const { session, input } = arena();
	Health.max[session.hero] = Health.hp[session.hero] = base.maxHp;
	session.stats.stats.dirty = true;
	session.stats.run(session.hero);
	session.stats.add([add("max_hp", 30)]);
	session.step(input);
	expect(Health.max[session.hero]).toBeCloseTo(base.maxHp + 30);
	expect(session.stats.stats.maxHp).toBeCloseTo(base.maxHp + 30);
});

test("speed scales the hero's speed and stays inside the data caps", () => {
	const speedOf = (value: number): number => {
		const { session, input } = arena([add("speed", value)]);
		session.step(input);
		return Speed.value[session.hero] ?? 0;
	};
	const caps = heroData.caps;
	expect(speedOf(0.5)).toBeCloseTo(base.speed * 1.5);
	expect(speedOf(100)).toBeCloseTo(base.speed * (1 + caps.speedMax));
	expect(speedOf(-100)).toBeCloseTo(base.speed * (1 + caps.speedMin));
});

test("armor reduces the damage taken by the formula, and negative armor increases it within the bound", () => {
	const taken = (armor: number): number => {
		const { session } = arena([add("armor", armor)]);
		session.stats.run(session.hero);
		Health.hp[session.hero] = 1000;
		Invulnerable.ticks[session.hero] = 0;
		session.damage.queue.push(session.hero, 100, 0, 0, 0, 0);
		session.damage.run(session.world);
		return 1000 - (Health.hp[session.hero] ?? 0);
	};
	const constant = 6.66;
	expect(taken(0)).toBeCloseTo(100);
	expect(taken(10)).toBeCloseTo(100 * armorMultiplier(10, constant));
	expect(taken(10)).toBeLessThan(taken(0));
	expect(taken(-10)).toBeCloseTo(100 * armorMultiplier(-10, constant));
	expect(taken(-10)).toBeGreaterThan(taken(0));
	expect(taken(-10)).toBeLessThan(200);
});

test("dodge avoids about the stated fraction of 2,000 hits with a fixed seed", () => {
	const { session } = arena([add("dodge", 0.3)]);
	session.stats.run(session.hero);
	let dodged = 0;
	for (let i = 0; i < 2000; i++) {
		Invulnerable.ticks[session.hero] = 0;
		session.damage.queue.push(session.hero, 1, 0, 0, 0, 0);
		session.damage.run(session.world);
		session.events.consume((type) => {
			if (type === EventType.Dodged) dodged++;
		});
	}
	expect(dodged / 2000).toBeGreaterThan(0.26);
	expect(dodged / 2000).toBeLessThan(0.34);
});

test("lifeSteal heals the hero when it deals damage, and nothing happens without the stat", () => {
	const healed = (steal: number): number => {
		const { session, input } = arena(steal > 0 ? [add("life_steal", steal)] : []);
		const target = dummy(session, 40, 40);
		session.stats.run(session.hero);
		Health.hp[session.hero] = 50;
		session.damage.queue.push(target, 1000, session.hero, 0, 0, 0);
		for (let i = 0; i < 12; i++) session.step(input);
		return (Health.hp[session.hero] ?? 0) - 50;
	};
	expect(healed(0)).toBeCloseTo(0);
	expect(healed(0.1)).toBeGreaterThan(0);
});

test("damage scales every hit and attack speed the number of swings", () => {
	const plain = arena();
	dummy(plain.session, 1.2, 0);
	const a = fight(plain.session, plain.input, 300);
	const strong = arena([add("damage", 1)]);
	dummy(strong.session, 1.2, 0);
	const b = fight(strong.session, strong.input, 300);
	expect(a.count).toBeGreaterThan(0);
	expect(b.count).toBe(a.count);
	expect(b.sum / a.sum).toBeCloseTo(2, 1);

	const quick = arena([add("attack_speed", 1)]);
	dummy(quick.session, 1.2, 0);
	const c = fight(quick.session, quick.input, 300);
	expect(c.count / a.count).toBeGreaterThan(1.7);
	expect(c.count / a.count).toBeLessThan(2.3);
});

test("critChance makes hits critical and the crit multiplier doubles them", () => {
	const plain = arena();
	dummy(plain.session, 1.2, 0);
	const a = fight(plain.session, plain.input, 400);
	const sure = arena([add("crit_chance", 1)]);
	dummy(sure.session, 1.2, 0);
	const b = fight(sure.session, sure.input, 400);
	expect(a.crits).toBeLessThan(a.count);
	expect(b.crits).toBe(b.count);
	expect(b.sum / b.count).toBeGreaterThan((a.sum / a.count) * 1.5);
});

test("range lets the weapon reach an enemy it could not reach before", () => {
	const swing = (range: number): number => {
		const { session, input } = arena(range > 0 ? [add("range", range)] : []);
		dummy(session, 4, 0);
		return fight(session, input, 200).count;
	};
	expect(swing(0)).toBe(0);
	expect(swing(3)).toBeGreaterThan(0);
});

test("knockback pushes a hit enemy farther", () => {
	const pushed = (value: number): number => {
		const { session, input } = arena(value > 0 ? [add("knockback", value)] : []);
		const e = dummy(session, 1.2, 0, true);
		fight(session, input, 30);
		return Math.hypot(Position.x[e] ?? 0, Position.z[e] ?? 0) - 1.2;
	};
	const plain = pushed(0);
	expect(plain).toBeGreaterThan(0);
	expect(pushed(1) / plain).toBeGreaterThan(1.5);
});

test("bossDamage raises the damage dealt to bosses only", () => {
	const dealt = (boss: boolean, value: number): number => {
		const { session, input } = arena(value > 0 ? [add("boss_damage", value)] : []);
		const e = dummy(session, 1.2, 0);
		if (boss) addComponent(session.world, e, Boss);
		return fight(session, input, 300).sum;
	};
	expect(dealt(true, 1) / dealt(true, 0)).toBeCloseTo(2, 1);
	expect(dealt(false, 1) / dealt(false, 0)).toBeCloseTo(1, 5);
});

test("explosionSize widens the bazooka blast", () => {
	const radius = (value: number): number => {
		const { session, input } = arena(value > 0 ? [add("explosion_size", value)] : [], "bazooka");
		dummy(session, 3, 0);
		const blasts = fight(session, input, 240).exploded;
		return blasts[0] ?? 0;
	};
	const plain = radius(0);
	expect(plain).toBeGreaterThan(0);
	expect(radius(0.5) / plain).toBeCloseTo(1.5, 2);
});

test("enemySpeed slows the horde: -50% walks half as far", () => {
	const walked = (value: number): number => {
		const { session, input } = arena(value !== 0 ? [add("enemy_speed", value)] : []);
		const e = session.spawn.spawnEnemy(session.world, 0, 20, 0);
		Health.hp[e] = Health.max[e] = 1e9;
		fight(session, input, 60);
		return 20 - (Position.x[e] ?? 0);
	};
	const plain = walked(0);
	expect(plain).toBeGreaterThan(0);
	expect(walked(-0.5) / plain).toBeCloseTo(0.5, 1);
});

test("pickupRadius pulls a pile that was out of reach, and xpGain raises the XP it gives", () => {
	const collect = (mods: readonly Modifier[]) => {
		const { session, input } = arena(mods);
		dropFragment(session.world, 3.4, 0, 10);
		for (let i = 0; i < 90; i++) session.step(input);
		return { gold: session.progress.gold, xp: session.progress.xp + session.progress.level * 1000 };
	};
	expect(heroData.base.pickupRadius).toBeLessThan(3.4);
	expect(collect([]).gold).toBe(0);
	const wide = collect([add("pickup_range", 0.5)]);
	expect(wide.gold).toBeCloseTo(10 * roundsData.fragments.goldPerFragment);

	const xpOf = (mods: readonly Modifier[]): number => {
		const { session, input } = arena([add("pickup_range", 1), ...mods]);
		dropFragment(session.world, 1, 0, 4);
		for (let i = 0; i < 30; i++) session.step(input);
		return session.progress.xp;
	};
	expect(xpOf([add("xp_gain", 0.5)])).toBeCloseTo(xpOf([]) * 1.5, 5);
});

test("harvest pays extra fragments when the round ends", () => {
	const goldAfterRound = (mods: readonly Modifier[]): number => {
		const { session } = arena(mods);
		session.run.forceEnd(session.world);
		return session.progress.gold;
	};
	expect(goldAfterRound([add("harvest", 4)])).toBeGreaterThan(goldAfterRound([]));
});

test("shopPrice, luck and freeRerolls shape the shop", () => {
	const shopOf = (mods: readonly Modifier[]) => {
		const { session, input } = arena(mods);
		// Higher tiers only appear from later rounds, where luck has something to shift.
		session.run.setRound(20);
		session.run.forceEnd(session.world);
		while (session.run.state !== "Shop") session.step(input);
		session.step(input);
		session.progress.gold = 1e9;
		return session;
	};
	const cheap = shopOf([]);
	const dear = shopOf([add("shop_price", 0.5)]);
	const prices = (s: GameSession): number[] => s.shop.slots.map((slot) => slot.price);
	expect(prices(dear).reduce((a, b) => a + b, 0)).toBeGreaterThan(prices(cheap).reduce((a, b) => a + b, 0));

	const tierSum = (s: GameSession): number => {
		let sum = 0;
		for (let i = 0; i < 80; i++) {
			s.shop.reroll();
			sum += s.shop.view().slots.reduce((acc, slot) => acc + slot.tier, 0);
		}
		return sum;
	};
	expect(tierSum(shopOf([add("luck", 100)]))).toBeGreaterThan(tierSum(shopOf([])));

	const free = shopOf([add("free_rerolls", 2)]);
	const gold = free.progress.gold;
	free.shop.reroll();
	free.shop.reroll();
	expect(free.progress.gold).toBe(gold);
	free.shop.reroll();
	expect(free.progress.gold).toBeLessThan(gold);
});
