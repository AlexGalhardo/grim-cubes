import { createInputState, createMetaState } from "@gc/core";
import { query } from "bitecs";
import { expect, test, vi } from "vitest";
import { consumablesData, roundsData } from "../data";
import { Breakable, Consumable, Fragment, Health, Position, PrevPosition, Radius } from "../ecs/components";
import { EventType } from "../ecs/events";
import { dropFragment } from "../ecs/fragments";
import { difficultyData } from "../rules/difficulty";
import { createGameSession, type GameSession } from "../session";
import { CONSUMABLE_KIND } from "./breakables";

const difficulty = difficultyData(roundsData.difficulties, "normal");

/** A session whose chunks around the hero are loaded and populated. */
function loaded(seed = 7): GameSession {
	const session = createGameSession({ seed, difficulty, meta: createMetaState() });
	const input = createInputState();
	session.run.newRun();
	for (let i = 0; i < 40; i++) {
		session.chunks.update(session.origin.x, session.origin.z);
		session.step(input);
		session.events.consume(() => undefined);
	}
	session.breakables.populate();
	return session;
}

const urns = (session: GameSession): number[] => [...query(session.world, [Breakable])];

function broken(session: GameSession): { x: number; z: number; index: number; type: number }[] {
	const out: { x: number; z: number; index: number; type: number }[] = [];
	session.events.consume((type, a, b, c, entity) => {
		if (type === EventType.PropBroken) out.push({ x: a, z: b, index: c, type: entity });
	});
	return out;
}

test("loaded chunks give their breakable props entities with the HP and radius of the data", () => {
	const session = loaded();
	const list = urns(session);
	expect(list.length).toBeGreaterThan(0);
	for (const e of list) {
		expect(Health.hp[e]).toBeGreaterThanOrEqual(12);
		expect(Radius.r[e]).toBeGreaterThan(0.2);
	}
});

test("a broken prop emits PropBroken, is remembered by its chunk and does not come back on a repopulate", () => {
	const session = loaded();
	const before = urns(session).length;
	const e = urns(session)[0] as number;
	const x = Position.x[e] ?? 0;
	const z = Position.z[e] ?? 0;
	const cx = Breakable.cx[e] ?? 0;
	const cz = Breakable.cz[e] ?? 0;
	const index = Breakable.index[e] ?? 0;
	session.damage.queue.push(e, 1000, 0, 0, 0, 0);
	session.damage.run(session.world);
	session.breakables.run();
	const events = broken(session);
	expect(events).toHaveLength(1);
	expect(events[0]).toMatchObject({ x, z, index });
	expect(urns(session)).toHaveLength(before - 1);
	const chunk = session.chunks.get(cx, cz);
	expect(chunk && (chunk.broken >> index) & 1).toBe(1);
	// The chunk is populated again (as after a reload that kept its memory): the broken one is skipped.
	if (chunk) chunk.populated = false;
	session.breakables.populate();
	expect(
		urns(session).filter(
			(u) => Breakable.cx[u] === cx && Breakable.cz[u] === cz && Breakable.index[u] === index,
		),
	).toHaveLength(0);
});

test("a breakable blocks the hero's path like a prop until it breaks", () => {
	const session = loaded();
	const e = urns(session)[0] as number;
	const r = Radius.r[e] ?? 0;
	const x = Position.x[e] ?? 0;
	const z = Position.z[e] ?? 0;
	expect(session.propCollision.overlaps(session.origin, x, z, 0.1)).toBe(true);
	session.damage.queue.push(e, 1000, 0, 0, 0, 0);
	session.damage.run(session.world);
	session.breakables.run();
	expect(session.propCollision.overlaps(session.origin, x + r * 0.2, z, 0.05)).toBe(false);
});

test("the chunk leaving the window takes its breakable entities with it", () => {
	const session = loaded();
	const total = urns(session).length;
	// Walk far away: the first chunks unload and their entities go.
	Position.x[session.hero] = 400;
	PrevPosition.x[session.hero] = 400;
	for (let i = 0; i < 60; i++) {
		session.chunks.update(session.origin.x + 400, session.origin.z);
		session.breakables.populate();
	}
	const near = urns(session).filter((u) => Math.abs((Position.x[u] ?? 0) - 400) > 150);
	expect(near).toHaveLength(0);
	expect(total).toBeGreaterThan(0);
});

test("the sword breaks a breakable inside its arc while it hits an enemy", () => {
	const session = loaded();
	const e = urns(session)[0] as number;
	const hx = Position.x[session.hero] ?? 0;
	const hz = Position.z[session.hero] ?? 0;
	Position.x[e] = PrevPosition.x[e] = hx + 1;
	Position.z[e] = PrevPosition.z[e] = hz;
	Health.hp[e] = 1;
	const enemy = session.spawn.spawnEnemy(session.world, 0, hx + 0.9, hz + 0.2);
	Health.hp[enemy] = Health.max[enemy] = 1e6;
	let breaks = 0;
	for (let i = 0; i < 120 && breaks === 0; i++) {
		session.separation.run(session.world);
		session.breakables.insertInto(session.separation.hash);
		session.targeting.run(session.world, session.hero, session.weapon.range);
		session.weapon.run(session.world, session.hero);
		session.damage.run(session.world);
		session.breakables.run();
		breaks += broken(session).length;
	}
	expect(breaks).toBe(1);
});

