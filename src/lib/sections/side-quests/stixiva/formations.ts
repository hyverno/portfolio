// Formation `stix-grid` (DESIGN.md §5 04b): one entity per stitch on a 72×48 grid (48×32 on narrow
// stages), a dotted hem with centre arrows around it, and every remaining entity stacked onto the
// stitches and the hem, so the whole crowd builds the picture (a stack reads as one stitch at rest).
// `paint` = the source image, `paintAlt` = the quantised thread colours (shown past the scanline
// with the `xstitch` glyph).
//
// The layout (`gridLayout`) is shared with the hover maths, the chart and the scanline, so a cell
// under the cursor is exactly the cell the crowd stitched.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';
import { roseMotif } from './motif.ts';
import { quantize, type Mapping } from './quantize.ts';
import { THREADS } from './palette.ts';

export const STIX_ID = 'stix-grid';

export interface Dims {
	cols: number;
	rows: number;
}

export const WIDE: Dims = { cols: 72, rows: 48 };
export const NARROW: Dims = { cols: 48, rows: 32 };

/** Cells kept free around the grid for the hem (ring at 2) and the centre arrows (3–4). */
export const MARGIN = 4.5;

/** 72×48 on a stage of 560px and wider, 48×32 below (phones). */
export function gridDims(stageW: number): Dims {
	return stageW >= 560 ? WIDE : NARROW;
}

export interface Layout extends Dims {
	/** Cell size, CSS px. */
	pitch: number;
	/** Grid top-left inside the stage, CSS px. */
	ox: number;
	oy: number;
}

/** Fits the grid plus its margin inside a `w × h` stage (square cells, centred). */
export function gridLayout(w: number, h: number, dims: Dims = gridDims(w)): Layout {
	const pitch = Math.max(1, Math.min(w / (dims.cols + MARGIN * 2), h / (dims.rows + MARGIN * 2)));
	return {
		...dims,
		pitch,
		ox: (w - dims.cols * pitch) / 2,
		oy: (h - dims.rows * pitch) / 2
	};
}

/** Cell under a stage-local point, or null. */
export function cellAt(L: Layout, x: number, y: number): { col: number; row: number } | null {
	const col = Math.floor((x - L.ox) / L.pitch);
	const row = Math.floor((y - L.oy) / L.pitch);
	if (col < 0 || row < 0 || col >= L.cols || row >= L.rows) return null;
	return { col, row };
}

// ── pattern (image in → threads out), cached per grid size ─────────────────────────────────

export interface Pattern extends Dims {
	/** RGBA, row-major. */
	source: Uint8ClampedArray;
	plain: Mapping;
	dithered: Mapping;
}

/** k-means++ seeds that give all ten threads on each grid (searched offline; any seed works). */
const SEEDS: Record<string, number> = { '72x48': 215, '48x32': 659 };

const patterns = new Map<string, Pattern>();

export function getPattern(d: Dims): Pattern {
	const key = `${d.cols}x${d.rows}`;
	let p = patterns.get(key);
	if (!p) {
		const source = roseMotif(d.cols, d.rows);
		const q = quantize(source, d.cols, d.rows, SEEDS[key]);
		p = { ...d, source, plain: q.plain, dithered: q.dithered };
		patterns.set(key, p);
	}
	return p;
}

// ── live state read by the builder (a re-bake must reproduce what is on screen) ─────────────

export const stixState = {
	dither: false,
	/** The scan has completed: paint = threads and the formation's own glyph is the cross-stitch. */
	stitched: false
};

export function mappingOf(p: Pattern): Mapping {
	return stixState.dither ? p.dithered : p.plain;
}

// ── slots ────────────────────────────────────────────────────────────────────────────────────

/** Hem cells (grid units, cell centres) and the four centre arrows. */
function hemCells(d: Dims): [number, number][] {
	const out: [number, number][] = [];
	const { cols, rows } = d;
	for (let c = -2; c <= cols + 1; c++) out.push([c, -2], [c, rows + 1]);
	for (let r = -1; r <= rows; r++) out.push([-2, r], [cols + 1, r]);
	const mc = Math.floor(cols / 2);
	const mr = Math.floor(rows / 2);
	for (let k = -2; k <= 1; k++) {
		out.push([mc + k, -4], [mc + k, rows + 3], [-4, mr + k], [cols + 3, mr + k]);
	}
	for (let k = -1; k <= 0; k++) {
		out.push([mc + k, -3], [mc + k, rows + 2], [-3, mr + k], [cols + 2, mr + k]);
	}
	return out;
}

