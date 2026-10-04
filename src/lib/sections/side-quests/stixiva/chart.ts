// Canvas2D cross-stitch chart: one vector symbol per thread (● ▲ ■ ◆ ✚ ○ △ □ ◇ ✕), a hairline
// grid with a bold line every 10 cells, centre arrows and 10-step numbering. Used by the pattern
// panel (colour mode, scanned live) and the A4 preview (black-and-white print mode).
import { THREADS, luminance, type SymbolKind } from './palette.ts';
import type { Mapping } from './quantize.ts';
import type { Pattern } from './formations';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface ChartGeometry {
	/** Cell size, CSS px. */
	cell: number;
	/** Grid origin inside the canvas, CSS px (room for numbers and arrows). */
	ox: number;
	oy: number;
	/** Canvas size, CSS px. */
	w: number;
	h: number;
}

/** Room for the 10-step numbers (top, left) and the centre arrows (all sides). */
const GUTTER_LEAD = 18;
const GUTTER_TAIL = 9;

export function chartGeometry(cols: number, rows: number, maxW: number, maxH: number): ChartGeometry {
	const cell = Math.max(
		2,
		Math.min((maxW - GUTTER_LEAD - GUTTER_TAIL) / cols, (maxH - GUTTER_LEAD - GUTTER_TAIL) / rows)
	);
	return {
		cell,
		ox: GUTTER_LEAD,
		oy: GUTTER_LEAD,
		w: Math.ceil(GUTTER_LEAD + GUTTER_TAIL + cols * cell),
		h: Math.ceil(GUTTER_LEAD + GUTTER_TAIL + rows * cell)
	};
}

/** Draws one chart symbol centred at (cx, cy), `s` = symbol box size. */
export function drawSymbol(ctx: Ctx, kind: SymbolKind, cx: number, cy: number, s: number): void {
	const r = s / 2;
	const lw = Math.max(0.75, s * 0.16);
	ctx.lineWidth = lw;
	ctx.beginPath();
	switch (kind) {
		case 'disc':
			ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
			ctx.fill();
			return;
		case 'ring':
			ctx.arc(cx, cy, r * 0.78 - lw / 2, 0, Math.PI * 2);
			ctx.stroke();
			return;
		case 'tri':
		case 'triOpen': {
			const k = kind === 'tri' ? 0 : lw * 0.6;
			ctx.moveTo(cx, cy - r + k);
			ctx.lineTo(cx + r * 0.95 - k, cy + r * 0.78 - k * 0.6);
			ctx.lineTo(cx - r * 0.95 + k, cy + r * 0.78 - k * 0.6);
			ctx.closePath();
			if (kind === 'tri') ctx.fill();
			else ctx.stroke();
			return;
		}
		case 'square':
			ctx.rect(cx - r * 0.78, cy - r * 0.78, r * 1.56, r * 1.56);
			ctx.fill();
			return;
		case 'squareOpen':
			ctx.rect(cx - r * 0.78 + lw / 2, cy - r * 0.78 + lw / 2, r * 1.56 - lw, r * 1.56 - lw);
			ctx.stroke();
			return;
		case 'diamond':
		case 'diamondOpen': {
			const k = kind === 'diamond' ? 0 : lw * 0.7;
			ctx.moveTo(cx, cy - r + k);
			ctx.lineTo(cx + r - k, cy);
			ctx.lineTo(cx, cy + r - k);
			ctx.lineTo(cx - r + k, cy);
			ctx.closePath();
			if (kind === 'diamond') ctx.fill();
			else ctx.stroke();
			return;
		}
		case 'plus': {
			const t = Math.max(1, s * 0.26);
			ctx.rect(cx - t / 2, cy - r * 0.86, t, r * 1.72);
			ctx.rect(cx - r * 0.86, cy - t / 2, r * 1.72, t);
			ctx.fill();
			return;
		}
		case 'cross': {
			const a = r * 0.66;
			ctx.lineCap = 'square';
			ctx.moveTo(cx - a, cy - a);
			ctx.lineTo(cx + a, cy + a);
			ctx.moveTo(cx + a, cy - a);
			ctx.lineTo(cx - a, cy + a);
			ctx.stroke();
			ctx.lineCap = 'butt';
			return;
		}
	}
}

export interface ChartColors {
	paper: string;
	ink: string;
	/** Hairline grid. */
	grid: string;
	/** Bold every-10 grid. */
	bold: string;
}

export interface ChartOptions {
	/** 'colour': thread swatches + contrasting symbols. 'print': white cells, black symbols. 'source': the faded input image. */
	mode: 'colour' | 'print' | 'source';
	/** Thread to emphasise (others fade), -1 for none. */
	highlight?: number;
	colors: ChartColors;
	numbers?: boolean;
	font?: string;
}

