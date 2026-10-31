import { expect, test } from "vitest";
import { describeEffect, describeModifier, describeStats } from "./describe";
import { createPlayerStats } from "./stats";

test("describeModifier scales percent stats and signs the value", () => {
	expect(describeModifier({ stat: "damage", op: "add", value: 0.05 })).toEqual({
		key: "modifier.add",
		params: { sign: "+", value: 5, unit: "%", stat: { key: "stat.damage" } },
	});
	expect(describeModifier({ stat: "armor", op: "add", value: -2 })).toEqual({
		key: "modifier.add",
		params: { sign: "−", value: 2, unit: "", stat: { key: "stat.armor" } },
	});
	expect(describeModifier({ stat: "speed", op: "mul", value: 1.1 })).toEqual({
		key: "modifier.mul",
		params: { stat: { key: "stat.speed" }, value: 1.1 },
	});
});

test("describeStats lists the eleven shop lines", () => {
	const lines = describeStats(createPlayerStats());
	expect(lines).toHaveLength(11);
	expect(lines.find((l) => l.key === "statLine.damage")?.percent).toBe(true);
	expect(lines.find((l) => l.key === "statLine.armor")?.percent).toBe(false);
});

test("describeEffect turns fractions into percentages and drops booleans", () => {
	expect(describeEffect("x", { fraction: 0.15, count: 3, tag: "a", flag: true })).toEqual({
		key: "effect.x",
		params: { fraction: 15, count: 3, tag: "a" },
	});
	expect(describeEffect("y")).toEqual({ key: "effect.y", params: {} });
});
