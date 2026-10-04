// `sq-intro` (§5 "04 · SIDE QUESTS"): three waypoint diamonds made of entities, one per side
// project, joined by a dotted quest path that enters from the left (where the reader comes from)
// and leaves toward the planet below. Each diamond carries its project's mark in negative space:
// a planet with its orbit, a 2×2 stitch grid, a bite.
//
// `introLayout()` is the single source of geometry: the crowd builder, the DOM waypoint labels and
// the no-WebGL SVG all read it, so the three can never disagree.
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';

export type Vec = [number, number];

export interface Waypoint {
	/** Centre in region px (y down). */
	x: number;
	y: number;
	/** Half-diagonal in px. */
	r: number;
}

export interface IntroLayout {
	w: number;
	h: number;
	/** Narrow regions stack the waypoints top → bottom (mobile). */
	vertical: boolean;
	waypoints: Waypoint[];
	/** Dotted path centre lines in region px (finely sampled Béziers). */
	paths: Vec[][];
}

/** The dashed reticle around each diamond, as a multiple of its half-diagonal. */
export const INTRO_RING = 1.26;
/** Distance between path dots, px. */
const PATH_STEP = 8;
/** Path ends stop this far outside the reticle, px. */
const PATH_GAP = 10;
/** Share of the crowd left free to roam around the map (capped at 25% by the engine contract). */
const AMBIENT = 0.12;
const SIGNAL: [number, number, number] = [255, 74, 28];

function bezier(a: Vec, b: Vec, c: Vec, d: Vec, n = 48): Vec[] {
	const out: Vec[] = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		const u = 1 - t;
		const k0 = u * u * u;
		const k1 = 3 * u * u * t;
		const k2 = 3 * u * t * t;
		const k3 = t * t * t;
		out.push([
			k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0],
			k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]
		]);
	}
	return out;
}

/** Horizontal S-curve between two anchors (tangents leave and arrive horizontally). */
function sx(a: Vec, b: Vec): Vec[] {
	const m = (b[0] - a[0]) * 0.5;
	return bezier(a, [a[0] + m, a[1]], [b[0] - m, b[1]], b);
}

/** Vertical S-curve between two anchors. */
function sy(a: Vec, b: Vec): Vec[] {
	const m = (b[1] - a[1]) * 0.5;
	return bezier(a, [a[0], a[1] + m], [b[0], b[1] - m], b);
}

export function introLayout(w: number, h: number): IntroLayout {
	const W = Math.max(1, w);
	const H = Math.max(1, h);
	const vertical = W < H * 1.15;
	let waypoints: Waypoint[];
	let paths: Vec[][];
	if (!vertical) {
		const xs = [0.17, 0.5, 0.83];
		const ys = [0.46, 0.36, 0.48];
		const spacing = (xs[1] - xs[0]) * W;
		// Room for both reticles plus a visible stretch of path between neighbours.
		const r = Math.max(18, Math.min(H * 0.27, (0.7 * spacing - 2 * PATH_GAP) / (2 * INTRO_RING)));
		waypoints = xs.map((fx, i) => ({ x: fx * W, y: ys[i] * H, r }));
		const R = r * INTRO_RING + PATH_GAP;
		const p = waypoints;
		paths = [
			sx([0, H * 0.86], [p[0].x - R, p[0].y]),
			sx([p[0].x + R, p[0].y], [p[1].x - R, p[1].y]),
			sx([p[1].x + R, p[1].y], [p[2].x - R, p[2].y]),
			sx([p[2].x + R, p[2].y], [W, H * 0.9])
		];
	} else {
		const xs = [0.36, 0.64, 0.38];
		const ys = [0.17, 0.5, 0.83];
		const spacing = (ys[1] - ys[0]) * H;
		const r = Math.max(18, Math.min(W * 0.19, (0.72 * spacing - 2 * PATH_GAP) / (2 * INTRO_RING)));
		waypoints = xs.map((fx, i) => ({ x: fx * W, y: ys[i] * H, r }));
		const R = r * INTRO_RING + PATH_GAP;
		const p = waypoints;
		paths = [
			sy([W * 0.5, 0], [p[0].x, p[0].y - R]),
			sy([p[0].x, p[0].y + R], [p[1].x, p[1].y - R]),
			sy([p[1].x, p[1].y + R], [p[2].x, p[2].y - R]),
			sy([p[2].x, p[2].y + R], [W * 0.62, H])
		];
	}
	return { w: W, h: H, vertical, waypoints, paths };
}

// ── shape tests (diamond-local px, y down) ─────────────────────────────────────────────────

/** |x| + |y| ≤ r: the diamond itself. */
const inDiamond = (x: number, y: number, r: number) => Math.abs(x) + Math.abs(y) <= r;

/**
 * Negative-space mark of each project, true = knocked out.
 * 0 · Crazy Planet: a planet, a gap around it and a tilted orbit cutting through the diamond.
 * 1 · Stixiva: the diagonals cut away, leaving a 2×2 grid of stitches.
 * 2 · Le Rongeur: a scalloped bite out of the top-right edge.
 */
