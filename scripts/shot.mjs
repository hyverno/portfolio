// Self-contained visual check: starts its own Vite dev server on a free port, opens headless
// Chromium, captures screenshots at scroll positions and collects console errors, then exits.
//
//   node scripts/shot.mjs --path / --scroll 0,900,2400 --out shots/hero
//   node scripts/shot.mjs --path /fr --width 375 --height 812 --reduced --out shots/mobile
//   node scripts/shot.mjs --path / --selector "#lab" --wait 4000 --out shots/lab
//   node scripts/shot.mjs --path /dev/crowd --eval "window.__crowd?.N" --out shots/dev
//
// Options:
//   --path      route to open (default /)
//   --scroll    comma-separated scrollY values (px) or "#id" anchors; one screenshot per entry (default 0)
//   --selector  scroll this element into view before the shot (one extra screenshot)
//   --width/--height  viewport (default 1440x900)
//   --wait      ms to wait after load before the first shot (default 3500, the preloader needs time)
//   --settle    ms to wait after each scroll (default 1200)
//   --reduced   emulate prefers-reduced-motion: reduce
//   --nowebgl   disable WebGL (tests the static build)
//   --dark      emulate prefers-color-scheme: dark
//   --eval      JS expression evaluated after load; its JSON result is printed
//   --evalAfter JS expression evaluated after the last screenshot (state at the final scroll)
//   --click     "x,y" click at viewport coords after load (repeatable via ;)
//   --keys      keys to press after load, e.g. "3" or "ArrowUp,ArrowUp,b,a"
//   --out       output prefix (default shots/shot); writes <out>-<i>.png and <out>-console.json
//   --url       use an already-running server instead of starting one (e.g. http://localhost:4173)
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

// Git Bash rewrites "/fr" into "C:/Program Files/Git/fr"; undo that and accept "fr" too.
const path =
	'/' +
	String(opt('path', '/'))
		.replace(/^[A-Za-z]:\/Program Files\/Git/i, '')
		.replace(/^\/+/, '');
const scrolls = String(opt('scroll', '0')).split(',').filter(Boolean);
const width = Number(opt('width', 1440));
const height = Number(opt('height', 900));
const wait = Number(opt('wait', 3500));
const settle = Number(opt('settle', 1200));
const out = String(opt('out', 'shots/shot'));
const selector = opt('selector', null);
const evalExpr = opt('eval', null);
const evalAfterExpr = opt('evalAfter', null);
const clicks = opt('click', null);
const keys = opt('keys', null);
const reduced = opt('reduced', false) === true;
const nowebgl = opt('nowebgl', false) === true;
const dark = opt('dark', false) === true;
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
	const addr = server.httpServer.address();
	base = `http://127.0.0.1:${addr.port}`;
}

const browser = await chromium.launch({
	args: nowebgl
		? ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis']
		: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const context = await browser.newContext({
	viewport: { width, height },
	deviceScaleFactor: 1,
	reducedMotion: reduced ? 'reduce' : 'no-preference',
	colorScheme: dark ? 'dark' : 'light',
	hasTouch: width < 768,
	isMobile: width < 768
});
const page = await context.newPage();
const logs = [];
page.on('console', (m) => logs.push({ type: m.type(), text: m.text().slice(0, 2000) }));
page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e.stack || e).slice(0, 4000) }));
page.on('requestfailed', (r) => logs.push({ type: 'requestfailed', text: `${r.url()} ${r.failure()?.errorText}` }));

// A cold dep cache makes Vite reload the page once or twice while it optimises: count main-frame
// navigations and only start once the page has stayed put for the whole wait.
let navigations = 0;
page.on('framenavigated', (f) => {
	if (f === page.mainFrame()) navigations++;
});

const t0 = Date.now();
try {
	await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
} catch (e) {
	logs.push({ type: 'goto-error', text: String(e) });
}
for (let attempt = 0; attempt < 4; attempt++) {
	const before = navigations;
	await page.waitForTimeout(wait);
	if (navigations === before) break;
	await page.waitForLoadState('load').catch(() => {});
	// errors logged by the discarded page are noise
	logs.length = 0;
}

if (clicks) {
	for (const c of String(clicks).split(';')) {
		const [x, y] = c.split(',').map(Number);
		await page.mouse.click(x, y);
		await page.waitForTimeout(250);
	}
}
if (keys) {
	for (const k of String(keys).split(',')) {
		await page.keyboard.press(k);
		await page.waitForTimeout(120);
	}
	await page.waitForTimeout(600);
}

let evalResult;
if (evalExpr) {
	try {
		evalResult = await page.evaluate(`(async () => (${evalExpr}))()`);
	} catch (e) {
		evalResult = `EVAL ERROR: ${e}`;
	}
}

// Scrolls through the app's own scrollTo (Lenis-aware, dev only) when present, else natively.
async function scrollPage(target) {
	const usedApp = await page.evaluate((t) => {
		const fn = window.__hyvScrollTo;
		if (fn) {
			fn(t, { immediate: true });
			return true;
		}
		if (typeof t === 'number') window.scrollTo(0, t);
		else document.querySelector(t)?.scrollIntoView({ block: 'start' });
		return false;
	}, target);
	// Without the app hook, nudge so smooth-scroll libraries and ScrollTrigger notice the jump.
	if (!usedApp) await page.mouse.wheel(0, 1);
}

const files = [];
let i = 0;
for (const s of scrolls) {
	await scrollPage(s.startsWith('#') ? s : Number(s));
	await page.waitForTimeout(settle);
	const f = `${out}-${i++}.png`;
	await page.screenshot({ path: f });
	files.push(f);
}
if (selector) {
	await scrollPage(String(selector));
	await page.waitForTimeout(settle);
	const f = `${out}-${i++}.png`;
	await page.screenshot({ path: f });
	files.push(f);
}

let evalAfter;
if (evalAfterExpr) {
	try {
		evalAfter = await page.evaluate(`(async () => (${evalAfterExpr}))()`);
	} catch (e) {
		evalAfter = `EVAL ERROR: ${e}`;
	}
}

const errors = logs.filter((l) => ['error', 'pageerror', 'goto-error', 'requestfailed'].includes(l.type));
writeFileSync(`${out}-console.json`, JSON.stringify({ path, ms: Date.now() - t0, evalResult, errors, logs }, null, 2));
console.log(JSON.stringify({ screenshots: files, errors: errors.length, evalResult, evalAfter, firstErrors: errors.slice(0, 8) }, null, 2));

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
