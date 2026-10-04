import type { EntryGenerator } from './$types';

export const prerender = true;
export const trailingSlash = 'never';

// `/` (lang absent) and `/fr`.
export const entries: EntryGenerator = () => [{}, { lang: 'fr' }];
