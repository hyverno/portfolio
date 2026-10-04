// Formation bakers (§S2 "Formations"). Every baker returns exactly N slots in region-normalised
// space (x, y in [-1, 1] of the region, y up). Spare slots roam (weight 0) but ambient is capped at
// 25% of N; anything beyond the cap becomes a loose weight-0.3 halo around the shape, so a
// formation never floods the copy with free entities. Then the slots are Hilbert-sorted.
//
// Bakers are generators: they yield every few thousand iterations and the BakeQueue runs them in
// 4ms idle slices, so a re-bake never drops a frame.
import type { BakeCtx, BakeResult, FormationSource } from '../types';
import { hilbertOrder, permute } from './hilbert';

/** Engine-internal sources ('spawn' and 'fill' are not part of the public union). */
export type InternalSource = FormationSource | { kind: 'spawn' } | { kind: 'fill' };

export interface BakeInput {
	id: string;
	src: InternalSource;
	N: number;
	/** Region size, CSS px. */
	w: number;
	h: number;
	/** Viewport size, CSS px (caps glyph height, spreads the roaming crowd). */
	vw: number;
	vh: number;
	/** Horizontal centre of the viewport in region-normalised x (0 when the region is centred). */
	cx: number;
	el: HTMLElement;
}

export interface Baked {
	/** N × (x, y, z, weight), Hilbert-sorted: index = entity id. */
	targets: Float32Array;
	paint?: Uint8Array;
	paintAlt?: Uint8Array;
	/** N × (pathIndex + 1, phase, speed, lateral); pathIndex + 1 = 0 means "not on a path". */
	flow?: Float32Array;
	/** 64 × rows × (x, y, closed, 0). */
	paths?: { data: Float32Array; rows: number };
	/** name → entity id (after sorting). */
	named: Record<string, number>;
	/** order[entity] = slot index in the baker's own order (used to permute later paint updates). */
	order: Uint32Array;
	/** Spawn only: per-entity spawn rank in [0, 1) (outward along the golden spiral). */
	rank?: Float32Array;
	ms: number;
}

export const AMBIENT_CAP = 0.25;
export const PATH_SAMPLES = 64;
const HALO_WEIGHT = 0.3;
const GOLDEN_ANGLE = 2.399963229728653;

type Step = Generator<void, void, void>;

// ── utilities ──────────────────────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function hashString(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** Yields roughly every `every` calls, so loops stay sliceable without timing each iteration. */
function ticker(every = 2048) {
	let n = 0;
	return () => ++n % every === 0;
}

function parseHex(hex: string): [number, number, number] {
	const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Points sampled inside a raster mask: a jittered grid sized to land close to `count`. */
interface Mask {
	data: Uint8Array;
	w: number;
	h: number;
	filled: Uint32Array;
}

function* rasterMask(w: number, h: number, draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void): Generator<void, Mask> {
	const cw = Math.max(1, Math.ceil(w));
	const ch = Math.max(1, Math.ceil(h));
	const canvas: OffscreenCanvas | HTMLCanvasElement =
		typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, ch) : Object.assign(document.createElement('canvas'), { width: cw, height: ch });
	const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	ctx.clearRect(0, 0, cw, ch);
	ctx.fillStyle = '#000';
	draw(ctx);
	yield;
	const img = ctx.getImageData(0, 0, cw, ch).data;
	yield;
	const data = new Uint8Array(cw * ch);
	let count = 0;
	const tick = ticker(16384);
	for (let i = 0; i < data.length; i++) {
		if (img[i * 4 + 3] > 127) {
			data[i] = 1;
			count++;
		}
		if (tick()) yield;
	}
	const filled = new Uint32Array(count);
	for (let i = 0, k = 0; i < data.length; i++) if (data[i]) filled[k++] = i;
	return { data, w: cw, h: ch, filled };
}

/**
 * `count` points (canvas px) inside the mask on a jittered grid, topped up / thinned to exactly
 * `count`. A half-cell jitter keeps the even pitch of a halftone without its moiré.
 */
