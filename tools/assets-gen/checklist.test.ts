import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildChecklist, CHECKLIST_ITEMS, renderChecklist } from "./checklist";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

describe("art bible §14 checklist", () => {
	const rows = buildChecklist(`${ROOT}assets/src`, `${ROOT}data`, `${ROOT}docs/art/review`);

	it("covers every model with one answer per item", () => {
		expect(rows.length).toBeGreaterThan(70);
		for (const row of rows) {
			expect(row.items).toHaveLength(CHECKLIST_ITEMS.length);
		}
	});

	it("marks audio and the static models' groups and clips as not applicable", () => {
		const prop = rows.find((r) => r.category === "props");
		expect(prop?.items[6]).toBeNull();
		expect(prop?.items[7]).toBeNull();
		expect(rows.every((r) => r.items[11] === null)).toBe(true);
	});

	it("judges a variant like its base model", () => {
		const variant = rows.find((r) => r.folder === "variants" && r.name === "wail_02");
		expect(variant?.category).toBe("enemies");
		expect(variant?.items.slice(0, 10).every((v) => v === true)).toBe(true);
	});

	it("passes the hero on the statically checkable items and renders a markdown row for it", () => {
		const hero = rows.find((r) => r.name === "hero");
		expect(hero?.items.slice(0, 10).every((v) => v === true)).toBe(true);
		expect(renderChecklist(rows, "2026-10-31")).toContain("| `hero/hero` |");
	});

	it("asks for both in-game captures (1080p and 800x360) before item 11 passes", () => {
		const dir = mkdtempSync(join(tmpdir(), "ingame-"));
		try {
			mkdirSync(join(dir, "ingame"), { recursive: true });
			const check = (): boolean | null | undefined =>
				buildChecklist(`${ROOT}assets/src`, `${ROOT}data`, dir).find((r) => r.name === "hero")
					?.items[10];
			expect(check()).toBe(false);
			writeFileSync(join(dir, "ingame", "hero-1080.png"), "x");
			expect(check()).toBe(false);
			writeFileSync(join(dir, "ingame", "hero-800x360.png"), "x");
			expect(check()).toBe(true);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
