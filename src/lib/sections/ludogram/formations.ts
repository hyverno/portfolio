// The three Ludogram formations (§5 03 · SHIPPED), as module-level FormationSource constants so
// the crowd compares them by identity and project pages can reuse them:
//   import { LUDO_CITY } from '#lib/sections/ludogram/formations';
//   <div use:formation={{ id: 'ludo-city', source: LUDO_CITY, preset: 'march' }}></div>
// Each builder returns exactly N slots in region-normalised space (x, y in [-1, 1], y up).
// Regions: the city maps onto a 10:7 box, the shelves and the d20 onto square boxes (the d20 is
// rotated in 3D through Crowd.setRotation, which needs a square region to stay undistorted).
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';
import { EDGES, VERTS } from './d20';
import {
	BLOCKS,
	CITY_SEGS,
	CITY_VIEW,
	MINI,
	MINIS_PER_BLOCK,
	MINI_COUNT,
	PEON,
	PRIMER,
	RARE,
	SHELF_SEGS,
	SHELF_VIEW,
	hordePoint,
	miniColors,
	miniOrigin,
	sampleSegs,
	type Pt
} from './geometry';

export const FORMATION_IDS = ['ludo-city', 'ludo-shelves', 'ludo-d20'] as const;
export type LudoFormationId = (typeof FORMATION_IDS)[number];

/** Region aspect ratios (width / height) the builders are drawn for. */
export const CITY_ASPECT = CITY_VIEW[0] / CITY_VIEW[1];
export const SHELVES_ASPECT = SHELF_VIEW[0] / SHELF_VIEW[1];
export const D20_ASPECT = 1;

/**
 * Depth of the city and the horde. The walk is a rotation about Y of the whole formation:
 * x' = x·cos θ + z·sin θ, so a point at depth z slides right by ≈ z·θ while the shape barely
 * changes. Rotating about X (bob) and Z (rock) gives the gait. One matrix, no re-bake.
 */
export const CITY_Z = 1.2;
export const HORDE_Z = 1.0;
/** Horde slots are only loosely held: they mill and surge behind the city. */
export const HORDE_WEIGHT = 0.3;

const GRAPHITE: [number, number, number] = [0x8c, 0x8b, 0x84];

/** City (incl. the peon) and horde shares of N. */
export function citySplit(N: number): { city: number; horde: number } {
	const city = Math.round(N * 0.2);
	return { city, horde: N - city };
}

function setRGBA(a: Uint8Array, i: number, rgb: readonly number[], alpha: number) {
	const o = i * 4;
	a[o] = rgb[0];
	a[o + 1] = rgb[1];
	a[o + 2] = rgb[2];
	a[o + 3] = alpha;
}

// ── 01 · ludo-city ────────────────────────────────────────────────────────────────────────────

const cityX = (x: number) => (x / CITY_VIEW[0]) * 2 - 1;
const cityY = (y: number) => 1 - (y / CITY_VIEW[1]) * 2;

function buildCity({ N, rand }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const paint = new Uint8Array(N * 4);
	const { city } = citySplit(N);

	// Slot 0: the peon (named, so the renderer paints it signal and the CPU can track it).
	targets[0] = cityX(PEON[0]);
	targets[1] = cityY(PEON[1]);
	targets[2] = CITY_Z;
	targets[3] = 1;

	const pts = sampleSegs(CITY_SEGS, city - 1, rand);
	for (let i = 1; i < city; i++) {
		const o = i * 4;
		targets[o] = cityX(pts[(i - 1) * 2]);
		targets[o + 1] = cityY(pts[(i - 1) * 2 + 1]);
		targets[o + 2] = CITY_Z;
		targets[o + 3] = 1;
	}

	// The horde: a wave piling up behind the city, a shade dimmer so the city reads in front.
	const p: Pt = [0, 0];
	for (let i = city; i < N; i++) {
		hordePoint(rand, p);
		const o = i * 4;
		targets[o] = cityX(p[0]);
		targets[o + 1] = cityY(p[1]);
		targets[o + 2] = HORDE_Z;
		targets[o + 3] = HORDE_WEIGHT;
		setRGBA(paint, i, GRAPHITE, 150);
	}
	// Same colours on both sides of any scanline left behind by another formation.
	return { targets, paint, paintAlt: paint, named: { peon: 0 } };
}

export const LUDO_CITY: FormationSource = { kind: 'points', build: buildCity };

// ── 02 · ludo-shelves ─────────────────────────────────────────────────────────────────────────

