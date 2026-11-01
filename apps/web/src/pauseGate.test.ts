import { expect, test } from "vitest";
import { canOpenPause, type PauseGate } from "./pauseGate";

const playing: PauseGate = {
	pauseOpen: false,
	menuOpen: false,
	runState: "Round",
	levelUpOffer: false,
	chestOffer: false,
	screenOpen: false,
};

test("pausing is allowed in a fight, a boss round, an intro and the walk to the Merchant", () => {
	for (const runState of ["Round", "BossRound", "RoundIntro", "BossIntro", "RoundOutro", "MerchantWait"])
		expect(canOpenPause({ ...playing, runState }), runState).toBe(true);
});

test("it is not allowed on the title, in a screen, a card offer, the shop, or once the run is over", () => {
	expect(canOpenPause({ ...playing, menuOpen: true })).toBe(false);
	expect(canOpenPause({ ...playing, pauseOpen: true })).toBe(false);
	expect(canOpenPause({ ...playing, screenOpen: true })).toBe(false);
	expect(canOpenPause({ ...playing, levelUpOffer: true, runState: "Paused" })).toBe(false);
	expect(canOpenPause({ ...playing, chestOffer: true })).toBe(false);
	for (const runState of ["Idle", "Results", "Dying", "Shop"])
		expect(canOpenPause({ ...playing, runState })).toBe(false);
});

test("the Esc right after choosing a card pauses: the gate reads the game, which no longer has an offer, not the dialog still waiting for its HUD publish", () => {
	const afterChoosing: PauseGate = { ...playing, levelUpOffer: false, runState: "Round" };
	expect(canOpenPause(afterChoosing)).toBe(true);
});
