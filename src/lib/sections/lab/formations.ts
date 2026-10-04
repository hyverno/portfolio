// Formation `lab-gutters` (§5 05 · LAB): the global crowd parks in the gutters of the viewport
// grid as marching columns of dots, so the crowd becomes the grid lines. The builder measures the
// real gaps between the cells at bake time (it re-bakes when the grid resizes) and runs an odd
// number of files of dots along every gutter and round the grid, dots packed tight along each
// file. The centre file stays ink, its flanks are painted graphite: each gutter reads as one crisp
// grid line in a ruled band, not as a grey smear. The file count and the pitch along the files
// adapt so ~86% of the tier's N (16,384 → 4,096) stand in line; the rest roam (weight 0) with
// homes under the cells: they drift through the gutters and vanish under the viewports, which
// punch the crowd out.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';

interface Box {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

interface Band extends Box {
	/** Files run along y (a column gutter) or along x (a row gutter). */
	vertical: boolean;
}

const HELD = 0.86;
/** Minimum distance between two files, px. */
const FILE_GAP = 4.5;
/** Flank files: graphite (#8C8B84, the viewport theme's), the centre file keeps the ink. */
const FLANK: [number, number, number] = [0x8c, 0x8b, 0x84];
/** Dot pitch along a file: tight enough to read as a line, never overlapping (dots are 2.5px). */
const PITCH_MIN = 2.75;
const PITCH_IDEAL = 3.2;
const PITCH_MAX = 8;
/** Keep the dots off the HUD rulers at the window edges. */
const RULER_CLEAR = 30;

/** Groups 1D intervals that overlap into columns / rows: [min start, max end] each, sorted. */
function tracks(spans: [number, number][]): [number, number][] {
	const out: [number, number][] = [];
	for (const [a, b] of [...spans].sort((p, q) => p[0] - q[0])) {
		const last = out[out.length - 1];
		if (last && a < last[1] - 1) last[1] = Math.max(last[1], b);
		else out.push([a, b]);
	}
	return out;
}

function bands(el: HTMLElement, w: number, h: number): Band[] {
	const r = el.getBoundingClientRect();
	const cells: Box[] = Array.from(el.querySelectorAll<HTMLElement>('[data-lab-cell]'), (c) => {
		const b = c.getBoundingClientRect();
		return { x0: b.left - r.left, y0: b.top - r.top, x1: b.right - r.left, y1: b.bottom - r.top };
	}).filter((b) => b.x1 - b.x0 > 1 && b.y1 - b.y0 > 1);
	const cols = tracks(cells.map((c) => [c.x0, c.x1]));
	const rows = tracks(cells.map((c) => [c.y0, c.y1]));
	if (!cols.length || !rows.length) {
		cols.push([0, w]);
		rows.push([0, h]);
	}
	const gap =
		cols.length > 1 ? cols[1][0] - cols[0][1] : rows.length > 1 ? rows[1][0] - rows[0][1] : Math.max(16, w * 0.03);
	const vw = document.documentElement.clientWidth || window.innerWidth;
	const sideL = Math.min(gap, r.left - RULER_CLEAR);
	const sideR = Math.min(gap, vw - r.right - RULER_CLEAR);
	const left = sideL >= 10 ? -sideL : 0;
	const right = sideR >= 10 ? w + sideR : w;

	const out: Band[] = [];
	// Row gutters run the full width (frame corners included), so nothing is laid twice.
	const hBands: [number, number][] = [[-gap, 0]];
	for (let i = 0; i + 1 < rows.length; i++) hBands.push([rows[i][1], rows[i + 1][0]]);
	hBands.push([h, h + gap]);
	for (const [y0, y1] of hBands) if (y1 - y0 > 2) out.push({ x0: left, x1: right, y0, y1, vertical: false });
	// Column gutters, one segment per row.
	const vBands: [number, number][] = [];
	if (left < 0) vBands.push([left, 0]);
	for (let i = 0; i + 1 < cols.length; i++) vBands.push([cols[i][1], cols[i + 1][0]]);
	if (right > w) vBands.push([w, right]);
	for (const [x0, x1] of vBands) {
		if (x1 - x0 <= 2) continue;
		for (const [y0, y1] of rows) out.push({ x0, x1, y0, y1, vertical: true });
	}
	return out;
}

const across = (b: Band) => (b.vertical ? b.x1 - b.x0 : b.y1 - b.y0);
const along = (b: Band) => (b.vertical ? b.y1 - b.y0 : b.x1 - b.x0);
/** Clearance from the cells on each side of a band. */
const inset = (b: Band) => Math.min(8, Math.max(3, across(b) * 0.14));
const maxFiles = (b: Band) => Math.max(1, Math.floor(Math.max(0, across(b) - 2 * inset(b)) / FILE_GAP) + 1);
/** An odd file count (one centre line), scaled down when entities are scarce. */
function filesFor(b: Band, scale: number): number {
	const max = maxFiles(b);
	let f = Math.max(1, Math.round(max * scale));
	if (f % 2 === 0) f = f + 1 <= max ? f + 1 : f - 1;
	return Math.max(1, f);
}

function build({ N, w, h, rand, el }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const list = bands(el, w, h);
	const held = Math.floor(N * HELD);

	// Files per band and the pitch along them: as many files as fit at FILE_GAP, then the pitch
	// that spends `held` entities. Too few entities (low tier) → fewer files, so lines stay lines.
	let fileScale = 1;
	let pitch = PITCH_IDEAL;
	const lengthAt = (scale: number) => {
		let L = 0;
		for (const b of list) L += along(b) * filesFor(b, scale);
		return L;
	};
	pitch = lengthAt(1) / Math.max(1, held);
	if (pitch > PITCH_IDEAL * 1.15) {
		fileScale = Math.max(0.2, PITCH_IDEAL / pitch);
		pitch = lengthAt(fileScale) / Math.max(1, held);
	}
	pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));

	/** x, y, centre (1) or flank (0). */
	const pts: number[] = [];
	for (const b of list) {
		const ins = inset(b);
		const span = Math.max(0, across(b) - 2 * ins);
		const files = filesFor(b, fileScale);
		const mid = (files - 1) / 2;
		const len = along(b);
		const count = Math.max(1, Math.floor(len / pitch));
		const step = len / count;
		for (let f = 0; f < files; f++) {
			const off = files === 1 ? across(b) / 2 : ins + (span * f) / (files - 1);
			for (let k = 0; k < count; k++) {
				const t = (k + 0.5) * step;
				if (b.vertical) pts.push(b.x0 + off, b.y0 + t, f === mid ? 1 : 0);
				else pts.push(b.x0 + t, b.y0 + off, f === mid ? 1 : 0);
			}
		}
	}

	// More slots than entities: keep an even subset (every k-th), so no gutter goes empty.
	const paint = new Uint8Array(N * 4);
	const slots = pts.length / 3;
	const placed = Math.min(N, slots);
	for (let i = 0; i < placed; i++) {
		const s = slots > N ? Math.floor((i * slots) / N) : i;
		const o = i * 4;
		targets[o] = (pts[s * 3] / Math.max(1, w)) * 2 - 1;
		targets[o + 1] = 1 - (pts[s * 3 + 1] / Math.max(1, h)) * 2;
		targets[o + 3] = 1;
		if (!pts[s * 3 + 2]) {
			paint[o] = FLANK[0];
			paint[o + 1] = FLANK[1];
			paint[o + 2] = FLANK[2];
			paint[o + 3] = 255;
		}
	}
	// The rest roam: homes scattered under the grid.
	for (let i = placed; i < N; i++) {
		const o = i * 4;
		targets[o] = rand() * 2 - 1;
		targets[o + 1] = rand() * 2 - 1;
		targets[o + 3] = 0;
	}
	return { targets, paint };
}

/** Defined once at module level: the crowd compares sources by identity. */
export const LAB_GUTTERS: FormationSource = { kind: 'points', build };
