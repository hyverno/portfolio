// Reactive i18n (DESIGN.md §9.1). The route param is the single source of truth for the
// language: the layout calls `setLangFromRoute(page.params.lang)`; everything else reads
// `t()` / `i18n.lang` and re-renders. SSR-safe: no browser globals at module scope, and
// prerendering renders one route at a time, so the module-level state never leaks across pages.
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { tick } from 'svelte';
import { currentSectionId, scrollTo } from '#lib/core/scroll.svelte';
import { ScrollTrigger } from '#lib/core/motion';
import { DICTS } from './dicts';
import { formatDate, formatHudDate, formatNum } from './format';
import type { Dict, Lang } from './types';
import type { L } from '#lib/content/types';

export type { Dict, Lang, Rich } from './types';
export { LANGS } from './types';
export { NBSP, NNBSP } from './format';

export const i18n = $state<{ lang: Lang }>({ lang: 'en' });

/** The active dictionary. Reading it inside a template, `$derived` or `$effect` tracks the language. */
export function t(): Dict {
	return DICTS[i18n.lang];
}

/** Pick the active language from a content pair: `loc(game.role)`. */
export function loc(l: L): string {
	return l[i18n.lang];
}

export function otherLang(lang: Lang = i18n.lang): Lang {
	return lang === 'en' ? 'fr' : 'en';
}

/** `undefined` (the optional `[[lang=lang]]` segment absent) means English. Idempotent. */
export function setLangFromRoute(param: string | undefined): void {
	const next: Lang = param === 'fr' ? 'fr' : 'en';
	if (i18n.lang !== next) i18n.lang = next;
}

/**
 * Localise an app path. Accepts plain (`/projects/invokyr`) or already-prefixed (`/fr/...`)
 * paths and keeps `?query` / `#hash`: `langHref('/', 'fr')` → `/fr`,
 * `langHref('/fr/projects/invokyr', 'en')` → `/projects/invokyr`, `langHref('#lab', 'fr')` → `/fr#lab`.
 * Never a trailing slash (the site uses `trailingSlash: 'never'`).
 */
export function langHref(path: string, lang: Lang = i18n.lang): string {
	const cut = path.search(/[?#]/);
	const rawPath = cut === -1 ? path : path.slice(0, cut);
	const suffix = cut === -1 ? '' : path.slice(cut);

	let p = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
	p = p.replace(/^\/fr(?=\/|$)/, '').replace(/\/+$/, '') || '/';

	const out = lang === 'fr' ? (p === '/' ? '/fr' : `/fr${p}`) : p;
	return out + suffix;
}

/**
 * EN ↔ FR on the same page and the same section. The navigation itself runs the Ink Swarm
 * (or the 200ms fade) through the layout's `onNavigate`; we keep the scroll position during
 * the swap, then re-anchor to the section the reader was on, because French copy is longer
 * and pinned sections move.
 */
export async function switchLang(): Promise<void> {
	const sectionId = currentSectionId();
	const next = otherLang();
	await goto(langHref(page.url.pathname + page.url.search, next), { reset: false });
	setLangFromRoute(next === 'fr' ? 'fr' : undefined);
	await tick();
	ScrollTrigger.refresh();
	if (sectionId) scrollTo(`#${sectionId}`, { immediate: true });
}

/** Body-text date in the active language: `November 20, 2025` / `20 novembre 2025`. */
export function fmtDate(iso: string, precision: 'day' | 'month'): string {
	return formatDate(iso, precision, i18n.lang);
}

/** HUD date in the active language: `OCT 8 2026` / `8 OCT. 2026`. */
export function fmtHudDate(iso: string, precision: 'day' | 'month'): string {
	return formatHudDate(iso, precision, i18n.lang);
}

/** `16,384` / `16 384` (narrow no-break space); `decimals` fixes the fraction digits (`1.8` / `1,8`). */
export function fmtNum(n: number, decimals?: number): string {
	return formatNum(n, i18n.lang, decimals);
}
