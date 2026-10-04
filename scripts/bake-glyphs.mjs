// Bakes the crowd's glyph formations (§S1 "Glyph source") from the same Archivo variable font the
// DOM uses, so the dots land exactly where the <h1> twin would draw.
//
//   node scripts/bake-glyphs.mjs        (runs automatically as predev / prebuild)
//
// Output: src/lib/gen/glyphs.json
//   { [key]: { d, bbox: [x, y, w, h], advance, ascent, descent, unitsPerEm, text, wght, wdth } }
// Coordinates are font units in a y-down space: x = 0 at the pen origin, y = 0 on the baseline.
// `bbox` is the ink box of `d`; `advance` is the laid-out width (what the DOM box measures).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = resolve(
	root,
	'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'
);
const OUT = resolve(root, 'src/lib/gen/glyphs.json');

const JOBS = [
	{ key: 'HYVERNO_W125', text: 'HYVERNO', wght: 900, wdth: 125 },
	{ key: 'HYVERNO_W62', text: 'HYVERNO', wght: 900, wdth: 62 },
	{ key: '1445', text: '1,445', wght: 900, wdth: 62 }
];

/**
 * fontkit pre-decodes WOFF2 outlines and skips gvar for them (and `getVariation` drops the cmap of
 * a WOFF2 font), so variations are applied here: a fresh font per instance with its coordinates
 * set, and glyph decoding patched to run the variation processor on a copy of the points.
 */
function openInstance(settings) {
	const font = fontkit.openSync(FONT);
	font.variationCoords = font.fvar.axis.map((a) => {
		const tag = a.axisTag.trim();
		const v = settings[tag] ?? a.defaultValue;
		return Math.max(a.minValue, Math.min(a.maxValue, v));
	});
	const sample = font.getGlyph(font.glyphForCodePoint(72).id);
	const proto = Object.getPrototypeOf(sample);
	if (!proto.__hyvPatched) {
		const decode = proto._decode;
		proto._decode = function () {
			const g = decode.call(this);
			const vp = this._font._variationProcessor;
			if (!g || !vp) return g;
			if (this.__varied) return this.__varied;
			const out = { ...g };
			// Phantom points need the unvaried box; WOFF2Glyph._getCBox would recurse through `path`.
			const phantoms = () => {
				const xs = (g.points ?? []).map((p) => p.x);
				const ys = (g.points ?? []).map((p) => p.y);
				const box = xs.length
					? {
							minX: Math.min(...xs),
							minY: Math.min(...ys),
							maxX: Math.max(...xs),
							maxY: Math.max(...ys)
						}
					: { minX: 0, minY: 0, maxX: 0, maxY: 0 };
				this._getCBox = () => box;
				try {
					return this._getPhantomPoints(g);
				} finally {
					delete this._getCBox;
				}
			};
			if (g.numberOfContours >= 0) {
				const pts = g.points.map((p) => p.copy());
				const all = [...pts, ...phantoms()];
				vp.transformPoints(this.id, all);
				out.points = all.slice(0, pts.length);
				out.phantomPoints = all.slice(-4);
			} else {
				// Composite: only the component offsets carry deltas (their outlines vary on their own).
				out.components = g.components.map((c) => ({ ...c }));
				const offsets = out.components.map((c) => ({
					onCurve: true,
					endContour: true,
					x: c.dx,
					y: c.dy
				}));
				const all = [...offsets, ...phantoms()];
				vp.transformPoints(this.id, all);
				out.components.forEach((c, i) => {
					c.dx = all[i].x;
					c.dy = all[i].y;
				});
			}
			this.__varied = out;
			return out;
		};
		proto.__hyvPatched = true;
	}
	return font;
}

const r1 = (v) => Math.round(v * 10) / 10;

function bake({ text, wght, wdth }) {
	const font = openInstance({ wght, wdth });
	const run = font.layout(text);
	let pen = 0;
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const parts = [];
	run.glyphs.forEach((glyph, i) => {
		const pos = run.positions[i];
		const ox = pen + pos.xOffset;
		const oy = pos.yOffset;
		const X = (x) => r1(ox + x);
		const Y = (y) => r1(-(oy + y));
		for (const c of glyph.path.commands) {
			const a = c.args;
			switch (c.command) {
				case 'moveTo':
					parts.push(`M${X(a[0])} ${Y(a[1])}`);
					break;
				case 'lineTo':
					parts.push(`L${X(a[0])} ${Y(a[1])}`);
					break;
				case 'quadraticCurveTo':
					parts.push(`Q${X(a[0])} ${Y(a[1])} ${X(a[2])} ${Y(a[3])}`);
					break;
				case 'bezierCurveTo':
					parts.push(`C${X(a[0])} ${Y(a[1])} ${X(a[2])} ${Y(a[3])} ${X(a[4])} ${Y(a[5])}`);
					break;
				case 'closePath':
					parts.push('Z');
					break;
			}
		}
		const b = glyph.path.bbox;
		if (Number.isFinite(b.minX)) {
			minX = Math.min(minX, ox + b.minX);
			maxX = Math.max(maxX, ox + b.maxX);
			minY = Math.min(minY, -(oy + b.maxY));
			maxY = Math.max(maxY, -(oy + b.minY));
		}
		pen += pos.xAdvance;
	});
	return {
		text,
		wght,
		wdth,
		d: parts.join(''),
		bbox: [r1(minX), r1(minY), r1(maxX - minX), r1(maxY - minY)],
		advance: r1(pen),
		ascent: font.ascent,
		descent: font.descent,
		unitsPerEm: font.unitsPerEm
	};
}

const out = {};
for (const job of JOBS) out[job.key] = bake(job);

const json = JSON.stringify(out, null, '\t') + '\n';
mkdirSync(dirname(OUT), { recursive: true });
let previous = '';
try {
	previous = readFileSync(OUT, 'utf8');
} catch {
	// first run
}
if (previous !== json) writeFileSync(OUT, json);
console.log(
	`[bake-glyphs] ${Object.entries(out)
		.map(([k, v]) => `${k} ${v.bbox[2]}×${v.bbox[3]}`)
		.join(' · ')}${previous === json ? ' (unchanged)' : ''}`
);
