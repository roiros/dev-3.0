export type Locale = "en" | "ru" | "es";

export const ALL_LOCALES: Locale[] = ["en", "ru", "es"];

export const LOCALE_LABELS: Record<Locale, string> = {
	en: "English",
	ru: "Русский",
	es: "Español",
};
