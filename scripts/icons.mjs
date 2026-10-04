// Renders static/apple-touch-icon.png (180×180) from the SVG favicon. Run: node scripts/icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Light variant only (no media query) and no rounded corners: iOS masks the icon itself.
const svg = readFileSync(join(root, 'src/lib/assets/favicon.svg'), 'utf8')
	.replace(/@media[^}]*}\s*}/, '')
	.replace(' rx="7"', '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(
	`<style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style>${svg}`
);
await page.screenshot({ path: join(root, 'static/apple-touch-icon.png') });
await browser.close();
console.log('wrote static/apple-touch-icon.png');
