import type { Handle } from '@sveltejs/kit/hooks';

// <html lang> per route in the prerendered output (`/fr` and `/fr/...` → fr).
export const handle: Handle = ({ event, resolve }) => {
	const lang = /^\/fr(\/|$)/.test(event.url.pathname) ? 'fr' : 'en';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