function knockedOut(kind: number, x: number, y: number, r: number): boolean {
	if (kind === 0) {
		const d = Math.hypot(x, y);
		if (d > 0.27 * r && d < 0.38 * r) return true;
		// Orbit: an ellipse (rx .74r, ry .21r) rotated -18°, cut as a band of even width
		// (|e - 1| / |∇e| is the distance to the ellipse to first order).
		const a = -0.314;
		const c = Math.cos(a);
		const s = Math.sin(a);
		const rx = 0.74 * r;
		const ry = 0.21 * r;
		const u = (x * c + y * s) / rx;
		const v = (-x * s + y * c) / ry;
		const e = Math.max(1e-6, Math.sqrt(u * u + v * v));
		const gx = ((u / e) * c) / rx - ((v / e) * s) / ry;
		const gy = ((u / e) * s) / rx + ((v / e) * c) / ry;
		const dist = Math.abs(e - 1) / Math.max(1e-6, Math.hypot(gx, gy));
		// The orbit passes behind the planet: no cut across the planet's far (upper) side.
		return dist < 0.045 * r && !(d < 0.38 * r && v < 0);
	}
	if (kind === 1) {
		// Diamond-local (u, v) axes run along the diamond's edges.
		const u = (x + y) * Math.SQRT1_2;
		const v = (x - y) * Math.SQRT1_2;
		return Math.abs(u) < 0.075 * r || Math.abs(v) < 0.075 * r;
	}
	// Bite: three overlapping circles along the top-right edge (from (0,-r) to (r,0)).
	const mx = r * 0.5;
	const my = -r * 0.5;
	// Unit vector along the edge and its outward normal.
	const ex = Math.SQRT1_2;
	const ey = Math.SQRT1_2;
	const nx = Math.SQRT1_2;
	const ny = -Math.SQRT1_2;
	const bites: [number, number][] = [
		[-0.34, 0.22],
		[0, 0.3],
		[0.34, 0.22]
	];
	for (const [t, rad] of bites) {
		// Centred on the edge itself: each tooth mark cuts its full radius deep.
		const cx = mx + ex * t * r + nx * 0.02 * r;
		const cy = my + ey * t * r + ny * 0.02 * r;
		if (Math.hypot(x - cx, y - cy) < rad * r) return true;
	}
	return false;
}

/** Signal paint: the planet in the first waypoint (the active quest). */
const isSignal = (kind: number, x: number, y: number, r: number) => kind === 0 && Math.hypot(x, y) <= 0.27 * r;

// ── sampling ───────────────────────────────────────────────────────────────────────────────

/** Points on a jittered grid inside `inside`, sized to land on `count` exactly. */
function sampleArea(
	count: number,
	r: number,
	inside: (x: number, y: number) => boolean,
	rand: () => number
): Vec[] {
	if (count <= 0) return [];
	// Area estimate on a 48×48 grid over the bounding box.
	let hits = 0;
	const G = 48;
	for (let j = 0; j < G; j++) {
		for (let i = 0; i < G; i++) {
			if (inside(((i + 0.5) / G) * 2 * r - r, ((j + 0.5) / G) * 2 * r - r)) hits++;
		}
	}
	const area = Math.max(1, (hits / (G * G)) * 4 * r * r);
	let g = Math.sqrt(area / count);
	let pts: Vec[] = [];
	for (let attempt = 0; attempt < 3; attempt++) {
		pts = [];
		for (let y = -r + g * 0.5; y < r; y += g) {
			for (let x = -r + g * 0.5; x < r; x += g) {
				const px = x + (rand() - 0.5) * g * 0.5;
				const py = y + (rand() - 0.5) * g * 0.5;
				if (inside(px, py)) pts.push([px, py]);
			}
		}
		if (pts.length >= count * 0.97 && pts.length <= count * 1.06) break;
		// Never let a degenerate pass shrink the pitch into a runaway loop.
		g = Math.max(0.75, g * Math.sqrt(Math.max(count * 0.25, pts.length) / count));
	}
	while (pts.length > count) {
		const i = (rand() * pts.length) | 0;
		pts[i] = pts[pts.length - 1];
		pts.pop();
	}
	let guard = 0;
	while (pts.length < count && guard++ < count * 40) {
		const x = (rand() * 2 - 1) * r;
		const y = (rand() * 2 - 1) * r;
		if (inside(x, y)) pts.push([x, y]);
	}
	return pts;
}

/** Arc-length samples along a polyline every `step` px. */
function alongPath(path: Vec[], step: number): Vec[] {
	const out: Vec[] = [];
	let carry = step * 0.5;
	for (let i = 1; i < path.length; i++) {
		const [ax, ay] = path[i - 1];
		const [bx, by] = path[i];
		const len = Math.hypot(bx - ax, by - ay);
		let t = carry;
		while (t <= len) {
			const f = t / len;
			out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
			t += step;
		}
		carry = t - len;
	}
	return out;
}

