// Canonical origin for absolute URLs (hreflang alternates, canonical, OG).
export const SITE_ORIGIN = 'https://hyverno.com';

/** Strips the `/fr` prefix: '/fr/projects/x' → '/projects/x', '/fr' → '/'. */
export function basePath(pathname: string): string {
	return pathname.replace(/^\/fr(?=\/|$)/, '').replace(/\/+$/, '') || '/';
}

/** Absolute URL of `pathname` in `lang` (no trailing slash except the root). */
export function absoluteUrl(pathname: string, lang: 'en' | 'fr'): string {
	const base = basePath(pathname);
	return SITE_ORIGIN + (lang === 'fr' ? (base === '/' ? '/fr' : `/fr${base}`) : base);
}
