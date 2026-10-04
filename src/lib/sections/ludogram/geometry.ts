// Shape data for the three Ludogram formations, in design space (y down), shared by the crowd
// builders (formations.ts) and the static no-WebGL line drawings, so both draw the same picture.
// Pure data and math: no DOM, no three.

export type Pt = [number, number];
/** x1, y1, x2, y2 */
export type Seg = [number, number, number, number];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const len = (s: Seg) => Math.hypot(s[2] - s[0], s[3] - s[1]);

function poly(pts: Pt[], out: Seg[], closed = false) {
	for (let i = 0; i < pts.length - 1; i++)
		out.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
	if (closed && pts.length > 2) {
		const a = pts[pts.length - 1];
		out.push([a[0], a[1], pts[0][0], pts[0][1]]);
	}
}

function rect(x0: number, y0: number, x1: number, y1: number, out: Seg[]) {
	poly(
		[
			[x0, y0],
			[x1, y0],
			[x1, y1],
			[x0, y1]
		],
		out,
		true
	);
}

/** Hatching parallel to AB, spaced `gap` along AC (engineering-drawing roofs). */
function hatch(A: Pt, B: Pt, C: Pt, gap: number, out: Seg[]) {
	const n = Math.max(1, Math.floor(Math.hypot(C[0] - A[0], C[1] - A[1]) / gap));
	for (let i = 1; i < n; i++) {
		const t = i / n;
		const P = lerp(A, C, t);
		const Q = lerp(B, C, t);
		out.push([P[0], P[1], Q[0], Q[1]]);
	}
}

/** Gabled roof: outline + hatch. */
function roof(x0: number, x1: number, y: number, apex: number, out: Seg[]) {
	const A: Pt = [x0, y];
	const B: Pt = [(x0 + x1) / 2, apex];
	const C: Pt = [x1, y];
	poly([A, B, C], out);
	hatch(A, B, C, 9, out);
}

// ── 01 · the walking city (Monsters are Coming! Rock & Road) ────────────────────────────────

/** Design box of the city slot: everything (city, horde, ground) lives in 1000 × 700. */
export const CITY_VIEW: Pt = [1000, 700];
export const GROUND_Y = 640;
/**
 * The city is drawn at x 436–905 and shifted left by this much, so the scroll walk (15% of the
 * box to the right) ends inside the box.
 */
const CITY_DX = -60;
/** Where the horde stops: its front, x in design px (the peon stands 60px ahead of it). */
export const HORDE_FRONT = 330;
/** The dispensable peon stands on the rear plank, facing the horde. */
export const PEON: Pt = [450 + CITY_DX, 444];

/** Line art of the city on stilts: deck truss, three walking leg pairs, houses, a tower, a flag. */
export const CITY_SEGS: Seg[] = (() => {
	const raw = drawCity();
	return raw.map(([a, b, c, d]): Seg => [a + CITY_DX, b, c + CITY_DX, d]);
})();

function drawCity(): Seg[] {
	const s: Seg[] = [];
	// Deck: two chords + a Warren truss, end posts, and the rear plank the peon stands on.
	const x0 = 470;
	const x1 = 905;
	s.push([x0, 452, x1, 452], [x0, 470, x1, 470], [x0, 452, x0, 470], [x1, 452, x1, 470]);
	const bays = 15;
	for (let i = 0; i < bays; i++) {
		const a = x0 + ((x1 - x0) * i) / bays;
		const b = x0 + ((x1 - x0) * (i + 1)) / bays;
		s.push(i % 2 ? [a, 452, b, 470] : [a, 470, b, 452]);
	}
	s.push([436, 452, x0, 452], [446, 452, x0, 466]);
	// Legs: three pairs mid-stride (one leg forward, one back), doubled into stilts, with feet
	// and a knee brace per pair.
	const pairs: [number, number][] = [
		[520, 556],
		[660, 696],
		[800, 836]
	];
	for (const [a, b] of pairs) {
		const fa = a - 20;
		const fb = b + 22;
		s.push([a - 3, 470, fa - 3, GROUND_Y], [a + 3, 470, fa + 3, GROUND_Y]);
		s.push([b - 3, 470, fb - 3, GROUND_Y], [b + 3, 470, fb + 3, GROUND_Y]);
		s.push([fa - 13, GROUND_Y, fa + 11, GROUND_Y], [fb - 11, GROUND_Y, fb + 13, GROUND_Y]);
		const k = (560 - 470) / (GROUND_Y - 470);
		s.push([a + (fa - a) * k, 560, b + (fb - b) * k, 560]);
	}
	// House 1 (rear).
	poly(
		[
			[486, 452],
			[486, 380],
			[566, 380],
			[566, 452]
		],
		s
	);
	roof(479, 573, 380, 330, s);
	poly(
		[
			[516, 452],
			[516, 428],
			[532, 428],
			[532, 452]
		],
		s
	);
	rect(496, 394, 508, 406, s);
	// Watchtower with a flag.
	poly(
		[
			[592, 452],
			[592, 276],
			[636, 276],
			[636, 452]
		],
		s
	);
	roof(585, 643, 276, 214, s);
	s.push([614, 214, 614, 166]);
	poly(
		[
			[614, 166],
			[648, 177],
			[614, 188]
		],
		s
	);
	rect(606, 300, 622, 316, s);
	rect(606, 342, 622, 358, s);
	rect(606, 384, 622, 400, s);
	// House 2 (the big one), chimney.
	poly(
		[
			[658, 452],
			[658, 356],
			[770, 356],
			[770, 452]
		],
		s
	);
	roof(650, 778, 356, 298, s);
	poly(
		[
			[744, 320],
			[744, 296],
			[756, 296],
			[756, 331]
		],
		s
	);
	rect(674, 380, 690, 396, s);
	rect(738, 380, 754, 396, s);
	poly(
		[
			[706, 452],
			[706, 420],
			[722, 420],
			[722, 452]
		],
		s
	);
	// House 3 (front).
	poly(
		[
			[790, 452],
			[790, 388],
			[890, 388],
			[890, 452]
		],
		s
	);
	roof(782, 898, 388, 342, s);
	rect(806, 404, 820, 418, s);
	rect(858, 404, 872, 418, s);
	return s;
}