/** Renders a full chart into `ctx` (already scaled to CSS px). */
export function renderChart(ctx: Ctx, p: Pattern, m: Mapping, g: ChartGeometry, o: ChartOptions): void {
	const { cols, rows } = p;
	const { cell, ox, oy } = g;
	const hi = o.highlight ?? -1;
	ctx.clearRect(0, 0, g.w, g.h);

	// Cells.
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const i = y * cols + x;
			const px = ox + x * cell;
			const py = oy + y * cell;
			if (o.mode === 'source') {
				ctx.fillStyle = `rgb(${p.source[i * 4]} ${p.source[i * 4 + 1]} ${p.source[i * 4 + 2]} / 0.42)`;
				ctx.fillRect(px, py, cell, cell);
				continue;
			}
			const t = THREADS[m.thread[i]];
			const dim = hi >= 0 && t.index !== hi;
			if (o.mode === 'colour') {
				ctx.globalAlpha = dim ? 0.16 : 1;
				ctx.fillStyle = t.hex;
				ctx.fillRect(px, py, cell, cell);
				ctx.globalAlpha = 1;
				if (cell >= 4.5 && !dim) {
					const light = luminance(t.rgb) > 0.32;
					ctx.fillStyle = ctx.strokeStyle = light ? 'rgb(27 27 27 / 0.82)' : 'rgb(255 253 248 / 0.9)';
					drawSymbol(ctx, t.symbol, px + cell / 2, py + cell / 2, cell * 0.62);
				}
			} else {
				// Print: a faint tint of the thread under a black symbol, as colour-and-symbol PDFs do.
				ctx.globalAlpha = dim ? 0.06 : 0.2;
				ctx.fillStyle = t.hex;
				ctx.fillRect(px, py, cell, cell);
				ctx.fillStyle = ctx.strokeStyle = o.colors.ink;
				ctx.globalAlpha = dim ? 0.18 : 1;
				drawSymbol(ctx, t.symbol, px + cell / 2, py + cell / 2, cell * 0.6);
				ctx.globalAlpha = 1;
			}
		}
	}

	// Hairline grid, bold every 10 (from the top-left corner, as printed charts count).
	const gw = cols * cell;
	const gh = rows * cell;
	const line = (x0: number, y0: number, x1: number, y1: number) => {
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
	};
	if (cell >= 3.5) {
		ctx.beginPath();
		ctx.strokeStyle = o.colors.grid;
		ctx.lineWidth = 0.5;
		for (let x = 1; x < cols; x++) if (x % 10) line(ox + x * cell, oy, ox + x * cell, oy + gh);
		for (let y = 1; y < rows; y++) if (y % 10) line(ox, oy + y * cell, ox + gw, oy + y * cell);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.strokeStyle = o.colors.bold;
	ctx.lineWidth = 1.25;
	for (let x = 0; x <= cols; x += 10) line(ox + x * cell, oy, ox + x * cell, oy + gh);
	for (let y = 0; y <= rows; y += 10) line(ox, oy + y * cell, ox + gw, oy + y * cell);
	line(ox + gw, oy, ox + gw, oy + gh);
	line(ox, oy + gh, ox + gw, oy + gh);
	ctx.stroke();

	// Centre arrows, pointing at the middle row / column.
	ctx.fillStyle = o.colors.ink;
	const a = Math.min(6, GUTTER_TAIL - 2);
	const mx = ox + (cols / 2) * cell;
	const my = oy + (rows / 2) * cell;
	const tri = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) => {
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.closePath();
		ctx.fill();
	};
	tri(mx - a / 2, oy - a - 2, mx + a / 2, oy - a - 2, mx, oy - 2);
	tri(mx - a / 2, oy + gh + a + 2, mx + a / 2, oy + gh + a + 2, mx, oy + gh + 2);
	tri(ox - a - 2, my - a / 2, ox - a - 2, my + a / 2, ox - 2, my);
	tri(ox + gw + a + 2, my - a / 2, ox + gw + a + 2, my + a / 2, ox + gw + 2, my);

	if (o.numbers !== false) {
		ctx.fillStyle = o.colors.ink;
		ctx.font = o.font ?? '500 7px "Martian Mono Variable", ui-monospace, monospace';
		ctx.textBaseline = 'alphabetic';
		ctx.textAlign = 'center';
		for (let x = 10; x < cols; x += 10) ctx.fillText(String(x), ox + x * cell, oy - 9);
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		for (let y = 10; y < rows; y += 10) ctx.fillText(String(y), ox - 9, oy + y * cell);
	}
}

/** A canvas sized for `g` at `dpr`, its context scaled to CSS px. */
export function sizeCanvas(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	g: Pick<ChartGeometry, 'w' | 'h'>,
	dpr: number
): Ctx | null {
	const W = Math.max(1, Math.round(g.w * dpr));
	const H = Math.max(1, Math.round(g.h * dpr));
	if (canvas.width !== W) canvas.width = W;
	if (canvas.height !== H) canvas.height = H;
	const ctx = canvas.getContext('2d') as Ctx | null;
	ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
	return ctx;
}

export function offscreen(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
	return typeof OffscreenCanvas !== 'undefined'
		? new OffscreenCanvas(Math.max(1, w), Math.max(1, h))
		: Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) });
}
