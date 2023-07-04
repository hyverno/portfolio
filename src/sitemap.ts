import type { RO_Sitemap } from 'sveltekit-sitemap';

export const sitemap = (<const>{
   "/": true,
   "/need-website/seo": true,
   "/need-website": false
}) satisfies RO_Sitemap

export type Sitemap = typeof sitemap