function* sampleMask(mask: Mask, count: number, rand: () => number, jitter = 0.55): Generator<void, Float32Array> {
	const out = new Float32Array(count * 2);
	if (mask.filled.length === 0 || count === 0) return out;
	const at = (x: number, y: number) => {
		const xi = x | 0;
		const yi = y | 0;
		return xi >= 0 && yi >= 0 && xi < mask.w && yi < mask.h && mask.data[yi * mask.w + xi] === 1;
	};
	let g = Math.sqrt(mask.filled.length / count);
	let pts: number[] = [];
	const tick = ticker();
	for (let attempt = 0; attempt < 2; attempt++) {
		pts = [];
		for (let y = g * 0.5; y < mask.h; y += g) {
			for (let x = g * 0.5; x < mask.w; x += g) {
				const px = x + (rand() - 0.5) * g * jitter;
				const py = y + (rand() - 0.5) * g * jitter;
				if (at(px, py)) pts.push(px, py);
				if (tick()) yield;
			}
		}
		const got = pts.length / 2;
		if (got >= count * 0.97 && got <= count * 1.08) break;
		g *= Math.sqrt(Math.max(1, got) / count);
	}
	let n = pts.length / 2;
	// Thin: random removal keeps the blue-noise character.
	while (n > count) {
		const i = (rand() * n) | 0;
		n--;
		pts[i * 2] = pts[n * 2];
		pts[i * 2 + 1] = pts[n * 2 + 1];
	}
	for (let i = 0; i < n; i++) {
		out[i * 2] = pts[i * 2];
		out[i * 2 + 1] = pts[i * 2 + 1];
	}
	// Top up with random filled pixels, sub-pixel jittered.
	for (let i = n; i < count; i++) {
		const p = mask.filled[(rand() * mask.filled.length) | 0];
		out[i * 2] = (p % mask.w) + rand();
		out[i * 2 + 1] = Math.floor(p / mask.w) + rand();
	}
	return out;
}

// ── slot assembly ──────────────────────────────────────────────────────────────────────────

interface Slots {
	targets: Float32Array;
	paint?: Uint8Array;
	paintAlt?: Uint8Array;
	flow?: Float32Array;
	paths?: { data: Float32Array; rows: number };
	named: Record<string, number>;
	rank?: Float32Array;
}

/**
 * Completes a shape of `used` slots to exactly N: up to 25% ambient (weight 0, homes from
 * `ambientHome`), the rest a weight-0.3 halo around random shape slots.
 */
function* complete(s: Slots, used: number, N: number, rand: () => number, ambientHome: (out: [number, number]) => void): Step {
	const t = s.targets;
	const spare = N - used;
	const ambient = Math.min(spare, Math.floor(N * AMBIENT_CAP));
	const home: [number, number] = [0, 0];
	const tick = ticker();
	for (let i = used; i < N; i++) {
		const o = i * 4;
		if (i < used + ambient || used === 0) {
			ambientHome(home);
			t[o] = home[0];
			t[o + 1] = home[1];
			t[o + 2] = 0;
			t[o + 3] = 0;
		} else {
			const src = ((rand() * used) | 0) * 4;
			// Box-Muller: a soft cloud hugging the shape.
			const r = Math.sqrt(-2 * Math.log(Math.max(1e-6, rand()))) * 0.12;
			const a = rand() * Math.PI * 2;
			t[o] = t[src] + Math.cos(a) * r;
			t[o + 1] = t[src + 1] + Math.sin(a) * r;
			t[o + 2] = t[src + 2];
			t[o + 3] = HALO_WEIGHT;
		}
		if (tick()) yield;
	}
}

/**
 * Homes for the roaming share: a sprinkle over the viewport around the region (in
 * region-normalised units) that thins out toward the edges, so a formation reads as a crisp shape
 * inside a living field rather than a smudge, and the HUD corners stay clear. `reject` keeps
 * homes off the shape itself.
 */