/** Corners of a diamond of half-diagonal `r` around (x, y), clockwise from the top. */
function diamondCorners(x: number, y: number, r: number): Vec[] {
	return [
		[x, y - r],
		[x + r, y],
		[x, y + r],
		[x - r, y],
		[x, y - r]
	];
}

/** Dashes along the reticle: [dash, gap] in px. */
const RING_DASH: Vec = [13, 8];

function ringSamples(wp: Waypoint, pitch: number, rows: number, rand: () => number): Vec[] {
	const R = wp.r * INTRO_RING;
	const pts: Vec[] = [];
	const corners = diamondCorners(0, 0, R);
	const period = RING_DASH[0] + RING_DASH[1];
	let s = 0;
	for (let i = 1; i < corners.length; i++) {
		const [ax, ay] = corners[i - 1];
		const [bx, by] = corners[i];
		const len = Math.hypot(bx - ax, by - ay);
		const nx = (by - ay) / len;
		const ny = -(bx - ax) / len;
		for (let t = 0; t < len; t += pitch) {
			// Dashes are phased per edge so every corner gets a full dash (reads as a gizmo).
			const ph = (s + t + RING_DASH[0] * 0.5) % period;
			if (ph > RING_DASH[0]) continue;
			const f = t / len;
			for (let row = 0; row < rows; row++) {
				const off = (row - (rows - 1) / 2) * pitch * 0.9 + (rand() - 0.5) * 0.4;
				pts.push([wp.x + ax + (bx - ax) * f + nx * off, wp.y + ay + (by - ay) * f + ny * off]);
			}
		}
		s += len;
	}
	return pts;
}

/** The `sq-intro` builder: exactly N slots in region-normalised space (y up). */
export function buildIntro({ N, w, h, rand }: BakeCtx): BakeResult {
	const L = introLayout(w, h);
	const targets = new Float32Array(N * 4);
	const paint = new Uint8Array(N * 4);
	let k = 0;
	const push = (x: number, y: number, weight: number, signal: boolean) => {
		if (k >= N) return;
		const o = k * 4;
		targets[o] = (x / L.w) * 2 - 1;
		targets[o + 1] = 1 - (y / L.h) * 2;
		targets[o + 2] = 0;
		targets[o + 3] = weight;
		if (signal) {
			paint[o] = SIGNAL[0];
			paint[o + 1] = SIGNAL[1];
			paint[o + 2] = SIGNAL[2];
			paint[o + 3] = 255;
		}
		k++;
	};

	const ambient = Math.floor(N * AMBIENT);
	const shape = N - ambient;

	// 1 · The dotted quest path: one entity every PATH_STEP px (a light touch, like a map).
	const pathPts: Vec[] = [];
	for (const p of L.paths) pathPts.push(...alongPath(p, PATH_STEP));
	const nPath = Math.min(pathPts.length, Math.floor(shape * 0.08));
	for (let i = 0; i < nPath; i++) push(pathPts[i][0], pathPts[i][1], 1, false);

	// 2 · Dashed reticles, two rows (capped so the fills keep most of the crowd).
	const pitch = 2.7;
	let ringPts: Vec[] = [];
	for (const wp of L.waypoints) ringPts = ringPts.concat(ringSamples(wp, pitch, 2, rand));
	const nRing = Math.min(ringPts.length, Math.floor(shape * 0.16));
	for (let i = 0; i < nRing; i++) {
		// Thin evenly when capped.
		const j = Math.floor((i * ringPts.length) / Math.max(1, nRing));
		push(ringPts[j][0], ringPts[j][1], 1, false);
	}

	// 3 · Filled diamonds with each project's mark knocked out. Equal share each.
	const fill = shape - k;
	for (let d = 0; d < L.waypoints.length; d++) {
		const wp = L.waypoints[d];
		const count = d === L.waypoints.length - 1 ? shape - k : Math.round(fill / L.waypoints.length);
		const pts = sampleArea(count, wp.r, (x, y) => inDiamond(x, y, wp.r) && !knockedOut(d, x, y, wp.r), rand);
		for (const [x, y] of pts) push(wp.x + x, wp.y + y, 1, isSignal(d, x, y, wp.r));
	}

	// 4 · The rest roams the map (weight 0): the living field around the quest line.
	while (k < N) {
		const x = (rand() * 1.1 - 0.05) * L.w;
		const y = (rand() * 1.1 - 0.05) * L.h;
		push(x, y, 0, false);
	}
	return { targets, paint };
}

/** Module-level source: identity is what the crowd compares (a new object would re-bake). */
export const SQ_INTRO: FormationSource = { kind: 'points', build: buildIntro };

/** SVG path data for the static build (no WebGL): diamonds, reticles and the path, same layout. */
export function introSvg(L: IntroLayout): { diamonds: string[]; rings: string[]; paths: string[] } {
	const poly = (pts: Vec[]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');
	return {
		diamonds: L.waypoints.map((wp) => poly(diamondCorners(wp.x, wp.y, wp.r)) + 'Z'),
		rings: L.waypoints.map((wp) => poly(diamondCorners(wp.x, wp.y, wp.r * INTRO_RING)) + 'Z'),
		paths: L.paths.map(poly)
	};
}
