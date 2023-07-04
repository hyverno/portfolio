import type { RO_Sitemap } from 'sveltekit-sitemap';

export const sitemap = (<const>{
   "/": true,
   "/need-website/seo": false,
   "/need-website": true
}) satisfies RO_Sitemap

export type Sitemap = typeof sitemap