function viewportHome(inp: BakeInput, rand: () => number, reject?: (nx: number, ny: number) => boolean) {
	const ex = Math.max(1.15, (0.96 * inp.vw) / Math.max(1, inp.w));
	const ey = Math.max(1.15, (0.94 * inp.vh) / Math.max(1, inp.h));
	return (out: [number, number]) => {
		for (let tries = 0; tries < 32; tries++) {
			const u = rand() * 2 - 1;
			const v = rand() * 2 - 1;
			// Soft vignette: ~1 at the centre, ~0.25 at the edge midpoints, ~0.06 in the corners.
			if (rand() > Math.exp(-1.4 * (u * u + v * v))) continue;
			out[0] = inp.cx + u * ex;
			out[1] = v * ey;
			if (!reject?.(out[0], out[1])) return;
		}
	};
}

/** A jittered grid over [-1, 1]² with square cells in px (fill / ambient). */
function* jitterGrid(t: Float32Array, N: number, w: number, h: number, weight: number, rand: () => number, jitter: number): Step {
	const aspect = Math.max(1e-3, w / Math.max(1, h));
	const cols = Math.max(1, Math.round(Math.sqrt(N * aspect)));
	const rows = Math.ceil(N / cols);
	const tick = ticker();
	for (let i = 0; i < N; i++) {
		const cx = i % cols;
		const cy = (i / cols) | 0;
		const o = i * 4;
		t[o] = ((cx + 0.5 + (rand() - 0.5) * jitter) / cols) * 2 - 1;
		t[o + 1] = ((cy + 0.5 + (rand() - 0.5) * jitter) / rows) * 2 - 1;
		t[o + 2] = 0;
		t[o + 3] = weight;
		if (tick()) yield;
	}
}

// ── glyphs ─────────────────────────────────────────────────────────────────────────────────

interface GlyphData {
	d: string;
	bbox: [number, number, number, number];
}

// Generated at predev / prebuild. A glob keeps the build alive if the file is ever missing.
const GLYPH_FILES = import.meta.glob<Record<string, GlyphData>>('../../gen/glyphs.json', { eager: true, import: 'default' });
const GLYPHS: Record<string, GlyphData> = Object.values(GLYPH_FILES)[0] ?? {};

const GLYPH_FALLBACK: Record<string, { text: string; stretch: string }> = {
	HYVERNO_W125: { text: 'HYVERNO', stretch: 'expanded' },
	HYVERNO_W62: { text: 'HYVERNO', stretch: 'extra-condensed' },
	'1445': { text: '1,445', stretch: 'extra-condensed' }
};