const shelfX = (x: number) => (x / SHELF_VIEW[0]) * 2 - 1;
const shelfY = (y: number) => 1 - (y / SHELF_VIEW[1]) * 2;

/** Slot layout of the last shelves bake, kept so a pack opening can repaint one mini. */
interface ShelvesLayout {
	N: number;
	paint: Uint8Array;
	paintAlt: Uint8Array;
	/** First slot of mini 0, and slots per mini. */
	start: number;
	per: number;
}

let shelves: ShelvesLayout | null = null;

/** Share of N per part, chosen so every tier keeps whole minis and ≤ 25% free roamers. */
export function shelvesSplit(N: number): {
	frame: number;
	per: number;
	minis: number;
	spare: number;
} {
	const spare = Math.floor(N * 0.1);
	const per = Math.max(3, Math.floor((N - spare - Math.floor(N * 0.08)) / MINI_COUNT));
	const minis = per * MINI_COUNT;
	return { frame: N - spare - minis, per, minis, spare };
}

function buildShelves({ N, rand }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const paint = new Uint8Array(N * 4);
	const paintAlt = new Uint8Array(N * 4);
	const { frame, per, minis } = shelvesSplit(N);

	// The unit itself: ink, untouched by the sweep.
	const fpts = sampleSegs(SHELF_SEGS, frame, rand);
	for (let i = 0; i < frame; i++) {
		const o = i * 4;
		targets[o] = shelfX(fpts[i * 2]);
		targets[o + 1] = shelfY(fpts[i * 2 + 1]);
		targets[o + 3] = 1;
	}

	// Minis: base, body, head. Primer grey before the sweep, the block's paint scheme after.
	const nBase = Math.max(1, Math.round(per * 0.22));
	const nHead = Math.max(1, Math.round(per * 0.26));
	const nBody = Math.max(1, per - nBase - nHead);
	const [bx0, by0, bx1, by1] = MINI.body;
	const bCols = Math.max(1, Math.round(Math.sqrt((nBody * (bx1 - bx0)) / (by1 - by0))));
	const bRows = Math.ceil(nBody / bCols);
	for (let m = 0; m < MINI_COUNT; m++) {
		const [ox, oy] = miniOrigin(m);
		const colors = miniColors(Math.floor(m / MINIS_PER_BLOCK));
		for (let j = 0; j < per; j++) {
			const i = frame + m * per + j;
			let x: number;
			let y: number;
			let rgb: number[];
			if (j < nBase) {
				const [x0, y0, x1] = MINI.base;
				x = x0 + ((x1 - x0) * (j + 0.5)) / nBase;
				y = y0 + (rand() - 0.5) * 0.4;
				rgb = colors.base;
			} else if (j < nBase + nBody) {
				const k = j - nBase;
				const c = k % bCols;
				const r = Math.floor(k / bCols);
				x = bx0 + ((bx1 - bx0) * (c + 0.5 + (rand() - 0.5) * 0.3)) / bCols;
				y = by0 + ((by1 - by0) * (r + 0.5 + (rand() - 0.5) * 0.3)) / bRows;
				rgb = colors.body;
			} else {
				const k = j - nBase - nBody;
				const rr = MINI.head.r * Math.sqrt((k + 0.5) / nHead);
				const a = k * 2.399963 + m;
				x = MINI.head.x + Math.cos(a) * rr;
				y = MINI.head.y + Math.sin(a) * rr;
				rgb = colors.head;
			}
			const o = i * 4;
			targets[o] = shelfX(ox + x);
			targets[o + 1] = shelfY(oy + y);
			targets[o + 3] = 1;
			setRGBA(paint, i, PRIMER, 255);
			setRGBA(paintAlt, i, rgb, 255);
		}
	}

	// The shop's customers: a loose band around the unit (never on it), lightly held, dimmed so
	// the stock stays the subject.
	for (let i = frame + minis; i < N; i++) {
		const a = rand() * Math.PI * 2;
		const r = 1.03 + rand() * 0.08;
		const o = i * 4;
		targets[o] = Math.cos(a) * r;
		targets[o + 1] = Math.sin(a) * r * 0.97;
		targets[o + 3] = 0.25;
		setRGBA(paint, i, GRAPHITE, 170);
		setRGBA(paintAlt, i, GRAPHITE, 170);
	}

	shelves = { N, paint, paintAlt, start: frame, per };
	return { targets, paint, paintAlt };
}

export const LUDO_SHELVES: FormationSource = { kind: 'points', build: buildShelves };

