// S-tail formations (§5 06–08): 'contracts-rules', 'patch-spine', 'contact-ring', 'footer-name'.
// No three import: these are plain sources the engine bakes. Ids are owned by S-tail (§9.0).
import type { BakeCtx, BakeResult, FormationSource } from '#lib/gl/types';

export const RULES_ID = 'contracts-rules';
export const SPINE_ID = 'patch-spine';
export const RING_ID = 'contact-ring';
export const NAME_ID = 'footer-name';
/** Engine-internal spawner disc (the preloader's sunflower), used by the RESPAWN scrub. */
export const SPAWN_ID = 'spawn';

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── 06 · contracts-rules ──────────────────────────────────────────────────────────────────────
// The table rules are entities. The builder reads the live table from the region element:
// every `[data-ledger]` table contributes one rule under each `[data-ledger-row]` (the header row
// included), heavier under the header and at the bottom. Band thickness scales with the tier so
// the dots keep a ~3px pitch: 16k entities draw halftone bands, 4k draw single dotted rows.

/** Target distance between neighbouring dots along a row of a band, px. */
const RULE_PITCH = 2.9;
/** Never pack tighter than this; beyond it the bands thicken (up to RULE_MAX_SCALE). */
const RULE_MIN_PITCH = 2.15;
const RULE_MAX_SCALE = 1.25;
/** Vertical distance between the rows of one band, px. */
const RULE_ROW_GAP = 2.7;

interface RuleLine {
	x0: number;
	x1: number;
	y: number;
	/** Rows at full density (16k). */
	base: number;
}

function measureRules(el: HTMLElement, w: number, h: number): RuleLine[] {
	const box = el.getBoundingClientRect();
	// Measured now vs. the engine's cached region size (they agree unless a resize is pending).
	const kx = w / Math.max(1, box.width);
	const ky = h / Math.max(1, box.height);
	const lines: RuleLine[] = [];
	for (const table of el.querySelectorAll<HTMLElement>('[data-ledger]')) {
		const rows = [...table.querySelectorAll<HTMLElement>('[data-ledger-row]')];
		const tb = table.getBoundingClientRect();
		if (!rows.length || tb.width < 8) continue;
		const major = table.dataset.ledger === 'major';
		const x0 = (tb.left - box.left) * kx;
		const x1 = (tb.right - box.left) * kx;
		rows.forEach((row, i) => {
			const r = row.getBoundingClientRect();
			if (r.height <= 0) return;
			const edge = i === 0 || i === rows.length - 1;
			lines.push({
				x0,
				x1,
				y: (r.bottom - box.top) * ky,
				base: major ? (edge ? 5 : 3) : edge ? 3 : 2
			});
		});
	}
	return lines;
}