function* bakeGlyphs(src: Extract<FormationSource, { kind: 'glyphs' }>, inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const { N, w, h } = inp;
	const t = new Float32Array(N * 4);
	const used = Math.round(Math.min(1, Math.max(0.75, src.fill ?? 0.75)) * N);
	const glyph = GLYPHS[src.key];

	// Box of the ink in its own units: fitted to the region width, height capped to the viewport.
	let bx = 0;
	let by = 0;
	let bw = 1;
	let bh = 1;
	let fallback: { text: string; stretch: string; ascent: number } | null = null;
	if (glyph) [bx, by, bw, bh] = glyph.bbox;
	else {
		const fb = GLYPH_FALLBACK[src.key] ?? { text: src.key, stretch: 'normal' };
		const probe = new OffscreenCanvas(8, 8).getContext('2d')!;
		probe.font = `900 100px "Archivo Variable", "Archivo", sans-serif`;
		(probe as unknown as { fontStretch: string }).fontStretch = fb.stretch;
		const m = probe.measureText(fb.text);
		bw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
		bh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
		bx = -m.actualBoundingBoxLeft;
		by = -m.actualBoundingBoxAscent;
		fallback = { ...fb, ascent: m.actualBoundingBoxAscent };
	}
	const scale = Math.min(w / bw, (0.85 * inp.vh) / bh);
	const gw = bw * scale;
	const gh = bh * scale;
	// Raster resolution: enough pixels for crisp edges, bounded for very large regions.
	const res = Math.min(2, Math.max(0.5, Math.sqrt(400_000 / Math.max(1, gw * gh))));
	const k = scale * res;

	const mask = yield* rasterMask(gw * res, gh * res, (ctx) => {
		if (glyph) {
			ctx.setTransform(k, 0, 0, k, -bx * k, -by * k);
			ctx.fill(new Path2D(glyph.d));
		} else if (fallback) {
			ctx.setTransform(k, 0, 0, k, -bx * k, -by * k);
			ctx.font = `900 100px "Archivo Variable", "Archivo", sans-serif`;
			(ctx as unknown as { fontStretch: string }).fontStretch = fallback.stretch;
			ctx.fillText(fallback.text, 0, 0);
		}
	});

	// Canvas px → region-normalised: the glyph box is centred in the region.
	const ox = (w - gw) / 2;
	const oy = (h - gh) / 2;
	const toN = (cx: number, cy: number, out: Float32Array, o: number) => {
		out[o] = ((ox + cx / res) / Math.max(1, w)) * 2 - 1;
		out[o + 1] = 1 - ((oy + cy / res) / Math.max(1, h)) * 2;
	};

	const pts = yield* sampleMask(mask, used, rand);
	for (let i = 0; i < used; i++) {
		toN(pts[i * 2], pts[i * 2 + 1], t, i * 4);
		t[i * 4 + 2] = 0;
		t[i * 4 + 3] = 1;
	}

	// Ambient homes around (never on) the letters, so free entities do not muddy the type.
	const inside = (nx: number, ny: number) => {
		const px = (((nx + 1) / 2) * w - ox) * res;
		const py = (((1 - ny) / 2) * h - oy) * res;
		const r = 3 * res;
		for (let dy = -r; dy <= r; dy += r) {
			for (let dx = -r; dx <= r; dx += r) {
				const xi = (px + dx) | 0;
				const yi = (py + dy) | 0;
				if (xi >= 0 && yi >= 0 && xi < mask.w && yi < mask.h && mask.data[yi * mask.w + xi]) return true;
			}
		}
		return false;
	};
	const s: Slots = { targets: t, named: {} };
	yield* complete(s, used, N, rand, viewportHome(inp, rand, inside));
	return s;
}

// ── svg / paths ────────────────────────────────────────────────────────────────────────────

/** viewBox → region-normalised, preserving aspect (xMidYMid meet). */
function viewBoxMap(viewBox: [number, number], w: number, h: number) {
	const s = Math.min(w / viewBox[0], h / viewBox[1]);
	const ox = (w - viewBox[0] * s) / 2;
	const oy = (h - viewBox[1] * s) / 2;
	return {
		s,
		x: (vx: number) => ((ox + vx * s) / Math.max(1, w)) * 2 - 1,
		y: (vy: number) => 1 - ((oy + vy * s) / Math.max(1, h)) * 2
	};
}

let measureSvg: SVGSVGElement | null = null;
function pathElements(paths: string[]): SVGPathElement[] {
	if (!measureSvg) {
		measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		measureSvg.setAttribute('aria-hidden', 'true');
		measureSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
		document.body.appendChild(measureSvg);
	}
	return paths.map((d) => {
		const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		p.setAttribute('d', d);
		measureSvg!.appendChild(p);
		return p;
	});
}

