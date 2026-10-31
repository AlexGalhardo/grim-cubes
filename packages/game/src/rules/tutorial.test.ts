import { describe, expect, it } from "vitest";
import { createTutorial, TUTORIAL_MOVE_DISTANCE, TUTORIAL_MS, type TutorialInput } from "./tutorial";

const base: TutorialInput = {
	round: 1,
	state: "Round",
	heroX: 0,
	heroZ: 0,
	kills: 0,
	gold: 0,
	nowMs: 1000,
	enabled: true,
};
const at = (patch: Partial<TutorialInput>): TutorialInput => ({ ...base, ...patch });

describe("tutorial", () => {
	it("goes move -> kill -> collect -> done", () => {
		const t = createTutorial();
		expect(t.update(at({}))).toBe("tutorialMove");
		expect(t.update(at({ heroX: TUTORIAL_MOVE_DISTANCE, nowMs: 2000 }))).toBe("tutorialKill");
		expect(t.update(at({ heroX: 5, kills: 1, nowMs: 3000 }))).toBe("tutorialCollect");
		expect(t.update(at({ heroX: 5, kills: 1, gold: 1, nowMs: 4000 }))).toBeNull();
		expect(t.update(at({ heroX: 9, kills: 3, gold: 3, nowMs: 5000 }))).toBeNull();
	});

	it("can advance several steps in one update", () => {
		const t = createTutorial();
		t.update(at({}));
		expect(t.update(at({ heroX: 4, kills: 1, nowMs: 2000 }))).toBe("tutorialCollect");
	});

	it("ends by itself after 20 seconds", () => {
		const t = createTutorial();
		expect(t.update(at({}))).toBe("tutorialMove");
		expect(t.update(at({ nowMs: 1000 + TUTORIAL_MS }))).toBeNull();
		expect(t.update(at({ heroX: 9, nowMs: 1000 + TUTORIAL_MS + 1 }))).toBeNull();
	});

	it("waits for the round to start and ignores other rounds or a disabled tutorial", () => {
		expect(createTutorial().update(at({ state: "RoundIntro" }))).toBeNull();
		expect(createTutorial().update(at({ round: 2 }))).toBeNull();
		expect(createTutorial().update(at({ enabled: false }))).toBeNull();
	});

	it("keeps the current step on screen through a pause", () => {
		const t = createTutorial();
		t.update(at({}));
		expect(t.update(at({ state: "Paused", nowMs: 3000 }))).toBe("tutorialMove");
	});

	it("does not count the time spent paused", () => {
		const t = createTutorial();
		t.update(at({}));
		t.update(at({ state: "Paused", nowMs: 2000 }));
		expect(t.update(at({ nowMs: 1000 + TUTORIAL_MS }))).toBe("tutorialMove");
		expect(t.update(at({ nowMs: 1000 + 2 * TUTORIAL_MS }))).toBeNull();
		expect(t.done).toBe(true);
	});
});
