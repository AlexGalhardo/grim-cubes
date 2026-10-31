/** A message to translate later: the game describes things with keys and parameters, the UI turns them into text. */
export interface Described {
	key: string;
	params?: Params;
}

export type ParamValue = string | number | Described;
export type Params = Readonly<Record<string, ParamValue>>;
export type Messages = Readonly<Record<string, string>>;

export interface I18n {
	registerLocale(locale: string, messages: Messages): void;
	/** Switches the active locale; returns false (and keeps the current one) when it was never registered. */
	setLocale(locale: string): boolean;
	readonly locale: string;
	readonly locales: readonly string[];
	/** Message for `key` with `{name}` placeholders filled. Falls back to the default locale, then to the key. */
	t(key: string, params?: Params): string;
	/** Locale-aware number: at most `maxFraction` digits, no trailing zeros ("0,05" in pt-BR, "0.05" in en). */
	formatNumber(value: number, maxFraction?: number): string;
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;
const isDescribed = (value: ParamValue): value is Described => typeof value === "object";

export function createI18n(defaultLocale: string): I18n {
	const catalogs = new Map<string, Messages>();
	let current = defaultLocale;
	let numberFormat = new Intl.NumberFormat(defaultLocale, { maximumFractionDigits: 2, useGrouping: false });

	const api: I18n = {
		registerLocale(locale, messages): void {
			catalogs.set(locale, messages);
		},
		setLocale(locale): boolean {
			if (!catalogs.has(locale)) return false;
			current = locale;
			numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false });
			return true;
		},
		get locale(): string {
			return current;
		},
		get locales(): readonly string[] {
			return [...catalogs.keys()];
		},
		formatNumber(value, maxFraction = 2): string {
			return maxFraction === 2
				? numberFormat.format(value)
				: new Intl.NumberFormat(current, {
						maximumFractionDigits: maxFraction,
						useGrouping: false,
					}).format(value);
		},
		t(key, params): string {
			const template = catalogs.get(current)?.[key] ?? catalogs.get(defaultLocale)?.[key] ?? key;
			if (!params) return template;
			return template.replace(PLACEHOLDER, (whole, name: string) => {
				const value = params[name];
				if (value === undefined) return whole;
				if (typeof value === "number") return api.formatNumber(value);
				return isDescribed(value) ? api.t(value.key, value.params) : value;
			});
		},
	};
	return api;
}

/** The game-wide instance. `en` is the source language and the fallback; the app registers the catalogs at boot. */
export const i18n: I18n = createI18n("en");
export const t = (key: string, params?: Params): string => i18n.t(key, params);