function* bakeSvg(src: Extract<FormationSource, { kind: 'svg' }>, inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const { N, w, h } = inp;
	const t = new Float32Array(N * 4);
	const used = Math.round(Math.min(1, Math.max(0, src.share ?? 0.75)) * N);
	const weight = src.weight ?? 1;
	const map = viewBoxMap(src.viewBox, w, h);
	const tick = ticker(512);

	if (src.mode === 'fill') {
		const res = Math.min(2, Math.max(0.5, Math.sqrt(400_000 / Math.max(1, w * h))));
		const mask = yield* rasterMask(w * res, h * res, (ctx) => {
			const k = map.s * res;
			const ox = ((w - src.viewBox[0] * map.s) / 2) * res;
			const oy = ((h - src.viewBox[1] * map.s) / 2) * res;
			ctx.setTransform(k, 0, 0, k, ox, oy);
			for (const d of src.paths) ctx.fill(new Path2D(d));
		});
		const pts = yield* sampleMask(mask, used, rand);
		for (let i = 0; i < used; i++) {
			t[i * 4] = (pts[i * 2] / res / Math.max(1, w)) * 2 - 1;
			t[i * 4 + 1] = 1 - (pts[i * 2 + 1] / res / Math.max(1, h)) * 2;
			t[i * 4 + 3] = weight;
		}
	} else {
		const els = pathElements(src.paths);
		try {
			const lengths = els.map((p) => p.getTotalLength());
			const total = lengths.reduce((a, b) => a + b, 0) || 1;
			let k = 0;
			for (let pi = 0; pi < els.length && k < used; pi++) {
				const n = pi === els.length - 1 ? used - k : Math.round((used * lengths[pi]) / total);
				for (let j = 0; j < n && k < used; j++, k++) {
					const pt = els[pi].getPointAtLength(((j + 0.5 + (rand() - 0.5) * 0.3) / n) * lengths[pi]);
					t[k * 4] = map.x(pt.x);
					t[k * 4 + 1] = map.y(pt.y);
					t[k * 4 + 3] = weight;
					if (tick()) yield;
				}
			}
		} finally {
			for (const p of els) p.remove();
		}
	}
	const s: Slots = { targets: t, named: {} };
	yield* complete(s, used, N, rand, viewportHome(inp, rand));
	return s;
}

function* bakePaths(src: Extract<FormationSource, { kind: 'paths' }>, inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const { N, w, h } = inp;
	const t = new Float32Array(N * 4);
	const flow = new Float32Array(N * 4);
	const used = Math.round(Math.min(1, Math.max(0, src.share ?? 0.75)) * N);
	const weight = src.weight ?? 1;
	const map = viewBoxMap(src.viewBox, w, h);
	const rows = Math.max(1, src.paths.length);
	const data = new Float32Array(PATH_SAMPLES * rows * 4);
	const els = pathElements(src.paths);
	const tick = ticker(512);
	let paint: Uint8Array | undefined;
	try {
		const lengths = els.map((p) => Math.max(1e-3, p.getTotalLength()));
		const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
		els.forEach((el, r) => {
			const first = el.getPointAtLength(0);
			const last = el.getPointAtLength(lengths[r]);
			const closed = /z\s*$/i.test(src.paths[r]) || Math.hypot(first.x - last.x, first.y - last.y) < 1e-3 * lengths[r];
			for (let k = 0; k < PATH_SAMPLES; k++) {
				const p = el.getPointAtLength((k / (PATH_SAMPLES - 1)) * lengths[r]);
				const o = (r * PATH_SAMPLES + k) * 4;
				data[o] = map.x(p.x);
				data[o + 1] = map.y(p.y);
				data[o + 2] = closed ? 1 : 0;
			}
		});
		yield;
		const total = lengths.reduce((a, b) => a + b, 0);
		const rgb = src.color ? parseHex(src.color) : null;
		if (rgb) paint = new Uint8Array(N * 4);
		let k = 0;
		for (let r = 0; r < rows && k < used; r++) {
			const n = r === rows - 1 ? used - k : Math.round((used * lengths[r]) / total);
			// Equal px speed on every path: shorter paths cycle faster in phase.
			const speed = src.speed * (mean / lengths[r]);
			for (let j = 0; j < n && k < used; j++, k++) {
				const phase = (j + rand() * 0.6) / n;
				const lateral = (rand() - 0.5) * 0.05;
				const o = k * 4;
				flow[o] = r + 1;
				flow[o + 1] = phase;
				flow[o + 2] = speed;
				flow[o + 3] = lateral;
				// Initial position (for the Hilbert sort and CPU-side inits).
				const u = phase * (PATH_SAMPLES - 1);
				const i0 = Math.floor(u);
				const i1 = Math.min(i0 + 1, PATH_SAMPLES - 1);
				const f = u - i0;
				const a = (r * PATH_SAMPLES + i0) * 4;
				const b = (r * PATH_SAMPLES + i1) * 4;
				t[o] = data[a] + (data[b] - data[a]) * f;
				t[o + 1] = data[a + 1] + (data[b + 1] - data[a + 1]) * f;
				t[o + 3] = weight;
				if (paint && rgb) {
					paint[o] = rgb[0];
					paint[o + 1] = rgb[1];
					paint[o + 2] = rgb[2];
					paint[o + 3] = 255;
				}
				if (tick()) yield;
			}
		}
	} finally {
		for (const p of els) p.remove();
	}
	const s: Slots = { targets: t, flow, paths: { data, rows }, paint, named: {} };
	yield* complete(s, used, N, rand, viewportHome(inp, rand));
	return s;
}

