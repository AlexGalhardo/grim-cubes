import { i18n, t } from "@gc/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { BossBar, BossIntro } from "./BossBar/BossBar";
import { Notice } from "./Notice/Notice";

beforeEach(() => {
	i18n.setLocale("en");
});

afterEach(() => {
	cleanup();
	i18n.setLocale("pt-BR");
});

const NOTICES = {
	newer: "newer version of the game",
	recovered: "the backup was restored",
	corrupt: "Save and backup unreadable",
	unavailable: "The browser blocked saving",
} as const;

test.each(Object.entries(NOTICES))("Notice %s renders in English", (notice, fragment) => {
	render(<Notice notice={notice as keyof typeof NOTICES} />);
	const text = screen.getByRole("alert").textContent ?? "";
	expect(text).toContain(fragment);
	expect(text).not.toContain("notice.");
});

test("BossBar and BossIntro show the English boss name", () => {
	const name = t("boss.gravedigger");
	expect(name).toBe("The Gravedigger");
	render(<BossBar boss={{ name, hp: 900, maxHp: 1200, phase: 0 }} />);
	expect(screen.getByRole("progressbar", { name: "The Gravedigger" })).toBeTruthy();
	render(<BossIntro name={name} />);
	expect(screen.getByRole("status").textContent).toBe("The Gravedigger");
});
