import type { Locale } from "./types";

export function interpolate(
	template: string,
	vars: Record<string, string | number>,
): string {
	return template.replace(/\{(\w+)\}/g, (_, key) =>
		key in vars ? String(vars[key]) : `{${key}}`,
	);
}

export function getPluralForm(
	count: number,
	locale: Locale,
): "one" | "few" | "many" | "other" {
	if (locale === "ru") {
		const mod10 = count % 10;
		const mod100 = count % 100;
		if (mod10 === 1 && mod100 !== 11) return "one";
		if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
			return "few";
		return "many";
	}

	if (locale === "es") {
		return count === 1 ? "one" : "other";
	}

	// en
	return count === 1 ? "one" : "other";
}