// ── points / ambient / internal ────────────────────────────────────────────────────────────

function* bakePoints(src: Extract<FormationSource, { kind: 'points' }>, inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const { N } = inp;
	const ctx: BakeCtx = { N, w: inp.w, h: inp.h, rand, el: inp.el };
	const r: BakeResult = src.build(ctx);
	yield;
	const t = new Float32Array(N * 4);
	const used = Math.min(N, Math.floor((r.targets?.length ?? 0) / 4));
	t.set(r.targets.subarray(0, used * 4));
	const fit = (a?: Uint8Array) => {
		if (!a) return undefined;
		const out = new Uint8Array(N * 4);
		out.set(a.subarray(0, Math.min(a.length, N * 4)));
		return out;
	};
	const s: Slots = { targets: t, paint: fit(r.paint), paintAlt: fit(r.paintAlt), named: { ...(r.named ?? {}) } };
	// A builder that returns fewer slots gets ambient padding (it owns its own spare-slot policy).
	if (used < N) {
		const home = viewportHome(inp, rand);
		const p: [number, number] = [0, 0];
		for (let i = used; i < N; i++) {
			home(p);
			t[i * 4] = p[0];
			t[i * 4 + 1] = p[1];
		}
	}
	return s;
}

function* bakeAmbient(inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const t = new Float32Array(inp.N * 4);
	yield* jitterGrid(t, inp.N, inp.w, inp.h, 0, rand, 1);
	return { targets: t, named: {} };
}

function* bakeFill(inp: BakeInput, rand: () => number): Generator<void, Slots> {
	const t = new Float32Array(inp.N * 4);
	// Slight overscan so the ink cover reaches the very edges.
	yield* jitterGrid(t, inp.N, inp.w, inp.h, 1, rand, 0.7);
	for (let i = 0; i < inp.N; i++) {
		t[i * 4] *= 1.02;
		t[i * 4 + 1] *= 1.02;
	}
	return { targets: t, named: {} };
}

/** Golden-angle (Vogel) disc around the viewport centre; rank = radial order, used as the spawn order. */
function* bakeSpawn(inp: BakeInput): Generator<void, Slots> {
	const { N, w, h } = inp;
	const t = new Float32Array(N * 4);
	const rank = new Float32Array(N);
	const aspect = w / Math.max(1, h);
	// Disc radius in world units (viewport height = 2): ~3.5px pitch, so the sunflower reads.
	const R = Math.min(0.62, 0.3 * Math.sqrt(N / 4096));
	const tick = ticker();
	for (let k = 0; k < N; k++) {
		const r = R * Math.sqrt((k + 0.5) / N);
		const a = k * GOLDEN_ANGLE;
		t[k * 4] = (Math.cos(a) * r) / aspect;
		t[k * 4 + 1] = Math.sin(a) * r;
		t[k * 4 + 3] = 1;
		rank[k] = k / N;
		if (tick()) yield;
	}
	return { targets: t, named: {}, rank };
}