/** Total ink length of the city, design px. */
export const CITY_INK = CITY_SEGS.reduce((a, s) => a + len(s), 0);

/**
 * `count` points evenly spread along the line art (design px), with a little jitter along each
 * line so the pitch never beats into moiré.
 */
export function sampleSegs(segs: Seg[], count: number, rand: () => number): Float32Array {
	const out = new Float32Array(count * 2);
	const total = segs.reduce((a, s) => a + len(s), 0) || 1;
	const pitch = total / Math.max(1, count);
	let k = 0;
	let carry = rand() * pitch;
	for (const s of segs) {
		const L = len(s);
		while (carry < L && k < count) {
			const t = Math.min(1, Math.max(0, (carry + (rand() - 0.5) * pitch * 0.35) / L));
			out[k * 2] = s[0] + (s[2] - s[0]) * t;
			out[k * 2 + 1] = s[1] + (s[3] - s[1]) * t;
			k++;
			carry += pitch;
		}
		carry -= L;
	}
	// Rounding leftovers land on random lines.
	while (k < count) {
		const s = segs[(rand() * segs.length) | 0];
		const t = rand();
		out[k * 2] = s[0] + (s[2] - s[0]) * t;
		out[k * 2 + 1] = s[1] + (s[3] - s[1]) * t;
		k++;
	}
	return out;
}

/** Where the horde starts (its tail), x in design px. */
export const HORDE_TAIL = 16;

/**
 * Height of the horde wave at x (design px): it piles up toward the city and crests at the
 * height of the deck, about to climb, never over the peon's plank.
 */
export function hordeHeight(x: number): number {
	const k = Math.min(1, Math.max(0, (x - HORDE_TAIL) / (HORDE_FRONT - HORDE_TAIL)));
	const crest = 1 + 0.09 * Math.sin(x * 0.045) + 0.06 * Math.sin(x * 0.11 + 1.3);
	return (46 + 112 * Math.pow(k, 1.25)) * crest;
}

/** One horde member (design px): denser toward the front and the ground. */
export function hordePoint(rand: () => number, out: Pt): Pt {
	const u = rand();
	const x = HORDE_TAIL + (HORDE_FRONT - HORDE_TAIL) * (1 - Math.pow(1 - u, 1.7));
	const y = GROUND_Y - hordeHeight(x) * Math.pow(rand(), 0.8) - 4;
	out[0] = x + (rand() - 0.5) * 6;
	out[1] = y;
	return out;
}

/** Outline of the horde wave (for the static drawing). */
export function hordeOutline(): Pt[] {
	const pts: Pt[] = [[HORDE_TAIL, GROUND_Y]];
	for (let x = HORDE_TAIL; x <= HORDE_FRONT; x += 8) pts.push([x, GROUND_Y - hordeHeight(x)]);
	pts.push([HORDE_FRONT, GROUND_Y]);
	return pts;
}

// ── 02 · the shelves (Tabletop Game Shop Simulator) ──────────────────────────────────────────

