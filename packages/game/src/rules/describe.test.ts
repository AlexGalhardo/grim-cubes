import { readFileSync } from "node:fs";
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

test("describeEffect shows chances and fractions as clean percentages", () => {
	expect(describeEffect("double_fragment_chance", { chance: 0.15 }).params).toEqual({ chance: 15 });
	expect(describeEffect("bonus_damage_vs_elites", { value: 0.25 }).params).toEqual({ value: 25 });
	expect(describeEffect("extra_pierce", { value: 1 }).params).toEqual({ value: 1 });
	expect(describeEffect("x", { fraction: 0.07 }).params).toEqual({ fraction: 7 });
});

test("every effect of the items and the Ossuary has a text in both languages", () => {
	const ids = new Set<string>();
	const walk = (node: unknown): void => {
		if (Array.isArray(node)) node.forEach(walk);
		else if (node && typeof node === "object") {
			for (const [key, value] of Object.entries(node)) {
				if (key === "effects" && Array.isArray(value)) {
					for (const effect of value) ids.add((effect as { id: string }).id);
				} else walk(value);
			}
		}
	};
	for (const file of ["items", "ossuary"]) walk(JSON.parse(readFileSync(`data/${file}.json`, "utf8")));
	for (const locale of ["pt-BR", "en"]) {
		const texts = JSON.parse(readFileSync(`locales/${locale}.json`, "utf8")) as Record<string, string>;
		const missing = [...ids].filter((id) => !(`effect.${id}` in texts));
		expect(missing, locale).toEqual([]);
	}
});
