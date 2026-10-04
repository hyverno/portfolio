// DEV-only test bench for the GL effects (A3b). Never prerendered, 404 in production builds.
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';

export const prerender = false;
export const ssr = false;

export function load() {
	if (!dev) error(404, 'Not found');
}