// ── entry point ────────────────────────────────────────────────────────────────────────────

/** Bakes `inp.src` into exactly N Hilbert-sorted slots. */
export function* bake(inp: BakeInput): Generator<void, Baked> {
	const t0 = performance.now();
	const rand = mulberry32(hashString(inp.id) ^ inp.N);
	const src = inp.src;
	let s: Slots;
	switch (src.kind) {
		case 'glyphs':
			s = yield* bakeGlyphs(src, inp, rand);
			break;
		case 'svg':
			s = yield* bakeSvg(src, inp, rand);
			break;
		case 'paths':
			s = yield* bakePaths(src, inp, rand);
			break;
		case 'points':
			s = yield* bakePoints(src, inp, rand);
			break;
		case 'fill':
			s = yield* bakeFill(inp, rand);
			break;
		case 'spawn':
			s = yield* bakeSpawn(inp);
			break;
		default:
			s = yield* bakeAmbient(inp, rand);
	}
	yield;

	const order = hilbertOrder(s.targets, inp.N);
	const inverse = new Uint32Array(inp.N);
	for (let i = 0; i < inp.N; i++) inverse[order[i]] = i;
	const named: Record<string, number> = {};
	for (const [name, slot] of Object.entries(s.named)) if (slot >= 0 && slot < inp.N) named[name] = inverse[slot];
	let rank: Float32Array | undefined;
	if (s.rank) {
		rank = new Float32Array(inp.N);
		for (let i = 0; i < inp.N; i++) rank[i] = s.rank[order[i]];
	}
	return {
		targets: permute(s.targets, order, 4),
		paint: s.paint && permute(s.paint, order, 4),
		paintAlt: s.paintAlt && permute(s.paintAlt, order, 4),
		flow: s.flow && permute(s.flow, order, 4),
		paths: s.paths,
		named,
		order,
		rank,
		ms: performance.now() - t0
	};
}

// ── idle scheduler ─────────────────────────────────────────────────────────────────────────

interface Job {
	gen: Generator<void, unknown, void>;
	resolve: (v: unknown) => void;
	reject: (e: unknown) => void;
	cancelled: boolean;
}

const SLICE_MS = 4;

/** Runs generators in ~4ms idle slices (requestIdleCallback, setTimeout where unsupported). */
export class BakeQueue {
	private jobs: Job[] = [];
	private handle = 0;
	private scheduled = false;
	private idle = typeof requestIdleCallback === 'function';

	get pending(): number {
		return this.jobs.length;
	}

	run<T>(gen: Generator<void, T, void>): { promise: Promise<T>; cancel(): void } {
		let job!: Job;
		const promise = new Promise<T>((resolve, reject) => {
			job = { gen, resolve: resolve as (v: unknown) => void, reject, cancelled: false };
		});
		this.jobs.push(job);
		this.schedule();
		return {
			promise,
			cancel: () => {
				job.cancelled = true;
			}
		};
	}

	private schedule() {
		if (this.scheduled) return;
		this.scheduled = true;
		this.handle = this.idle ? requestIdleCallback(this.pump, { timeout: 80 }) : window.setTimeout(this.pump, 16);
	}

	private pump = () => {
		this.scheduled = false;
		const end = performance.now() + SLICE_MS;
		while (this.jobs.length && performance.now() < end) {
			const job = this.jobs[0];
			if (job.cancelled) {
				this.jobs.shift();
				continue;
			}
			try {
				const r = job.gen.next();
				if (r.done) {
					this.jobs.shift();
					job.resolve(r.value);
				}
			} catch (err) {
				this.jobs.shift();
				job.reject(err);
			}
		}
		if (this.jobs.length) this.schedule();
	};

	dispose(): void {
		if (this.idle) cancelIdleCallback(this.handle);
		else clearTimeout(this.handle);
		for (const j of this.jobs) j.cancelled = true;
		this.jobs = [];
	}
}