/** Design box of the shelving unit. */
export const SHELF_VIEW: Pt = [340, 340];
export const SHELF_ROWS = 3;
export const SHELF_BLOCKS = 6;
/** Minis per block: 4 columns × 6 rows (a blister display). */
export const BLOCK_COLS = 4;
export const BLOCK_ROWS = 6;
const CELL_W = 10;
const CELL_H = 14;
const BLOCK_W = BLOCK_COLS * CELL_W;
const BLOCK_H = BLOCK_ROWS * CELL_H;
const ROW_PITCH = 108;

export interface Block {
	/** Block index (row-major). */
	index: number;
	row: number;
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Shelf board heights (design px). */
export const SHELF_BOARDS = [
	6,
	...Array.from({ length: SHELF_ROWS }, (_, r) => 8 + ROW_PITCH * (r + 1) - 2)
];

export const BLOCKS: Block[] = (() => {
	const gap = (SHELF_VIEW[0] - 28 - SHELF_BLOCKS * BLOCK_W) / (SHELF_BLOCKS - 1);
	const out: Block[] = [];
	for (let r = 0; r < SHELF_ROWS; r++) {
		const board = SHELF_BOARDS[r + 1];
		const y = board - 2 - 4 - BLOCK_H;
		for (let j = 0; j < SHELF_BLOCKS; j++) {
			out.push({
				index: out.length,
				row: r,
				x: 14 + j * (BLOCK_W + gap),
				y,
				w: BLOCK_W,
				h: BLOCK_H
			});
		}
	}
	return out;
})();

export const MINIS_PER_BLOCK = BLOCK_COLS * BLOCK_ROWS;
export const MINI_COUNT = BLOCKS.length * MINIS_PER_BLOCK;

/** Top-left of mini `m` (block-major, then row-major inside the block), design px. */
export function miniOrigin(m: number): Pt {
	const b = BLOCKS[Math.floor(m / MINIS_PER_BLOCK)];
	const k = m % MINIS_PER_BLOCK;
	return [b.x + (k % BLOCK_COLS) * CELL_W, b.y + Math.floor(k / BLOCK_COLS) * CELL_H];
}

/** Mini anatomy inside its 10 × 14 cell: a round base, a body, a head. */
export const MINI = {
	base: [1.5, 13, 8.5, 13] as Seg,
	body: [3, 6.6, 7, 12.2] as [number, number, number, number],
	head: { x: 5, y: 4.2, r: 1.9 }
};

/** Frame of the unit: two doubled posts and four doubled boards. */
export const SHELF_SEGS: Seg[] = (() => {
	const [W, H] = SHELF_VIEW;
	const s: Seg[] = [];
	for (const x of [4, 8, W - 8, W - 4]) s.push([x, 2, x, H - 2]);
	for (const y of SHELF_BOARDS) s.push([4, y - 2, W - 4, y - 2], [4, y + 2, W - 4, y + 2]);
	return s;
})();

/** Centre of mini `m` (design px). */
export function miniCenter(m: number): Pt {
	const [x, y] = miniOrigin(m);
	return [x + CELL_W / 2, y + CELL_H / 2];
}

/** The paint palette (§5 03 slot 2), applied per block past the scanline. */
export const PALETTE: [number, number, number][] = [
	[0xb7, 0x33, 0x2c],
	[0x22, 0x40, 0x6b],
	[0xd9, 0xa4, 0x41],
	[0x2f, 0x5d, 0x46],
	[0xec, 0xe9, 0xe1]
];
export const PRIMER: [number, number, number] = [0x7a, 0x7a, 0x7c];
/** The rare pull, in the viewport theme's signal. */
export const RARE: [number, number, number] = [0xff, 0x5a, 0x2e];

/** Body / head / base colours of a mini in block `b`. */
export function miniColors(b: number): { body: number[]; head: number[]; base: number[] } {
	const body = PALETTE[b % PALETTE.length];
	const head = body === PALETTE[4] ? PALETTE[2] : PALETTE[4];
	const base = body === PALETTE[3] ? PALETTE[1] : PALETTE[3];
	return { body, head, base };
}

/** The mini revealed by the first pack (the middle shelf, a front rank). */
export const DEFAULT_RARE = (() => {
	const block = SHELF_BLOCKS + 3;
	return block * MINIS_PER_BLOCK + 2 * BLOCK_COLS + 1;
})();

// ── SVG helpers for the static drawings ───────────────────────────────────────────────────────

export function segsPath(segs: Seg[], k = 1): string {
	let d = '';
	for (const s of segs)
		d += `M${(s[0] * k).toFixed(1)} ${(s[1] * k).toFixed(1)}L${(s[2] * k).toFixed(1)} ${(s[3] * k).toFixed(1)}`;
	return d;
}

export function polyPath(pts: Pt[]): string {
	return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + 'Z';
}