test("drops follow the data: a blood vial heals 20% of max HP and a bone magnet pulls the fragments", () => {
	const session = loaded();
	const original = consumablesData.dropChance.breakable;
	consumablesData.dropChance.breakable = 1;
	try {
		for (const kind of [CONSUMABLE_KIND.bloodVial, CONSUMABLE_KIND.boneMagnet]) {
			const e = urns(session)[0] as number;
			session.damage.queue.push(e, 1000, 0, 0, 0, 0);
			session.damage.run(session.world);
			session.breakables.run();
			const drops = [...query(session.world, [Consumable])];
			expect(drops.length).toBeGreaterThan(0);
			const drop = drops.at(-1) as number;
			Consumable.kind[drop] = kind;
			Position.x[drop] = Position.x[session.hero] ?? 0;
			Position.z[drop] = Position.z[session.hero] ?? 0;
			Health.max[session.hero] = 100;
			Health.hp[session.hero] = 50;
			dropFragment(
				session.world,
				(Position.x[session.hero] ?? 0) + 30,
				Position.z[session.hero] ?? 0,
				1,
			);
			const pile = [...query(session.world, [Fragment])].at(-1) as number;
			const startX = Position.x[pile] ?? 0;
			session.breakables.collect(session.hero);
			session.pickup.run(session.world, session.hero);
			if (kind === CONSUMABLE_KIND.bloodVial) {
				expect(Health.hp[session.hero]).toBeCloseTo(70);
				expect(Position.x[pile]).toBe(startX);
			} else {
				// 30 u away is far outside the pickup radius, yet the magnet moves the pile.
				expect(Position.x[pile]).toBeLessThan(startX);
			}
			session.events.consume(() => undefined);
		}
	} finally {
		consumablesData.dropChance.breakable = original;
	}
});

test("an elite's death can drop a consumable with the elite chance from the data", () => {
	const session = loaded();
	const original = consumablesData.dropChance.elite;
	consumablesData.dropChance.elite = 1;
	try {
		const before = [...query(session.world, [Consumable])].length;
		session.breakables.dropFrom(5, 5, "elite");
		expect([...query(session.world, [Consumable])]).toHaveLength(before + 1);
		consumablesData.dropChance.elite = 0;
		session.breakables.dropFrom(5, 5, "elite");
		expect([...query(session.world, [Consumable])]).toHaveLength(before + 1);
	} finally {
		consumablesData.dropChance.elite = original;
	}
});

test("a projectile breaks an urn it flies into", () => {
	const session = loaded();
	const e = urns(session)[0] as number;
	const x = Position.x[e] ?? 0;
	const z = Position.z[e] ?? 0;
	Health.hp[e] = 1;
	const p = session.projectiles.acquire({
		x: x - 0.5,
		z,
		vx: 20,
		vz: 0,
		damage: 10,
		critChance: 0,
		knockback: 0,
		pierce: 0,
		lifeSteps: 30,
		radius: 0.3,
		explosionRadius: 0,
		selfFraction: 0,
	});
	expect(p).toBeGreaterThanOrEqual(0);
	broken(session);
	let breaks = 0;
	for (let i = 0; i < 10 && breaks === 0; i++) {
		session.separation.run(session.world);
		session.breakables.insertInto(session.separation.hash);
		session.projectileSystem.run(session.world);
		session.damage.run(session.world);
		session.breakables.run();
		breaks += broken(session).length;
	}
	expect(breaks).toBe(1);
});

test("an enemy that walks into an urn is pushed out of it and does not cross it", () => {
	const session = loaded();
	const e = urns(session)[0] as number;
	const x = Position.x[e] ?? 0;
	const z = Position.z[e] ?? 0;
	const r = Radius.r[e] ?? 0;
	const enemy = session.spawn.spawnEnemy(session.world, 0, x + r * 0.3, z);
	Health.hp[enemy] = Health.max[enemy] = 1e6;
	const enemyRadius = Radius.r[enemy] ?? 0;
	for (let i = 0; i < 20; i++) {
		session.propCollision.resolveEnemies(session.world, session.origin);
		session.separation.run(session.world);
	}
	const gap = Math.hypot((Position.x[enemy] ?? 0) - x, (Position.z[enemy] ?? 0) - z);
	expect(gap).toBeGreaterThanOrEqual(r + enemyRadius - 0.05);
	expect(Health.hp[e]).toBeGreaterThan(0);
});

test("the breakable system allocates nothing per step once warm", () => {
	const session = loaded();
	const step = (): void => {
		session.breakables.populate();
		session.breakables.insertInto(session.separation.hash);
		session.breakables.run();
		session.breakables.collect(session.hero);
	};
	step();
	const spies = [
		vi.spyOn(Array.prototype, "filter"),
		vi.spyOn(Array.prototype, "map"),
		vi.spyOn(Array.prototype, "slice"),
		vi.spyOn(globalThis, "Array"),
		vi.spyOn(globalThis, "Float32Array"),
		vi.spyOn(globalThis, "Map"),
		vi.spyOn(globalThis, "Set"),
	];
	for (let i = 0; i < 100; i++) step();
	const calls = spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
	for (const spy of spies) spy.mockRestore();
	expect(calls).toBe(0);
});

test("killing elites drops consumables at about the elite chance from the data", () => {
	const session = loaded(11);
	const kills = 60;
	let dropped = 0;
	session.events.consume(() => undefined);
	for (let i = 0; i < kills; i++) {
		const elite = session.elite.spawnNow(session.world, 8, 8, 0);
		session.damage.queue.push(elite, 1e9, 0, 0, 0, 0);
		session.damage.run(session.world);
		session.death.run(session.world);
		session.events.consume((type) => {
			if (type === EventType.ConsumableDropped) dropped++;
		});
	}
	const chance = consumablesData.dropChance.elite;
	expect(chance).toBeGreaterThan(0);
	expect(dropped).toBeGreaterThan(kills * chance * 0.5);
	expect(dropped).toBeLessThan(kills * chance * 1.5);
});
