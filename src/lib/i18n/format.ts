// Pure, language-explicit formatters (no runes). `index.svelte.ts` wraps them with the active
// language; `content/status.ts` and server code call them directly.
import type { Lang } from './types';

/** U+202F, the French thousands separator and the space before ; ! ? % and inside « ». */
export const NNBSP = ' ';
/** U+00A0, the French space before a colon. */
export const NBSP = ' ';

const LOCALE: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR' };

const numCache = new Map<number, Intl.NumberFormat>();

/**
 * Locale grouping that is identical on every engine (ICU versions disagree on the French
 * separator), so prerendered HTML and hydrated counters never differ:
 * EN `16,384` · `1.8` — FR `16 384` (narrow no-break space) · `1,8`.
 */
export function formatNum(n: number, lang: Lang, decimals?: number): string {
	const key = decimals ?? -1;
	let f = numCache.get(key);
	if (!f) {
		f = new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals ?? 0,
			maximumFractionDigits: decimals ?? 2
		});
		numCache.set(key, f);
	}
	const s = f.format(n);
	return lang === 'en' ? s : s.replace(/[,.]/g, (c) => (c === ',' ? NNBSP : ','));
}

/** `YYYY-MM-DD` or `YYYY-MM` → UTC midnight. Content dates are calendar dates, not instants. */
export function parseIsoDate(iso: string): Date {
	const [y, m = 1, d = 1] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

const dateCache = new Map<string, Intl.DateTimeFormat>();
function dateFormat(lang: Lang, opts: Intl.DateTimeFormatOptions, tag: string) {
	const key = `${lang}:${tag}`;
	let f = dateCache.get(key);
	if (!f) {
		f = new Intl.DateTimeFormat(LOCALE[lang], { ...opts, timeZone: 'UTC' });
		dateCache.set(key, f);
	}
	return f;
}

/** Body-text date: EN `November 20, 2025` / `November 2025`, FR `20 novembre 2025` / `novembre 2025`. */
export function formatDate(iso: string, precision: 'day' | 'month', lang: Lang): string {
	const opts: Intl.DateTimeFormatOptions =
		precision === 'day'
			? { day: 'numeric', month: 'long', year: 'numeric' }
			: { month: 'long', year: 'numeric' };
	return dateFormat(lang, opts, precision).format(parseIsoDate(iso));
}

/** HUD date, caps, no commas: EN `OCT 8 2026` / `NOV 2025`, FR `8 OCT. 2026` / `NOV. 2025`. */
export function formatHudDate(iso: string, precision: 'day' | 'month', lang: Lang): string {
	const parts = dateFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }, 'hud')
		.formatToParts(parseIsoDate(iso))
		.reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
	const month = parts.month.toLocaleUpperCase(LOCALE[lang]);
	if (precision === 'month') return `${month} ${parts.year}`;
	return lang === 'fr'
		? `${parts.day} ${month} ${parts.year}`
		: `${month} ${parts.day} ${parts.year}`;
}