function buildRules({ N, w, h, rand, el }: BakeCtx): BakeResult {
	const targets = new Float32Array(N * 4);
	const lines = measureRules(el, w, h);
	let k = 0;
	const put = (x: number, y: number, weight: number) => {
		const o = k++ * 4;
		targets[o] = (x / Math.max(1, w)) * 2 - 1;
		targets[o + 1] = 1 - (y / Math.max(1, h)) * 2;
		targets[o + 2] = 0;
		targets[o + 3] = weight;
	};

	if (lines.length) {
		const span = (s: number) =>
			lines.reduce((a, l) => a + (l.x1 - l.x0) * Math.max(1, Math.round(l.base * s)), 0);
		// Thin the bands on lower tiers instead of spreading the dots apart; on narrow tables at
		// the top tier, thicken them a little instead of packing the dots into a solid line.
		let s = (N * RULE_PITCH) / Math.max(1, span(1));
		if (s > 1) s = Math.min(RULE_MAX_SCALE, Math.max(1, (N * RULE_MIN_PITCH) / span(1)));
		const total = span(s);
		const used = Math.min(N, Math.floor(total / RULE_MIN_PITCH));
		const pitch = total / used;
		// Per-row counts (largest remainder), so exactly `used` dots land on the rules.
		const rows: { l: RuleLine; r: number; R: number; n: number; rem: number }[] = [];
		for (const l of lines) {
			const R = Math.max(1, Math.round(l.base * s));
			for (let r = 0; r < R; r++) {
				const exact = (l.x1 - l.x0) / pitch;
				rows.push({ l, r, R, n: Math.floor(exact), rem: exact - Math.floor(exact) });
			}
		}
		let left = used - rows.reduce((a, row) => a + row.n, 0);
		const order = [...rows].sort((a, b) => b.rem - a.rem);
		for (let i = 0; left > 0 && order.length; i = (i + 1) % order.length, left--) order[i].n++;

		for (const { l, r, R, n } of rows) {
			const len = l.x1 - l.x0;
			const d = len / Math.max(1, n);
			const y = l.y + (r - (R - 1) / 2) * RULE_ROW_GAP;
			// Brick offset between rows + a little jitter: a halftone band, not a moiré grid.
			const shift = r % 2 ? 0.75 : 0.25;
			for (let i = 0; i < n && k < N; i++) {
				put(l.x0 + (i + shift + (rand() - 0.5) * 0.3) * d, y + (rand() - 0.5) * 0.5, 1);
			}
		}

		// Anything left (very narrow tables at the top tier): small beads just past the rule
		// ends, where a hover recruits them into the bracket legs.
		for (let j = 0; k < N; j++) {
			const l = lines[j % lines.length];
			const end = (j >> 1) % 2 === 0;
			const a = rand() * Math.PI * 2;
			const rr = Math.sqrt(rand()) * 5;
			put((end ? l.x1 + 9 : l.x0 - 9) + Math.cos(a) * rr, l.y + Math.sin(a) * rr, 1);
		}
	}

	// No table measured (e.g. hidden): park everyone loosely in the region.
	while (k < N) put(rand() * w, rand() * h, 0);
	return { targets };
}

export const CONTRACTS_RULES: FormationSource = { kind: 'points', build: buildRules };

/** A new source object with the same builder: forces a re-bake (e.g. after a language switch). */
export function contractsRules(): FormationSource {
	return { kind: 'points', build: (ctx) => buildRules(ctx) };
}

// ── 07 · patch-spine ──────────────────────────────────────────────────────────────────────────
// A conveyor of parallel lanes flowing down the spine (open paths: entities pop in at the top and
// shrink out at the bottom), plus nested diamond loops at every version waypoint, where entities
// circulate and the belt reads as a cluster. Geometry is measured from the DOM by the section and
// rebuilt when it changes (the source is compared by value, so an unchanged layout never re-bakes).

export interface SpineGeometry {
	/** Region size, px (the viewBox maps 1:1 onto the region). */
	width: number;
	height: number;
	/** Waypoint centres, px from the region top. */
	waypoints: number[];
	/** Parallel lanes in the belt. */
	lanes: number;
}

const SPINE_LANE_GAP = 3.4;
/** Half-diagonals of the nested diamond loops at each waypoint, px. */
const DIAMOND_SIZES = [5, 10, 15, 20, 25, 30];
/** Most of the crowd rides the belt: the few roamers left keep the changelog copy clear. */
const SPINE_SHARE = 0.95;

export function spineSource(g: SpineGeometry): FormationSource {
	const W = Math.max(8, g.width);
	const H = Math.max(8, g.height);
	const cx = W / 2;
	const paths: string[] = [];
	for (let i = 0; i < g.lanes; i++) {
		const x = r2(cx + (i - (g.lanes - 1) / 2) * SPINE_LANE_GAP);
		paths.push(`M${x} 0V${r2(H)}`);
	}
	for (const y of g.waypoints) {
		for (const s of DIAMOND_SIZES) {
			paths.push(
				`M${r2(cx)} ${r2(y - s)}L${r2(cx + s)} ${r2(y)}L${r2(cx)} ${r2(y + s)}L${r2(cx - s)} ${r2(y)}Z`
			);
		}
	}
	return { kind: 'paths', viewBox: [r2(W), r2(H)], paths, speed: 0.05, share: SPINE_SHARE };
}

