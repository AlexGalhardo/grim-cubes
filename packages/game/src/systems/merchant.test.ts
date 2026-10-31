import { createInputState, createMetaState } from "@gc/core";
import { query, removeEntity } from "bitecs";
import { expect, test } from "vitest";
import { roundsData } from "../data";
import { EnemyFaction, Health, Position, Speed } from "../ecs/components";
import { EventType } from "../ecs/events";
import { difficultyData } from "../rules/difficulty";
import { createGameSession, type GameSession } from "../session";

const difficulty = difficultyData(roundsData.difficulties, "normal");
const { merchant: config, flow } = roundsData;

/** A round with no horde but the given enemy spots, ended at once; steps until the Merchant is waiting. */
function afterRound(enemyAt: readonly (readonly [number, number])[], autoShop = false) {
	const session = createGameSession({ seed: 11, difficulty, meta: createMetaState(), autoShop });
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
	for (const [x, z] of enemyAt) {
		const e = session.spawn.spawnEnemy(session.world, 0, x, z);
		Speed.value[e] = 0;
	}
	session.run.forceEnd(session.world);
	return { session, input };
}

function stepUntil(
	session: GameSession,
	input: ReturnType<typeof createInputState>,
	state: string,
	limit = 5000,
): number {
	let n = 0;
	while (session.run.state !== state && n++ < limit) session.step(input);
	return n;
}

test("he arrives 6 u from the hero on the side opposite the horde, with an event, and starts arriving", () => {
	const { session, input } = afterRound([
		[10, 0],
		[6, 4],
	]);
	const seen: number[][] = [];
	stepUntil(session, input, "MerchantWait");
	session.events.consume((type, a, b, c) => {
		if (type === EventType.MerchantArrived) seen.push([a, b, c]);
	});
	const m = session.merchant.view;
	expect(m?.state).toBe("arriving");
	expect(
		Math.hypot(
			(m?.x ?? 0) - (Position.x[session.hero] ?? 0),
			(m?.z ?? 0) - (Position.z[session.hero] ?? 0),
		),
	).toBeCloseTo(config.distance);
	// Enemies sat at +x: he is at -x.
	expect(m?.x ?? 0).toBeLessThan(-3);
	expect(seen).toHaveLength(1);
	expect(seen[0]?.[0]).toBeCloseTo(m?.x ?? 0);
	expect(seen[0]?.[2]).toBe(flow.merchantWaitSeconds);
	for (let i = 0; i < config.arriveSeconds * 60 + 2; i++) session.step(input);
	expect(session.merchant.view?.state).toBe("waiting");
});

test("with no enemies he appears ahead of the hero", () => {
	const { session, input } = afterRound([]);
	stepUntil(session, input, "MerchantWait");
	const m = session.merchant.view;
	expect(m).not.toBeNull();
	expect(session.merchant.distance()).toBeCloseTo(config.distance);
});

test("the hero walks free, the shop opens within the open radius and the Merchant leaves when it closes", () => {
	const { session, input } = afterRound([[10, 0]]);
	stepUntil(session, input, "MerchantWait");
	for (let i = 0; i < 70; i++) session.step(input);
	const start = Position.x[session.hero] ?? 0;
	// He is at -x: walk left.
	input.moveX = -1;
	let opened = -1;
	for (let i = 0; i < 600 && opened < 0; i++) {
		session.step(input);
		if (session.run.state === "Shop") opened = i;
	}
	expect(opened).toBeGreaterThan(0);
	expect(Position.x[session.hero] ?? 0).toBeLessThan(start - 3);
	expect(session.merchant.distance()).toBeLessThanOrEqual(config.openRadius + 0.2);
	expect(session.shop.slots.length).toBeGreaterThan(0);
	input.moveX = 0;
	session.run.closeShop();
	session.step(input);
	expect(session.merchant.view?.state).toBe("leaving");
	for (let i = 0; i < config.leaveSeconds * 60 + 2; i++) session.step(input);
	expect(session.merchant.view).toBeNull();
});

test("talking works only near a waiting Merchant, and the shop opens by itself after the wait", () => {
	const { session, input } = afterRound([[10, 0]]);
	stepUntil(session, input, "MerchantWait");
	expect(session.merchant.talk()).toBe(false);
	for (let i = 0; i < 70; i++) session.step(input);
	// 6 u away is outside the talk radius.
	expect(session.merchant.talk()).toBe(false);
	input.moveX = -1;
	while (session.merchant.distance() > config.talkRadius - 0.2) session.step(input);
	expect(session.run.state).toBe("MerchantWait");
	expect(session.merchant.talk()).toBe(true);
	expect(session.run.state).toBe("Shop");

	const idle = afterRound([[10, 0]]);
	stepUntil(idle.session, idle.input, "MerchantWait");
	const waited = stepUntil(idle.session, idle.input, "Shop");
	expect(waited).toBeGreaterThanOrEqual(flow.merchantWaitSeconds * 60 - 2);
	expect(waited).toBeLessThanOrEqual(flow.merchantWaitSeconds * 60 + 2);
});

test("with autoShop the shop opens at once and the Merchant never shows up", () => {
	const { session, input } = afterRound([[10, 0]], true);
	stepUntil(session, input, "Shop");
	session.step(input);
	expect(session.merchant.view).toBeNull();
	expect(session.shop.slots.length).toBeGreaterThan(0);
});

test("his spot moves with the world origin", () => {
	const { session, input } = afterRound([[10, 0]]);
	stepUntil(session, input, "MerchantWait");
	const before = { x: session.merchant.view?.x ?? 0, z: session.merchant.view?.z ?? 0 };
	session.merchant.shift(5, -3);
	expect(session.merchant.view?.x).toBeCloseTo(before.x - 5);
	expect(session.merchant.view?.z).toBeCloseTo(before.z + 3);
});
