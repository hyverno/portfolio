// Dev-only engine bench (§8 risk 1). Not prerendered; 404 in production builds.
import { error } from '@sveltejs/kit';

export const prerender = false;
export const ssr = false;

export function load() {
	if (!import.meta.env.DEV) error(404, 'Not found');
}
