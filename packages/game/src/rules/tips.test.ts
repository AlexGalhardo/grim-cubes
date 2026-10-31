import { describe, expect, it } from "vitest";
import { createTips, MOVE_DONE_DISTANCE, TIP_TIMEOUT_MS, type TipsInput } from "./tips";

const base: TipsInput = {
	round: 1,
	state: "Round",
	heroX: 0,
	heroZ: 0,
	piles: 0,
	gold: 0,
	nowMs: 0,
	enabled: true,
};
const at = (patch: Partial<TipsInput>): TipsInput => ({ ...base, ...patch });

describe("tips", () => {
	it("walks move -> fragments -> shop", () => {
		const tips = createTips();
		expect(tips.update(at({ state: "RoundIntro" }))).toBe("move");
		expect(tips.update(at({ heroX: MOVE_DONE_DISTANCE, nowMs: 1000 }))).toBeNull();
		expect(tips.update(at({ piles: 2, nowMs: 2000 }))).toBe("fragments");
		expect(tips.update(at({ piles: 1, gold: 1, nowMs: 3000 }))).toBeNull();
		expect(tips.update(at({ state: "Shop", nowMs: 4000 }))).toBe("shop");
		expect(tips.update(at({ state: "RoundIntro", round: 2, nowMs: 5000 }))).toBeNull();
	});

	it("drops the move tip by itself after the timeout", () => {
		const tips = createTips();
		expect(tips.update(at({ nowMs: 0 }))).toBe("move");
		expect(tips.update(at({ nowMs: TIP_TIMEOUT_MS + 1 }))).toBeNull();
	});

	it("shows nothing when disabled or after round 1", () => {
		expect(createTips().update(at({ enabled: false }))).toBeNull();
		expect(createTips().update(at({ round: 2 }))).toBeNull();
	});

	it("starts over on a new run", () => {
		const tips = createTips();
		tips.update(at({}));
		tips.update(at({ round: 5, nowMs: 1000 }));
		expect(tips.update(at({ round: 1, nowMs: 2000 }))).toBe("move");
	});

	it("skips the fragments tip when the shop opens before any pile", () => {
		const tips = createTips();
		tips.update(at({ heroX: 5 }));
		expect(tips.update(at({ state: "Shop", nowMs: 1000 }))).toBe("shop");
	});
});
