import { describe, expect, it } from "vitest";
import { createI18n } from "./i18n";

function setup() {
	const i18n = createI18n("en");
	i18n.registerLocale("en", {
		hello: "Hello {name}",
		only: "Only English",
		stat: "{value} {unit}",
		unit: "pts",
	});
	i18n.registerLocale("pt-BR", { hello: "Olá {name}", stat: "{value} {unit}", unit: "pts" });
	return i18n;
}

describe("i18n", () => {
	it("fills placeholders", () => {
		expect(setup().t("hello", { name: "Ana" })).toBe("Hello Ana");
	});

	it("switches locale and falls back to the default locale, then to the key", () => {
		const i18n = setup();
		expect(i18n.setLocale("pt-BR")).toBe(true);
		expect(i18n.t("hello", { name: "Ana" })).toBe("Olá Ana");
		expect(i18n.t("only")).toBe("Only English");
		expect(i18n.t("missing.key")).toBe("missing.key");
	});

	it("refuses an unregistered locale", () => {
		const i18n = setup();
		expect(i18n.setLocale("fr")).toBe(false);
		expect(i18n.locale).toBe("en");
	});

	it("formats numbers per locale and trims trailing zeros", () => {
		const i18n = setup();
		expect(i18n.formatNumber(0.05)).toBe("0.05");
		i18n.setLocale("pt-BR");
		expect(i18n.formatNumber(0.05)).toBe("0,05");
		expect(i18n.formatNumber(2)).toBe("2");
	});

	it("translates nested described params", () => {
		const i18n = setup();
		expect(i18n.t("stat", { value: 1.5, unit: { key: "unit" } })).toBe("1.5 pts");
	});

	it("keeps unknown placeholders visible", () => {
		expect(setup().t("hello", {})).toBe("Hello {name}");
	});
});
