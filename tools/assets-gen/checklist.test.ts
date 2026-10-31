import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildChecklist, CHECKLIST_ITEMS, renderChecklist } from "./checklist";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

describe("art bible §14 checklist", () => {
	const rows = buildChecklist(`${ROOT}assets/src`, `${ROOT}data`, `${ROOT}docs/art/review`);

	it("covers every model with one answer per item and leaves the in-game capture open", () => {
		expect(rows.length).toBeGreaterThan(70);
		for (const row of rows) {
			expect(row.items).toHaveLength(CHECKLIST_ITEMS.length);
			expect(row.items[10]).toBe(false);
		}
	});

	it("marks audio and the static models' groups and clips as not applicable", () => {
		const prop = rows.find((r) => r.category === "props");
		expect(prop?.items[6]).toBeNull();
		expect(prop?.items[7]).toBeNull();
		expect(rows.every((r) => r.items[11] === null)).toBe(true);
	});

	it("passes the hero on the statically checkable items and renders a markdown row for it", () => {
		const hero = rows.find((r) => r.name === "hero");
		expect(hero?.items.slice(0, 10).every((v) => v === true)).toBe(true);
		expect(renderChecklist(rows, "2026-10-31")).toContain("| `hero/hero` |");
	});
});
