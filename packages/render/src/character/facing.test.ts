import { describe, expect, it } from "vitest";
import { desiredYaw, turnTowards, wrapAngle } from "./facing";

const at = { x: 0, z: 0, vx: 0, vz: 0 };

describe("desiredYaw", () => {
	it("looks at the target even while moving the other way", () => {
		expect(desiredYaw({ ...at, vx: -5, target: { x: 4, z: 0 } })).toBeCloseTo(Math.PI / 2);
	});

	it("follows the movement without a target", () => {
		expect(desiredYaw({ ...at, vz: -3 })).toBeCloseTo(Math.PI);
	});

	it("keeps the last yaw when standing still without a target", () => {
		expect(desiredYaw(at)).toBeNull();
		expect(desiredYaw({ ...at, vx: 0.01 })).toBeNull();
	});

	it("falls back to the movement when the target sits on the hero", () => {
		expect(desiredYaw({ ...at, vx: 2, target: { x: 0, z: 0 } })).toBeCloseTo(Math.PI / 2);
	});
});

describe("turnTowards", () => {
	it("goes the short way across the +-PI seam", () => {
		const next = turnTowards(Math.PI - 0.1, -Math.PI + 0.1, 0.08, 0.08);
		const moved = wrapAngle(next - (Math.PI - 0.1));
		expect(moved).toBeGreaterThan(0);
		expect(moved).toBeLessThan(0.2);
	});

	it("covers about 63% of the angle in one time constant and settles", () => {
		expect(turnTowards(0, 1, 0.08, 0.08)).toBeCloseTo(1 - Math.exp(-1), 5);
		let yaw = 0;
		for (let i = 0; i < 30; i++) yaw = turnTowards(yaw, 1, 1 / 60, 0.08);
		expect(yaw).toBeCloseTo(1, 2);
	});

	it("does not move when time is frozen and snaps when tau is zero", () => {
		expect(turnTowards(0.5, 2, 0, 0.08)).toBe(0.5);
		expect(turnTowards(0.5, 2, 0.1, 0)).toBe(2);
	});
});

describe("wrapAngle", () => {
	it("keeps angles inside (-PI, PI]", () => {
		expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
		expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
		expect(wrapAngle(0.3)).toBeCloseTo(0.3);
	});
});
