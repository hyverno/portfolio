// Visitor-like scroll tour of the whole page: wheels down step by step (so pins, scrubs, claims and
// theme switches run exactly as for a person), logs the crowd's state at every step and takes a
// screenshot when entering each section and every `--every` steps. Starts its own dev server.
//
//   node scripts/tour.mjs --out shots/tour
//   node scripts/tour.mjs --path fr --width 375 --height 812 --out shots/tour-mobile
//   node scripts/tour.mjs --reduced --nowebgl --out shots/tour-static
//
// Options: --path, --width, --height, --step (wheel px, default 320), --pause (ms per step, 260),
// --every (screenshot every N steps, default 0 = section entries only), --max (steps cap, 400),
// --reduced, --nowebgl, --url, --out. Writes <out>-NNN-<section>.png and <out>-timeline.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
	const i = args.indexOf(`--${name}`);
	if (i === -1) return dflt;
	const v = args[i + 1];
	return v === undefined || v.startsWith('--') ? true : v;
};
const path =
	'/' +
	String(opt('path', '/'))
		.replace(/^[A-Za-z]:\/Program Files\/Git/i, '')
		.replace(/^\/+/, '');
const width = Number(opt('width', 1440));
const height = Number(opt('height', 900));
const step = Number(opt('step', 320));
const pause = Number(opt('pause', 260));
const every = Number(opt('every', 0));
const max = Number(opt('max', 400));
const reduced = opt('reduced', false) === true;
const nowebgl = opt('nowebgl', false) === true;
const out = String(opt('out', 'shots/tour'));
let base = opt('url', null);
mkdirSync(dirname(out) || '.', { recursive: true });

let server = null;
let viteCache = null;
if (!base) {
	const { createServer } = await import('vite');
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	server = await createServer({
		configFile: 'vite.config.ts',
		// Private dep cache per run: parallel runs never clobber each other's optimised deps.
		cacheDir: (viteCache = mkdtempSync(join(tmpdir(), 'hyv-vite-'))),
		logLevel: 'error',
		// No watcher / HMR: files edited mid-capture must not reload the page under the camera.
		server: { port: 0, strictPort: false, host: '127.0.0.1', hmr: false, watch: null }
	});
	await server.listen();
	base = `http://127.0.0.1:${server.httpServer.address().port}`;
}

const mobile = width < 768;
const browser = await chromium.launch({
	args: nowebgl
		? ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis']
		: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const context = await browser.newContext({
	viewport: { width, height },
	deviceScaleFactor: 1,
	reducedMotion: reduced ? 'reduce' : 'no-preference',
	hasTouch: mobile,
	isMobile: mobile
});
const page = await context.newPage();
const logs = [];
page.on('console', (m) => logs.push({ type: m.type(), text: m.text().slice(0, 2000) }));
page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e.stack || e).slice(0, 4000) }));

// Vite may reload once while it optimises dependencies on a cold start.
for (let attempt = 0; attempt < 3; attempt++) {
	await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
	await page.waitForTimeout(4500);
	const ok = await page.evaluate(() => document.querySelectorAll('[data-section]').length > 0);
	if (ok) break;
}

const probe = () =>
	page.evaluate(() => {
		const mid = innerHeight / 2;
		let section = '';
		for (const el of document.querySelectorAll('[data-section]')) {
			const r = el.getBoundingClientRect();
			if (r.top <= mid && r.bottom > mid) section = el.id;
		}
		const e = window.__hyv?.engine;
		const c = e?.crowd;
		return {
			y: Math.round(scrollY),
			section,
			theme: document.documentElement.dataset.theme ?? '',
			owner: c?.owner ?? null,
			blend: c?.blendState ? `${c.blendState.from}→${c.blendState.to}@${c.blendState.mix.toFixed(2)}` : '',
			alpha: c ? Number(c.alpha.toFixed(2)) : null,
			limit: Math.round(document.documentElement.scrollHeight - innerHeight)
		};
	});

const timeline = [];
const shots = [];
let last = '';
let stuck = 0;
for (let i = 0; i < max; i++) {
	const s = await probe();
	timeline.push(s);
	const entering = s.section !== last;
	if (entering || (every && i % every === 0)) {
		const f = `${out}-${String(i).padStart(3, '0')}-${s.section || 'none'}.png`;
		await page.screenshot({ path: f });
		shots.push(f);
	}
	last = s.section;
	if (mobile) await page.evaluate((d) => window.scrollBy(0, d), step);
	else await page.mouse.wheel(0, step);
	await page.waitForTimeout(pause);
	const after = await page.evaluate(() => Math.round(scrollY));
	stuck = after <= s.y + 1 ? stuck + 1 : 0;
	if (stuck >= 6) break; // bottom reached
}
// let the footer finish (despawn / completionist)
await page.waitForTimeout(1500);
const end = await probe();
timeline.push(end);
const f = `${out}-end-${end.section || 'none'}.png`;
await page.screenshot({ path: f });
shots.push(f);

const errors = logs.filter((l) => l.type === 'error' || l.type === 'pageerror');
writeFileSync(`${out}-timeline.json`, JSON.stringify({ path, width, height, reduced, nowebgl, timeline, errors, logs }, null, 2));
// Compact summary: one line per section with the states seen there.
const bySection = {};
for (const t of timeline) {
	const k = t.section || '(none)';
	(bySection[k] ??= new Set()).add(`${t.theme}|${t.owner ?? '-'}|${t.blend}|a${t.alpha}`);
}
console.log(
	JSON.stringify(
		{
			steps: timeline.length,
			finalY: end.y,
			limit: end.limit,
			errors: errors.length,
			firstErrors: errors.slice(0, 6),
			sections: Object.fromEntries(Object.entries(bySection).map(([k, v]) => [k, [...v].slice(0, 6)])),
			shots
		},
		null,
		1
	)
);
await browser.close();
if (server) await server.close();
if (viteCache) {
	const { rmSync } = await import('node:fs');
	try {
		rmSync(viteCache, { recursive: true, force: true });
	} catch {
		// a locked file in the temp dir is harmless
	}
}
process.exit(0);