/**
 * Paint arrays (builder slot order, for Crowd.setPaint) with mini `m` pulled as the rare: signal
 * on both sides of the sweep. `m < 0` restores the plain stock. Null until the shelves are baked
 * for this N.
 */
export function rarePaint(
	N: number,
	m: number
): { paint: Uint8Array; paintAlt: Uint8Array } | null {
	if (!shelves || shelves.N !== N) return null;
	const paint = shelves.paint.slice();
	const paintAlt = shelves.paintAlt.slice();
	if (m >= 0 && m < MINI_COUNT) {
		for (let j = 0; j < shelves.per; j++) {
			const i = shelves.start + m * shelves.per + j;
			setRGBA(paint, i, RARE, 255);
			setRGBA(paintAlt, i, RARE, 255);
		}
	}
	return { paint, paintAlt };
}

/** Centre of a block in region-normalised coordinates (y up). */
export function blockCenterN(b: number): Pt {
	const k = BLOCKS[b];
	return [shelfX(k.x + k.w / 2), shelfY(k.y + k.h / 2)];
}

/** Centre of a mini in region-normalised coordinates (y up). */
export function miniCenterN(m: number): Pt {
	const [x, y] = miniOrigin(m);
	return [shelfX(x + 5), shelfY(y + 7)];
}

/** Top of a mini's head in region-normalised coordinates (y up). */
export function miniTopN(m: number): Pt {
	const [x, y] = miniOrigin(m);
	return [shelfX(x + MINI.head.x), shelfY(y + MINI.head.y - MINI.head.r - 1)];
}

// ── 03 · ludo-d20 ─────────────────────────────────────────────────────────────────────────────

/** Circumradius of the die in its (square) region: leaves room to tumble. */
export const D20_RADIUS = 0.8;

export function d20Split(N: number): { edges: number; knots: number; spare: number } {
	const edges = Math.floor(N * 0.72);
	const knots = Math.floor(N * 0.08);
	return { edges, knots, spare: N - edges - knots };
}

function buildD20({ N, rand }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const { edges, knots } = d20Split(N);
	const S = D20_RADIUS;
	let i = 0;
	const put = (x: number, y: number, z: number, w: number) => {
		const o = i * 4;
		targets[o] = x;
		targets[o + 1] = y;
		targets[o + 2] = z;
		targets[o + 3] = w;
		i++;
	};

	// The 30 edges, evenly filled, a hair of jitter so a line reads as ink, not as a laser.
	const base = Math.floor(edges / EDGES.length);
	let rest = edges - base * EDGES.length;
	for (const [a, b] of EDGES) {
		const n = base + (rest-- > 0 ? 1 : 0);
		const A = VERTS[a];
		const B = VERTS[b];
		for (let j = 0; j < n; j++) {
			const t = (j + 0.5 + (rand() - 0.5) * 0.5) / n;
			put(
				(A[0] + (B[0] - A[0]) * t + (rand() - 0.5) * 0.012) * S,
				(A[1] + (B[1] - A[1]) * t + (rand() - 0.5) * 0.012) * S,
				(A[2] + (B[2] - A[2]) * t) * S,
				1
			);
		}
	}

	// Knots at the 12 vertices.
	const kb = Math.floor(knots / VERTS.length);
	let krest = knots - kb * VERTS.length;
	for (const V of VERTS) {
		const n = kb + (krest-- > 0 ? 1 : 0);
		for (let j = 0; j < n; j++) {
			const r = 0.028 * Math.sqrt((j + 0.5) / n);
			const a = j * 2.399963;
			put((V[0] + Math.cos(a) * r) * S, (V[1] + Math.sin(a) * r) * S, V[2] * S, 1);
		}
	}

	// Dust: free roamers on a spherical shell around the die. A sphere maps onto itself under any
	// rotation, so the tumble never sweeps the dust across the stage.
	while (i < N) {
		let x: number;
		let y: number;
		let s: number;
		do {
			x = rand() * 2 - 1;
			y = rand() * 2 - 1;
			s = x * x + y * y;
		} while (s >= 1 || s < 1e-6);
		const k = 2 * Math.sqrt(1 - s);
		const r = 0.98 + rand() * 0.1;
		put(x * k * r, y * k * r, (1 - 2 * s) * r, 0);
	}
	return { targets };
}

export const LUDO_D20: FormationSource = { kind: 'points', build: buildD20 };

/** Short aliases. */
export { LUDO_CITY as CITY, LUDO_SHELVES as SHELVES, LUDO_D20 as D20 };
