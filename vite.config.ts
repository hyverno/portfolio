import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Every page is prerendered; 404.html is the SPA shell that renders +error.svelte.
			adapter: adapter({ fallback: '404.html' }),
			prerender: {
				entries: ['*', '/fr']
			}
		})
	],
	build: {
		// three.js and the GL modules are split out and imported after first paint.
		chunkSizeWarningLimit: 800
	}
});