const HEM_ALT = THREADS[0].rgb; // garance: the hem becomes a red cross-stitch border

/**
 * Slot → cell (≥ 0), or −1 − hemIndex for hem slots. Builder order: one entity per cell, one per
 * hem stitch, then the spares stacked round-robin over both. A stack is invisible at rest, keeps
 * the whole crowd in the picture, and survives the governor's even draw-range thinning.
 */
function slotCell(i: number, cells: number, hem: number): number {
	const j = i < cells + hem ? i : (i - cells - hem) % (cells + hem);
	return j < cells ? j : -1 - (j - cells);
}

/**
 * Paint arrays in builder slot order for `N` entities: `paint` (source, or threads once stitched)
 * and `paintAlt` (threads). Used by the builder and by `crowd.setPaint` (dither / stitched swaps).
 */
export function paintArrays(N: number, d: Dims): { paint: Uint8Array; paintAlt: Uint8Array } {
	const p = getPattern(d);
	const m = mappingOf(p);
	const cells = d.cols * d.rows;
	const hem = hemCells(d).length;
	const paint = new Uint8Array(N * 4);
	const paintAlt = new Uint8Array(N * 4);
	for (let i = 0; i < N; i++) {
		const o = i * 4;
		const cell = slotCell(i, cells, hem);
		if (cell < 0) {
			// Hem: an ink tacking line, stitched in garance.
			if (stixState.stitched) {
				paint[o] = HEM_ALT[0];
				paint[o + 1] = HEM_ALT[1];
				paint[o + 2] = HEM_ALT[2];
				paint[o + 3] = 255;
			}
			paintAlt[o] = HEM_ALT[0];
			paintAlt[o + 1] = HEM_ALT[1];
			paintAlt[o + 2] = HEM_ALT[2];
			paintAlt[o + 3] = 255;
			continue;
		}
		const t = THREADS[m.thread[cell]].rgb;
		paintAlt[o] = t[0];
		paintAlt[o + 1] = t[1];
		paintAlt[o + 2] = t[2];
		paintAlt[o + 3] = 255;
		if (stixState.stitched) {
			paint[o] = t[0];
			paint[o + 1] = t[1];
			paint[o + 2] = t[2];
		} else {
			paint[o] = p.source[cell * 4];
			paint[o + 1] = p.source[cell * 4 + 1];
			paint[o + 2] = p.source[cell * 4 + 2];
		}
		paint[o + 3] = 255;
	}
	return { paint, paintAlt };
}

function build(ctx: BakeCtx): BakeResult {
	const { N, w, h } = ctx;
	const d = gridDims(w);
	const L = gridLayout(w, h, d);
	const cells = d.cols * d.rows;
	const hem = hemCells(d);
	const targets = new Float32Array(N * 4);
	const toX = (gx: number) => ((L.ox + gx * L.pitch) / w) * 2 - 1;
	const toY = (gy: number) => 1 - ((L.oy + gy * L.pitch) / h) * 2;
	for (let i = 0; i < N; i++) {
		const o = i * 4;
		const cell = slotCell(i, cells, hem.length);
		let gx: number;
		let gy: number;
		if (cell >= 0) {
			gx = (cell % d.cols) + 0.5;
			gy = Math.floor(cell / d.cols) + 0.5;
		} else {
			const [c, r] = hem[-1 - cell];
			gx = c + 0.5;
			gy = r + 0.5;
		}
		targets[o] = toX(gx);
		targets[o + 1] = toY(gy);
		targets[o + 3] = 1;
	}
	return { targets, ...paintArrays(N, d) };
}

/** Module-level source: identity is what the crowd compares. */
export const STIX_GRID: FormationSource = { kind: 'points', build };

/** Grid units → stage px, for the scanline (x of a grid-unit column edge). */
export function gridX(L: Layout, gx: number): number {
	return L.ox + gx * L.pitch;
}

/** The scan sweeps from just before the left arrow to just past the right one (grid units). */
export const SCAN_FROM = -MARGIN;
export function scanTo(d: Dims): number {
	return d.cols + MARGIN;
}

/** Grid-unit x of the scanline at scan progress `s` (0..1). */
export function scanGX(d: Dims, s: number): number {
	return SCAN_FROM + (scanTo(d) - SCAN_FROM) * Math.min(1, Math.max(0, s));
}

/** Columns whose centre the scanline has passed. */
export function stitchedCols(d: Dims, s: number): number {
	return Math.max(0, Math.min(d.cols, Math.floor(scanGX(d, s) + 0.5)));
}