/** Lanes for a belt of height `h` px: enough to keep a ~3px dot pitch at this tier's N. */
export function spineLanes(N: number, h: number, waypoints: number): number {
	const loops = waypoints * DIAMOND_SIZES.reduce((a, s) => a + 4 * Math.SQRT2 * s, 0);
	const onBelt = Math.max(0, N * SPINE_SHARE - loops / 3);
	return Math.max(2, Math.min(5, Math.round((onBelt * 3.2) / Math.max(1, h))));
}

/**
 * Paint for 'patch-spine' (builder slot order) that lights the current version's diamond in the
 * signal colour. Mirrors the paths baker's allocation: `round(share × N)` slots spread over the
 * paths in order, proportionally to their length (lanes first, then 6 loops per waypoint).
 */
export function spinePaint(N: number, g: SpineGeometry, current: number): Uint8Array {
	const paint = new Uint8Array(N * 4);
	const lens = [
		...Array.from({ length: g.lanes }, () => Math.max(1e-3, r2(Math.max(8, g.height)))),
		...g.waypoints.flatMap(() => DIAMOND_SIZES.map((s) => 4 * Math.SQRT2 * s))
	];
	const total = lens.reduce((a, b) => a + b, 0);
	const used = Math.round(SPINE_SHARE * N);
	let k = 0;
	for (let r = 0; r < lens.length && k < used; r++) {
		const n = r === lens.length - 1 ? used - k : Math.round((used * lens[r]) / total);
		const lit = r >= g.lanes && Math.floor((r - g.lanes) / DIAMOND_SIZES.length) === current;
		for (let j = 0; j < n && k < used; j++, k++) {
			if (!lit) continue;
			paint.set(SIGNAL_RGBA, k * 4);
		}
	}
	return paint;
}

/** --signal (#FF4A1C): graphics only, the one colour. */
const SIGNAL_RGBA = [0xff, 0x4a, 0x1c, 0xff];

// ── 08 · contact-ring ─────────────────────────────────────────────────────────────────────────
// Concentric stadium loops around the lobby; entities circulate clockwise like a queue that
// never quite gets in. The viewBox is the lobby box in px; the loops sit `offset` px outside it.

export interface RingGeometry {
	width: number;
	height: number;
	/** Distance from the lobby box to the innermost loop, px. */
	offset: number;
	lanes: number;
	gap: number;
}

export function ringSource(g: RingGeometry): FormationSource {
	const W = Math.max(8, g.width);
	const H = Math.max(8, g.height);
	const paths: string[] = [];
	for (let i = 0; i < g.lanes; i++) {
		const o = g.offset + i * g.gap;
		const r = H / 2 + o;
		const cy = H / 2;
		// End-cap centres; a lobby taller than wide degenerates into a circle.
		const xa = Math.min(W / 2, H / 2);
		const xb = Math.max(W / 2, W - H / 2);
		paths.push(
			`M${r2(xa)} ${r2(cy - r)}H${r2(xb)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(xb)} ${r2(cy + r)}H${r2(xa)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(xa)} ${r2(cy - r)}Z`
		);
	}
	return { kind: 'paths', viewBox: [r2(W), r2(H)], paths, speed: 0.016, share: 0.72 };
}

/** Lanes for the ring at this tier: a ~3.4px pitch along each loop. */
export function ringLanes(N: number, w: number, h: number, mobile: boolean): number {
	const loop = 2 * Math.max(0, w - h) + Math.PI * (h + 80);
	return Math.max(2, Math.min(mobile ? 5 : 8, Math.round((N * 0.72 * 3.4) / Math.max(1, loop))));
}

// ── 08 · footer-name ──────────────────────────────────────────────────────────────────────────
// The horde comes home: the baked HYVERNO (wdth 125) glyphs, fitted to the footer region. On
// phones the wide cut would be ~37px tall at 92vw, so the footer uses the tall cut (wdth 62),
// exactly like the hero does there ('hero-tall'), and the region takes that aspect.
export const FOOTER_NAME: FormationSource = { kind: 'glyphs', key: 'HYVERNO_W125' };
export const FOOTER_NAME_TALL: FormationSource = { kind: 'glyphs', key: 'HYVERNO_W62' };
