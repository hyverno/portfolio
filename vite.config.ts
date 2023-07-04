import { sveltekit } from '@sveltejs/kit/vite';
import { sitemapPlugin } from 'sveltekit-sitemap/dist/plugin.js';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), sitemapPlugin({routesDir: "./src/routes", sitemapFile: "./src/sitemap.ts"})]
});
