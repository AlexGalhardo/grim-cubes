import { i18n } from "@gc/core";
import en from "../../../locales/en.json" with { type: "json" };
import ptBR from "../../../locales/pt-BR.json" with { type: "json" };

/** The shipped UI language until the options screen offers a choice (`?lang=en` switches it for a session). */
const DEFAULT_LOCALE = "pt-BR";

/** Registers both catalogs, picks the locale and keeps `<html lang>` in sync. Call once at boot. */
export function initLocale(search: string = location.search): string {
	i18n.registerLocale("en", en);
	i18n.registerLocale("pt-BR", ptBR);
	const wanted = new URLSearchParams(search).get("lang");
	i18n.setLocale(wanted !== null && i18n.setLocale(wanted) ? wanted : DEFAULT_LOCALE);
	document.documentElement.lang = i18n.locale;
	return i18n.locale;
}
