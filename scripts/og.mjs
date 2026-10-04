// Renders the Open Graph card (static/og.png, 1200×630): HYVERNO spelled by ink entities on paper,
// sampled from the same baked glyph path the hero uses. Run: node scripts/og.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const glyphs = JSON.parse(readFileSync(join(root, 'src/lib/gen/glyphs.json'), 'utf8'));
const mono = 'data:font/woff2;base64,' + readFileSync(join(root, 'node_modules/@fontsource-variable/martian-mono/files/martian-mono-latin-wdth-normal.woff2')).toString('base64');

const html = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Martian'; src: url('${mono}') format('woff2'); font-weight: 100 800; font-stretch: 75% 112.5%; }
html, body { margin: 0; width: 1200px; height: 630px; background: #ece9e1; overflow: hidden; }
canvas { display: block; }
</style></head><body><canvas id="c" width="1200" height="630"></canvas>
<script>
const G = ${JSON.stringify(glyphs.HYVERNO_W125)};
const W = 1200, H = 630;
const c = document.getElementById('c');
const x = c.getContext('2d');
let seed = 1445;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// world grid: 7px "+" every 64px
x.fillStyle = '#ece9e1'; x.fillRect(0, 0, W, H);
x.strokeStyle = '#d2cec3'; x.lineWidth = 1;
for (let gx = 32; gx < W; gx += 64) for (let gy = 32; gy < H; gy += 64) {
	x.beginPath(); x.moveTo(gx - 3.5, gy + .5); x.lineTo(gx + 3.5, gy + .5); x.moveTo(gx + .5, gy - 3.5); x.lineTo(gx + .5, gy + 3.5); x.stroke();
}
// viewport frame + ruler ticks
x.strokeRect(12.5, 12.5, W - 25, H - 25);
for (let t = 12 + 64; t < W - 12; t += 64) { x.beginPath(); x.moveTo(t + .5, 12); x.lineTo(t + .5, 18); x.stroke(); }
for (let t = 12 + 64; t < H - 12; t += 64) { x.beginPath(); x.moveTo(12, t + .5); x.lineTo(18, t + .5); x.stroke(); }

// sample the glyph path into a mask
const [bx, by, bw, bh] = G.bbox;
const targetW = 1010, s = targetW / bw, ox = (W - targetW) / 2, oy = 228;
const m = document.createElement('canvas'); m.width = W; m.height = H;
const mx = m.getContext('2d');
mx.setTransform(s, 0, 0, s, ox - bx * s, oy - by * s);
mx.fill(new Path2D(G.d));
const mask = mx.getImageData(0, 0, W, H).data;
const inside = (px, py) => px >= 0 && py >= 0 && px < W && py < H && mask[((py | 0) * W + (px | 0)) * 4 + 3] > 128;

const dot = (px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); };
const dart = (px, py, a, col) => {
	x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = col;
	x.beginPath(); x.moveTo(4.2, 0); x.lineTo(-3, 2.6); x.lineTo(-1.6, 0); x.lineTo(-3, -2.6); x.closePath(); x.fill(); x.restore();
};

// entities holding the name (jittered grid)
const step = 5.2;
for (let py = oy - 4; py < oy + bh * s + 4; py += step) for (let px = ox - 4; px < ox + targetW + 4; px += step) {
	const jx = px + (rand() - .5) * 2.4, jy = py + (rand() - .5) * 2.4;
	if (inside(jx, jy)) dot(jx, jy, 1.55, '#111110');
}
// free-roaming crowd around it, darts where they move fast
for (let i = 0; i < 1500; i++) {
	const px = 24 + rand() * (W - 48), py = 24 + rand() * (H - 48);
	if (inside(px, py)) continue;
	// text blocks are colliders: the crowd walks around the copy, never over it
	if (py > H - 108 || (py < 72 && (px < 250 || px > W - 130)) || (px > 830 && px < 1004 && py > 404 && py < 544)) continue;
	const nearName = py > oy - 40 && py < oy + bh * s + 40;
	if (!nearName && rand() < .55) continue;
	const a = Math.sin(px * .006) * 1.4 + Math.cos(py * .008) * 1.2;
	if (rand() < .35) dart(px, py, a, '#111110'); else dot(px, py, 1.3, '#111110');
}
// a selected squad + RTS marquee in signal
const sx = 842, sy = 440, sw = 150, sh = 92;
x.fillStyle = 'rgba(255,74,28,.06)'; x.fillRect(sx, sy, sw, sh);
x.setLineDash([5, 4]); x.strokeStyle = '#ff4a1c'; x.lineWidth = 1.5; x.strokeRect(sx + .5, sy + .5, sw, sh); x.setLineDash([]);
for (let i = 0; i < 46; i++) dart(sx + 10 + rand() * (sw - 20), sy + 10 + rand() * (sh - 20), -.5 + rand() * .4, '#ff4a1c');

document.fonts.load('450 13px Martian').catch(() => {}).then(() => {
	x.fillStyle = '#111110';
	x.font = '500 15px Martian'; x.textBaseline = 'alphabetic';
	x.fillText('HYVERNO /SIM v3.0', 36, 52);
	x.textAlign = 'right'; x.fillText('EN / FR', W - 36, 52);
	x.textAlign = 'left';
	x.font = '600 22px Martian';
	x.fillText('GAMEPLAY PROGRAMMER & TECHNICAL ARTIST', 36, H - 72);
	x.font = '400 14px Martian'; x.fillStyle = '#5f5e58';
	x.fillText('3 SHIPPED GAMES · GPU CROWDS · SIDE QUESTS · LAB', 36, H - 44);
	x.textAlign = 'right'; x.fillStyle = '#111110';
	x.fillText('16,384 ENT · 60 FPS · 1.8 / 16.6 MS', W - 36, H - 44);
	x.fillStyle = '#b8310d'; x.font = '500 13px Martian';
	x.fillText('46 UNITS SELECTED', sx + sw, sy - 10);
	document.body.dataset.ready = '1';
});
</script></body></html>`;

const tmp = join(root, 'scripts', '.og.html');
writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
page.on('console', (m) => console.log('CONSOLE', m.text()));
await page.goto(pathToFileURL(tmp).href);
await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 });
await page.screenshot({ path: join(root, 'static', 'og.png') });
await browser.close();
rmSync(tmp);
console.log('wrote static/og.png');
