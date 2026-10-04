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
//   --click     "x,y" click at viewport coords after load (repeatable via ;)
//   --keys      keys to press after load, e.g. "3" or "ArrowUp,ArrowUp,b,a"
//   --out       output prefix (default shots/shot); writes <out>-<i>.png and <out>-console.json
//   --url       use an already-running server instead of starting one (e.g. http://localhost:4173)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

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
const clicks = opt('click', null);
const keys = opt('keys', null);
const reduced = opt('reduced', false) === true;
const nowebgl = opt('nowebgl', false) === true;
const dark = opt('dark', false) === true;
let base = opt('url', null);

mkdirSync(dirname(out) || '.', { recursive: true });

let server = null;
if (!base) {
	const { createServer } = await import('vite');
	server = await createServer({
		configFile: 'vite.config.ts',
		logLevel: 'error',
		server: { port: 0, strictPort: false, host: '127.0.0.1' }
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

const t0 = Date.now();
try {
	await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
} catch (e) {
	logs.push({ type: 'goto-error', text: String(e) });
}
await page.waitForTimeout(wait);

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

const files = [];
let i = 0;
for (const s of scrolls) {
	if (s.startsWith('#')) {
		await page.evaluate((id) => document.querySelector(id)?.scrollIntoView({ block: 'start' }), s);
	} else {
		await page.evaluate((y) => window.scrollTo(0, y), Number(s));
	}
	// wheel nudge so smooth-scroll libraries and ScrollTrigger notice the jump
	await page.mouse.wheel(0, 1);
	await page.waitForTimeout(settle);
	const f = `${out}-${i++}.png`;
	await page.screenshot({ path: f });
	files.push(f);
}
if (selector) {
	await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), selector);
	await page.mouse.wheel(0, 1);
	await page.waitForTimeout(settle);
	const f = `${out}-${i++}.png`;
	await page.screenshot({ path: f });
	files.push(f);
}

const errors = logs.filter((l) => ['error', 'pageerror', 'goto-error', 'requestfailed'].includes(l.type));
writeFileSync(`${out}-console.json`, JSON.stringify({ path, ms: Date.now() - t0, evalResult, errors, logs }, null, 2));
console.log(JSON.stringify({ screenshots: files, errors: errors.length, evalResult, firstErrors: errors.slice(0, 8) }, null, 2));

await browser.close();
if (server) await server.close();
process.exit(0);
